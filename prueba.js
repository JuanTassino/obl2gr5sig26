// Prueba para ver como se toman las paradas y la ruta, tomando como referencia el evento de cambio de arcgis
// No nos sirvió porque a cada cambio en las paradas dispara el evento, y no queremos que guarde hasta que comience la simulación (? resolver)
directionsElement.addEventListener("arcgisPropertyChange", (e) => {
  if (e.detail.name === "lastRoute") {
    // En STOPS aparecen las paradas de la ruta, tienen campo 'name' legible como lo que se muestra en pantalla, geometry es Point
    // La ruta tiene geometry Polyline, y dentro de geometry tiene el campo paths, que muestra todos los segmentos, curvas, y coordenadas de giros de la ruta
    // Tiene tantos paths como segmentos entre stops, y dentro de cada path tiene subsegmentos por cada linea entre dos puntos de giro
    // tambien el campo spatialReference determina que sus coordenadas son de tipo webMercator (investigar más sobre esto)
    const route = routeLayer.routeInfo
    const stops = routeLayer.stops.toArray()
    stops.forEach(parada => {
      if (parada.name !== '') {
          const resultado = eventos.applyEdits({
          addFeatures: [
            new Graphic({
              geometry: new Point({ longitude: parada.geometry.longitude, latitude: parada.geometry.latitude }),
              attributes: { description: parada.name, event_type: 5, eventid: 5202601, eventdate: Date.now() },
            }),
          ],
        });
      }
    })
    console.log(route.geometry)
  }
});

// Prueba de guardado de stops
const resultado = await eventos.applyEdits({
  addFeatures: [
    new Graphic({
      geometry: new Point({ longitude: -98, latitude: 39 }),
      attributes: { description: "Prueba", event_type: 5, eventid: 5202601, eventdate: Date.now() },
    }),
  ],
  deleteFeatures: [
  ]
});
console.log(resultado.addFeatureResults);
console.log(resultado.deleteFeatureResults)
// Hasta aca