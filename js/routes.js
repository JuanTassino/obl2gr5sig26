import { ruta_prefix, trails_url } from "./const.js";
import { crearRuta } from "./state.js";

const [Graphic, Polyline, webMercatorUtils, Stop] = await $arcgis.import([
  "@arcgis/core/Graphic.js",
  "@arcgis/core/geometry/Polyline.js",
  "@arcgis/core/geometry/support/webMercatorUtils.js",
  "@arcgis/core/rest/support/Stop.js",
]);

async function guardarRuta(idsEventos, routeLayer, trailsLayer) {
  const geometriaWM = routeLayer.routeInfo?.geometry;
  if (!geometriaWM) throw new Error("Todavía no hay una ruta calculada.");

  // 1. A grados (4326)
  const geo = webMercatorUtils.webMercatorToGeographic(geometriaWM);

  // 2. Reconstruir solo con x,y, por si la geometría trae Z o M (la capa no los admite)
  const linea = new Polyline({
    paths: geo.paths.map((trazo) => trazo.map((v) => [v[0], v[1]])),
    spatialReference: { wkid: 4326 },
  });

  // 3. Atributos: marca | nombre | ids de eventos en orden de visita
  const listaIds = idsEventos.join(",");
  const nombre = "Ruta de prueba";  // Cambiar por un nombre que ingresa el usuario ???
  const notes = `${ruta_prefix}|${nombre.slice(0, 40)}|${listaIds}`;
  if (notes.length > 255) {
    throw new Error("La ruta tiene demasiados eventos para el campo notes.");
  }

  const resultado = await trailsLayer.applyEdits({
    addFeatures: [
      new Graphic({
        geometry: linea,
        attributes: { notes, trailtype: 4, recordedon: Date.now() },
      }),
    ],
  });

  const r = resultado.addFeatureResults[0];
  if (r.error) throw new Error(r.error.message);
  return r.objectId
}

function cargarParadasEnComponente(paradas, routeLayer) {
  routeLayer.stops.removeAll();
  paradas.forEach((p) => {
    routeLayer.stops.add(new Stop({ name: p.nombre, geometry: p.geometria }));
  });
}

export async function obtenerRutaGuardada(idRuta, { trailsLayer, eventosLayer }) {
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

export { guardarRuta, cargarParadasEnComponente};