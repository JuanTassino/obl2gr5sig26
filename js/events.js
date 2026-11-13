import { event_id, eventos_url } from "./const.js";

const [Graphic, Point] = await $arcgis.import([
  "@arcgis/core/Graphic.js",
  "@arcgis/core/geometry/Point.js",
]);

async function guardarEventos(paradas, eventosLayer) {
  const graphics = paradas.map(paradaAGraphic);

  const resultado = await eventosLayer.applyEdits({ addFeatures: graphics });
  
  const errores = resultado.addFeatureResults.filter((r) => r.error);
  if (errores.length > 0) {
    throw new Error(errores.map((r) => r.error.message).join(";"));
  }

  // los ids vienen en el mismo orden que las paradas
  return resultado.addFeatureResults.map((r) => r.objectId);
}

function paradaAGraphic(parada, indice) {
  // Punto nuevo en 4326, armado con los grados del punto en WebMercator
  const punto = new Point({
    longitude: parada.geometria.longitude,
    latitude: parada.geometria.latitude,
  });
  return new Graphic({
    geometry: punto,
    attributes: {
      description: (parada.nombre ?? `Parada ${indice+1}`).slice(0,50),
      event_type: parada.tipoEvento,
      eventid: event_id,
      eventdate: Date.now(),
    },
  });
}

async function borrarEventosPorIds(ids) {
  await eventosLayer.applyEdits({ deleteFeatures: ids.map((objectId) => ({ objectId })) });
}

async function eventosPropios(eventosLayer) {
  const idCampo = eventosLayer.objectIdField;
  const r = await eventosLayer.queryFeatures({
    where: `eventid = ${event_id} and 1=1`, outFields: ["*"], returnGeometry: false, orderByFields: [`${idCampo} DESC`], 
  });
  return r.features.map((f) => ({ id: f.attributes[idCampo], nombre: f.attributes.description, tipo: f.attributes.event_type }));
}

async function rutasQueUsan(idEvento, trailsLayer) {
  const r = await trailsLayer.queryFeatures({ where: "1=1", outFields: ["notes"], returnGeometry: false });
  return r.features.map((f) => f.attributes.notes?.split("|"))
    .filter((p) => p?.length >= 3 && p[2].split(",").map(Number).includes(idEvento))
    .map((p) => p[1]);
}

async function eliminarEvento(idEvento, eventosLayer) {
  const res = await eventosLayer.applyEdits({ deleteFeatures: [{ objectId: idEvento }] });
  const error = res.deleteFeatureResults[0]?.error;
  if (error) throw new Error(error.message);
}

export { guardarEventos, borrarEventosPorIds, eventosPropios, rutasQueUsan, eliminarEvento };