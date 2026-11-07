import { guardarEventos } from "./events.js";
import { guardarRuta, obtenerRutaGuardada, cargarParadasEnComponente } from "./routes.js";
import { borrarPropios } from "./delete.js";
import { eventos_url, trails_url, event_id, ruta_prefix } from "./const.js";
import { estado, setRutaActual } from "./state.js";

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

const tipos = {
  //0: { nombre: "Festival de arte", color: "#e07b39" },  1: { nombre: "Feria de productores", color: "#4caf50" },  2: { nombre: "Noche de cine", color: "#7e57c2" },  3: { nombre: "Feria", color: "#e91e63" },  4: { nombre: "Desfile", color: "#1e88e5" },
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

const routeLayer = new RouteLayer({});

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
viewElement.map.add(routeLayer);
viewElement.map.add(trailsLayer)
viewElement.map.add(eventosLayer)

const capaHover = new GraphicsLayer();
const capaActiva = new GraphicsLayer();
// Se agregan DESPUÉS de trailsLayer y eventosLayer, para que queden arriba
viewElement.map.addMany([capaHover, capaActiva]);

function dibujarRuta(capa, linea, color, grosor) {
  capa.removeAll();                       // borra lo que hubiera antes
  capa.add(new Graphic({
    geometry: linea,
    symbol: { type: "simple-line", color, width: grosor },
  }));
}

// Este es el codigo que debe ejecutarse cuando le damos al boton de iniciar simulacion
// Esto quiere decir, guardar las paradas, guardar la ruta, comenzar la simulación, y deshabilitar el resto de la interfaz
// Además de comenzar con la operacion de la población y tener en cuenta la velocidad y el radio de amplitud
document.querySelector("#btn-iniciar").addEventListener("click", async () => {
  document.querySelector("#btn-iniciar").disabled = true;
  document.querySelector("#btn-rutas").disabled = true;
  document.querySelector("#btn-todo").disabled = true;
  
  let idsEventos = [];
  try {
    idsEventos = await guardarEventos(routeLayer, eventosLayer);
    await guardarRuta(idsEventos, routeLayer, trailsLayer);
    eventosLayer.refresh();
    estado.modo = "simulacion";
    // TODO: comenzar la simulación
  } catch (error) {
    // Si los eventos ya se guardaron y la ruta no, quedan "huérfanos": se deshace
    if (idsEventos.length > 0) {
      await eventosLayer.applyEdits({
        deleteFeatures: idsEventos.map((objectId) => ({ objectId })),
      });
    }
    console.error(error);
    // TODO: avisar al usuario
  } finally {
    document.querySelector("#btn-iniciar").disabled = false;
    document.querySelector("#btn-rutas").disabled = false;
    document.querySelector("#btn-todo").disabled = false;
    estado.modo = "edicion";
  }
});

//Botón que elimina las stops guardadas
document.querySelector("#btn-todo").addEventListener("click", async () => {
  if (!confirm("¿Borrar toda la información guardada?")) return;
    try {
      var n = await borrarPropios(trailsLayer, `notes LIKE '${ruta_prefix}%'`);
      console.log(`Rutas borradas: ${n}`);

      n = await borrarPropios(eventosLayer, `eventid = ${event_id}`);
      eventosLayer.refresh();
      console.log(`Eventos borrados: ${n}`);
    } catch (error) {
      console.error(error);
    }
});

//Botón que elimina las rutas guardadas
document.querySelector("#btn-rutas").addEventListener("click", async () => {
    if (!confirm("¿Borrar todas tus rutas guardadas?")) return;
    try {
      const n = await borrarPropios(trailsLayer, `notes LIKE '${ruta_prefix}%'`);
      console.log(`Rutas borradas: ${n}`);
    } catch (error) {
      console.error(error);
    }
});

//Al clickear una ruta mostrada permite cargarla en el 'simulador'
viewElement.addEventListener("arcgisViewClick", async (event) => {
  if (estado.modo !== "edicion") return;

  const { results } = await viewElement.view.hitTest(event.detail, {
    include: [trailsLayer],
  });
  console.log("2. impactos:", results.length, results);

  const grafico = results[0]?.graphic;
  if (!grafico) {
    //NTH: si le das click en cualquier lugar del mapa, quita las paradas del componente y saca la ruta
    //await cargarRutaEnEditor({ _, eventosLayer, routeLayer, directionsElement }); ESTO NO LO LOGRA
    return;
  }
  console.log("3. gráfico:", grafico.attributes);

  const id = results[0].graphic.attributes.objectid;
  estado.cargando = true;

  try {
    const ruta = await obtenerRutaGuardada(id, { trailsLayer, eventosLayer });

    cargarParadasEnComponente(ruta.paradas, routeLayer);
    dibujarRuta(capaActiva, ruta.geometry, "#ff6d00", 6);
    setRutaActual(ruta);

  } catch (error) {
    console.error(error);
  } finally {
    estado.cargando = false
  }
});