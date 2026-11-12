import { obtenerRutaGuardada, cargarParadasEnComponente, rutaDesdeComponente } from "./routes.js";
import { borrarPropios } from "./delete.js";
import { eventos_url, trails_url, event_id, ruta_prefix, campos, county_url, radio_km } from "./const.js";
import { estado, setRutaActual, setModo } from "./state.js";
import { ejecutarSimulacion } from "./simulate.js";
import { avisar, control, aplicarTipoSeleccionado, iniciarUI } from "./ui.js";
import { analizarPosicion, estadoEn, dibujarAnalisis} from "./analisis.js";
import { guardarComoNueva, mostrarRutaActiva } from "./actions.js";

const [RouteLayer, Basemap, TileLayer, FeatureLayer, GraphicsLayer, Graphic] = await $arcgis.import([
  "@arcgis/core/layers/RouteLayer.js",
  "@arcgis/core/Basemap.js",
  "@arcgis/core/layers/TileLayer.js",
  "@arcgis/core/layers/FeatureLayer.js",
  "@arcgis/core/layers/GraphicsLayer.js",
  "@arcgis/core/Graphic.js",
]);

const viewElement = document.querySelector("arcgis-map");
const directionsElement = document.querySelector("arcgis-directions");

const $ = (selector) => {
  const el = document.querySelector(selector);
  if (!el) console.warn(`Falta en el HTML el elemento ${selector}`);
  return el ?? document.createElement("div");   // un elemento vacío, para que nada se rompa
};

// Mapa base 
viewElement.basemap = new Basemap({
  baseLayers: [
    new TileLayer({
      url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer",
    }),
  ],
});

const eventosLayer = new FeatureLayer({
  url: eventos_url,
  definitionExpression: `eventid = ${event_id}`,
  outFields: ["*"],
  popupTemplate: { title: "{description}" },
});

const condadosLayer = new FeatureLayer({
  url: county_url,
});
condadosLayer.opacity = 0.2;

const tipos = {
  5: { nombre: "Otro", color: "#78909c" },
};

const simbolo = (color) => ({
  type: "simple-marker", style: "circle", size: 9, color,
  outline: { color: "white", width: 1 },
});

eventosLayer.renderer = {
  type: "unique-value",
  field: "event_type",
  defaultSymbol: simbolo("#78909c"),
  uniqueValueInfos: Object.entries(tipos).map(([valor, t]) => ({
    value: Number(valor), label: t.nombre, symbol: simbolo(t.color),
  })),
};

const routeLayer = new RouteLayer({  
    defaultSymbols: {
    directionLines: { type: "simple-line", color: [0, 0, 0, 0], width: 0 },
    directionPoints: null,
    routeInfo: null,
  },
});

const trailsLayer = new FeatureLayer({
  url: trails_url,
  definitionExpression: `notes LIKE '${ruta_prefix}|%'`,
  outFields: ["*"],
});

await viewElement.viewOnReady();
await directionsElement.componentOnReady();
await routeLayer.load();

// Capa de ruta propia, asociada al componente y agregada al mapa
directionsElement.layer = routeLayer;
viewElement.map.add(condadosLayer);
viewElement.map.add(routeLayer);
viewElement.map.add(trailsLayer);
viewElement.map.add(eventosLayer);

const capaHover = new GraphicsLayer();
const capaActiva = new GraphicsLayer();
const capaRecorrido = new GraphicsLayer();
const capaMovil = new GraphicsLayer();
const capaAnalisis = new GraphicsLayer();

// Se agregan DESPUÉS de trailsLayer y eventosLayer, para que queden arriba
viewElement.map.addMany([capaHover, capaActiva]);

// Se agregan capas de recorrido, movil y analisis
viewElement.map.add(capaAnalisis);
viewElement.map.addMany([capaMovil, capaRecorrido]);

const deps = { routeLayer, trailsLayer, eventosLayer, capaActiva };

iniciarUI(deps);

// Este es el codigo que debe ejecutarse cuando le damos al boton de iniciar simulacion
// Esto quiere decir, guardar las paradas, guardar la ruta, comenzar la simulación, y deshabilitar el resto de la interfaz
// Además de comenzar con la operacion de la población y tener en cuenta la velocidad y el radio de amplitud
document.querySelector("#btn-iniciar").addEventListener("click", async () => {
  try {
    // 1. Si la ruta es nueva, se guarda antes de simular
    if (estado.rutaActual?.origen === "calculada") {
      await guardarComoNueva(deps);
    }

    // 2. Recién ahora se pasa a modo simulación
    setModo("simulacion");

    // 3. Panel y control de "Detener"
    //const control = { detenido: false };

    document.querySelector("#btn-detener").onclick = () => (control.detenido = true);
    document.querySelector("#panel-sim").style.display = "block";

    // 4. Correr la simulación
    await ejecutarSimulacion({
      ruta: estado.rutaActual,
      capas: { recorrido: capaRecorrido, movil: capaMovil, analisis: capaAnalisis },
      analizar: (centro, radioKm) => analizarPosicion(centro, radioKm, { condadosLayer, campos }),
      estadoEn: (centro) => estadoEn(centro, condadosLayer, campos.estado),
      control,    // el importado de ui.js
      alCambiar: (d) => {
        $("#sim-progreso").textContent = `${Math.round(d.progreso * 100)} %`;
        $("#sim-barra").value = d.progreso;
        $("#sim-velocidad").textContent = d.velocidad.toFixed(0);
        $("#sim-estado").textContent = d.estado ?? "-";
        dibujarAnalisis(capaAnalisis, d.resultado);
        $("#sim-poblacion").textContent =
          d.resultado ? d.resultado.poblacionTotal.toLocaleString("es") : "sin datos";
      },
    });
  } catch (error) {
    console.error(error);
    avisar(error.message);
  } finally {
    // 5. Al terminar, al detener o si algo falla, se vuelve a edición
    document.querySelector("#panel-sim").style.display = "none";
    setModo("edicion");
  }
});

//Al clickear una ruta mostrada permite cargarla en el 'simulador'
viewElement.addEventListener("arcgisViewClick", async (event) => {
  if (estado.modo !== "edicion") return;

  const { results } = await viewElement.view.hitTest(event.detail, {
    include: [trailsLayer],
  });
  
  const grafico = results[0]?.graphic;
  if (!grafico) {
    //NTH: si le das click en cualquier lugar del mapa, quita las paradas del componente y saca la ruta
    //await cargarRutaEnEditor({ _, eventosLayer, routeLayer, directionsElement }); ESTO NO LO LOGRA
    
    return;
  }

  const id = results[0].graphic.attributes.objectid;
  estado.cargando = true;

  try {
    const ruta = await obtenerRutaGuardada(id, { trailsLayer, eventosLayer });

    cargarParadasEnComponente(ruta.paradas, routeLayer);
    mostrarRutaActiva(capaActiva, ruta)
    setRutaActual(ruta);

  } catch (error) {
    console.error(error);
  } finally {
    estado.cargando = false
  }
});

directionsElement.addEventListener("arcgisPropertyChange", (e) => {
  if (e.detail.name !== "lastRoute" || estado.cargando) return;

  const nueva = rutaDesdeComponente(routeLayer);
  if (!nueva) return;

  const previa = estado.rutaActual;
  // La ruta guardada de la que se partió (si la hay), para poder descartar cambios
  nueva.base = previa?.origen === "guardada" ? previa : previa?.base ?? null;

  mostrarRutaActiva(capaActiva, nueva);
  setRutaActual(nueva);
});