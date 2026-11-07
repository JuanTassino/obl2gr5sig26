import { ruta_prefix, trails_url } from "./const.js";

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

async function cargarRutaEnEditor({ ruta, eventosLayer, routeLayer, directionsElement }) {
  const [, nombre, listaIds] = ruta.attributes.notes.split("|");
    const ids = listaIds
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);

  if (ids.length === 0) return;

  console.log("notes:", ruta.attributes.notes, "ids:", ids);

  const res = await eventosLayer.queryFeatures({
    objectIds: ids,
    outFields: ["*"],
    returnGeometry: true,
  });

  // El servicio no garantiza el orden: se reordena según la lista guardada
  const porId = new Map(res.features.map((f) => [f.attributes.objectid, f]));
  const eventos = ids.map((id) => porId.get(id)).filter(Boolean);

  if (eventos.length < ids.length) {
    // TODO: avisar al usuario que faltan eventos
  }
  if (eventos.length < 2) return;

  routeLayer.stops.removeAll();
  eventos.forEach((ev) => {
    routeLayer.stops.add(
      new Stop({ name: ev.attributes.description, geometry: ev.geometry })
    );
  });
  await directionsElement.getDirections();
}

export { guardarRuta, cargarRutaEnEditor };