import { event_id, eventos_url } from "./const.js";

const [Graphic, Point] = await $arcgis.import([
  "@arcgis/core/Graphic.js",
  "@arcgis/core/geometry/Point.js",
]);

async function guardarEventos(routeLayer, eventosLayer) {
  const paradas = routeLayer.stops.toArray().filter((p) => p.geometry);
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
    longitude: parada.geometry.longitude,
    latitude: parada.geometry.latitude,
  });

  return new Graphic({
    geometry: punto,
    attributes: {
      description: (parada.name ?? `Parada ${indice+1}`).slice(0,50),
      event_type: 5, // TODO: el tipo elegido por el usuario (? ver como resolver) 
      eventid: event_id,
      eventdate: Date.now(),
    },
  });
}

async function borrarEventosPorIds(ids) {
  await eventosLayer.applyEdits({ deleteFeatures: ids.map((objectId) => ({ objectId })) });
}

export { guardarEventos, borrarEventosPorIds };