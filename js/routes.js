import { ruta_prefix, trails_url } from "./const.js";
import { crearRuta } from "./state.js";

const [Graphic, Polyline, webMercatorUtils, Stop] = await $arcgis.import([
  "@arcgis/core/Graphic.js",
  "@arcgis/core/geometry/Polyline.js",
  "@arcgis/core/geometry/support/webMercatorUtils.js",
  "@arcgis/core/rest/support/Stop.js",
]);

function nombreSugerido(paradas) {
  return "Ruta: " + paradas.map((p) => (p.nombre ?? "").split(",")[0].trim()).filter(Boolean).join(" - ");
}

async function guardarRuta(ruta, idsEventos, trailsLayer) {
  // Web Mercator -> grados, y solo x,y (la capa no admite Z ni M)
  const geo = webMercatorUtils.webMercatorToGeographic(ruta.polilinea);
  const linea = new Polyline({
    paths: geo.paths.map((trazo) => trazo.map((v) => [v[0], v[1]])),
    spatialReference: { wkid: 4326 },
  });

  const ids = idsEventos.join(",");
  const maxNombre = 255 - (ruta_prefix.length + 2 + ids.length);
  if (maxNombre < 5) throw new Error("La ruta tiene demasiados eventos para guardarla");
  const notes = `${ruta_prefix}|${ruta.nombre.slice(0, maxNombre)}|${ids}`;
  if (notes.length > 255) throw new Error("La ruta tiene demasiados eventos para el campo notes.");

  let resultado;
  try {
    resultado = await trailsLayer.applyEdits({ addFeatures:  [new Graphic({ geometry: linea, attributes: { notes, trailtype: 4 } })], });
  } catch (e) {
    console.error("applyEdits falló:", e.message, e.details);
    throw e;
  }
  /*
  const resultado = await trailsLayer.applyEdits({
    addFeatures: [new Graphic({ geometry: linea, attributes: { notes, trailtype: 4, recordedon: new Date() } })],
  });*/
  const r = resultado.addFeatureResults[0];
  if (r.error) throw new Error(r.error.message);
  return r.objectId;
}

function cargarParadasEnComponente(paradas, routeLayer) {
  routeLayer.stops.removeAll();
  paradas.forEach((p) => {
    routeLayer.stops.add(new Stop({ name: p.nombre, geometry: p.geometria }));
  });
}

async function obtenerRutaGuardada(idRuta, { trailsLayer, eventosLayer }) {
  // 1. La ruta completa, por id (no la del gráfico del clic, que viene simplificada)
  const resRuta = await trailsLayer.queryFeatures({
    objectIds: [idRuta],
    outFields: ["*"],
    returnGeometry: true,
  });
  const trail = resRuta.features[0];
  if (!trail) throw new Error("La ruta ya no existe en el servicio.");

  // 2. Leer notes: prefijo|nombre|id1,id2,...
  const partes = (trail.attributes.notes ?? "").split("|");
  if (partes.length < 3) throw new Error("El campo notes de la ruta no tiene el formato esperado.");
  const nombre = partes[1];
  const ids = partes[2].split(",").map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length === 0) throw new Error("La ruta no tiene eventos válidos.");

  // 3. Sus eventos, reordenados según la lista guardada
  const resEv = await eventosLayer.queryFeatures({
    objectIds: ids,
    outFields: ["*"],
    returnGeometry: true,
  });
  const campoId = eventosLayer.objectIdField;      // evita errores de mayúsculas
  const porId = new Map(resEv.features.map((f) => [f.attributes[campoId], f]));

  const paradas = ids
    .map((id) => porId.get(id))
    .filter(Boolean)                               // saltea eventos que ya no existen
    .map((ev) => ({
      idEvento: ev.attributes[campoId],
      nombre: ev.attributes.description,
      tipoEvento: ev.attributes.event_type,
      geometria: webMercatorUtils.geographicToWebMercator(ev.geometry),
    }));

  const ruta = crearRuta({
    origen: "guardada",
    idRuta,
    nombre,
    paradas,
    polilinea: webMercatorUtils.geographicToWebMercator(trail.geometry),
  });
  ruta.completa = paradas.length === ids.length;   // false si faltan eventos
  return ruta;
}


function rutaDesdeComponente(routeLayer, nombre = "Ruta nueva") {
  const geometria = routeLayer.routeInfo?.geometry;
  if (!geometria) return null;

  const paradas = routeLayer.stops.toArray()
    .filter((p) => p.geometry)                      // descarta las vacías
    .map((p) => ({
      idEvento: null,                               // todavía no es un evento guardado
      nombre: p.name,
      tipoEvento: p.tipoEvento ? p.tipoEvento : 5,                                // TODO: el que elija el usuario
      geometria: p.geometry,
    }));
  if (paradas.length < 2) return null;

  const ruta = crearRuta({ origen: "calculada", nombre, paradas, polilinea: geometria });
  ruta.modificada = true;
  return ruta;
}


export { guardarRuta, cargarParadasEnComponente, obtenerRutaGuardada, rutaDesdeComponente, nombreSugerido };