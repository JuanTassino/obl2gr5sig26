import { guardarEventos } from "./events.js";
import { guardarRuta, cargarRutaEnEditor } from "./routes.js";
import { borrarPropios } from "./delete.js";
import { eventos_url, trails_url, event_id, ruta_prefix } from "./const.js";

const [RouteLayer, Basemap, TileLayer, FeatureLayer] = await $arcgis.import([
  "@arcgis/core/layers/RouteLayer.js",
  "@arcgis/core/Basemap.js",
  "@arcgis/core/layers/TileLayer.js",
  "@arcgis/core/layers/FeatureLayer.js",
]);

var modoActual = "edicion";

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


// Este es el codigo que debe ejecutarse cuando le damos al boton de iniciar simulacion
// Esto quiere decir, guardar las paradas, guardar la ruta, comenzar la simulación, y deshabilitar el resto de la interfaz
// Además de comenzar con la operacion de la población y tener en cuenta la velocidad y el radio de amplitud
document.querySelector("#btn-iniciar").addEventListener("click", async () => {
  document.querySelector("#btn-iniciar").disabled = true;
  document.querySelector("#btn-paradas").disabled = true;
  document.querySelector("#btn-rutas").disabled = true;
  modoActual = "simulacion"
  let idsEventos = [];
  try {
    idsEventos = await guardarEventos(routeLayer, eventosLayer);
    await guardarRuta(idsEventos, routeLayer, trailsLayer);
    eventosLayer.refresh();
    // TODO: pasar a modo simulación
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
    document.querySelector("#btn-paradas").disabled = false;
    document.querySelector("#btn-rutas").disabled = false;
    modoActual = "edicion"
  }
});

//Botón que elimina las stops guardadas
document.querySelector("#btn-paradas").addEventListener("click", async () => {
  if (!confirm("¿Borrar todos tus eventos guardados?")) return;
    try {
      const n = await borrarPropios(eventosLayer, `eventid = ${event_id}`);
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
  if (modoActual !== "edicion") return; //el estado de la aplicación

  const { results } = await viewElement.view.hitTest(event.detail, {
    include: [trailsLayer],
  });
  const ruta = results[0]?.graphic;
  if (!ruta) return;

  await cargarRutaEnEditor({ ruta, eventosLayer, routeLayer, directionsElement });
});