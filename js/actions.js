import { estado, setRutaActual } from "./state.js";
import { guardarEventos, borrarEventosPorIds } from "./events.js";
import { guardarRuta, obtenerRutaGuardada, cargarParadasEnComponente } from "./routes.js";

const [Graphic, Stop] = await $arcgis.import([
  "@arcgis/core/Graphic.js",  
  "@arcgis/core/rest/support/Stop.js",
]);

const COLOR_GUARDADA = "#ff6d00";
const COLOR_CALCULADA = "#00b0ff";

function mostrarRutaActiva(capaActiva, ruta) {
  capaActiva.removeAll();
  if (!ruta) return;
  const color = ruta.origen === "guardada" ? COLOR_GUARDADA : COLOR_CALCULADA;

  capaActiva.add(new Graphic({
    geometry: ruta.polilinea,
    symbol: { type: "simple-line", color, width: 6 },
  }));
  ruta.paradas.forEach((p, i) => {
    capaActiva.add(new Graphic({
      geometry: p.geometria,
      symbol: { type: "simple-marker", size: 16, color: "white", outline: { color, width: 2 } },
    }));
    capaActiva.add(new Graphic({
      geometry: p.geometria,
      symbol: { type: "text", text: String(i + 1), color: "#333", font: { size: 9, weight: "bold" }, yoffset: -3 },
    }));
  });
}

function descartarCambios({ routeLayer, capaActiva }) {
  const base = estado.rutaActual?.base;
  if (!base) return;
  estado.cargando = true;
  cargarParadasEnComponente(base.paradas, routeLayer);
  mostrarRutaActiva(capaActiva, base);
  setRutaActual(base);
  setTimeout(() => (estado.cargando = false), 500);   // parche: ver nota abajo
}

function nuevaRuta({ routeLayer, capaActiva }) {
  estado.cargando = true;
  routeLayer.stops.removeAll();
  routeLayer.stops.addMany([ new Stop(), new Stop()]); // dos paradas sin ubicacion
  capaActiva.removeAll();
  setRutaActual(null);
  setTimeout(() => (estado.cargando = false), 500);
}

async function guardarComoNueva({ routeLayer, trailsLayer, eventosLayer, capaActiva }) {
  const r = estado.rutaActual;
  const nombre = prompt("Nombre de la ruta:", r.nombre);
  if (!nombre) return;            // el usuario canceló
  r.nombre = nombre.replace(/[|,]/g, " ");   // el carácter | rompe el formato de notes
  if (!r || r.origen !== "calculada") throw new Error("No hay una ruta nueva para guardar.");
  if (r.paradas.length < 2) throw new Error("Hacen falta al menos dos paradas.");

  let idsEventos = [];
  try {
    idsEventos = await guardarEventos(routeLayer, eventosLayer);            // 1° los eventos (dan los ids)
    const idRuta = await guardarRuta(r, idsEventos, trailsLayer);         // 2° la ruta, que los referencia

    // Se recarga desde el servicio: pasa a ser una ruta guardada, con su geometría completa
    const guardada = await obtenerRutaGuardada(idRuta, { trailsLayer, eventosLayer });
    trailsLayer.refresh();
    eventosLayer.refresh();
    mostrarRutaActiva(capaActiva, guardada);
    setRutaActual(guardada);
  } catch (error) {
    // Si la ruta falló pero los eventos ya se habían guardado, se deshacen para no dejarlos huérfanos
    if (idsEventos.length > 0) {
      await borrarEventosPorIds(idsEventos).catch((e) => console.warn("No se pudo deshacer:", e));
    }
    throw error;
  }
}

export { mostrarRutaActiva, guardarComoNueva, descartarCambios, nuevaRuta };