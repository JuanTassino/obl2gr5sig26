import { geometry_url } from "./const.js";

const [geometryService, BufferParameters, AreasAndLengthsParameters, Point, Graphic] = await $arcgis.import([
  "@arcgis/core/rest/geometryService.js",
  "@arcgis/core/rest/support/BufferParameters.js",
  "@arcgis/core/rest/support/AreasAndLengthsParameters.js",
  "@arcgis/core/geometry/Point.js",
  "@arcgis/core/Graphic.js",
]);

const areaCache = new Map();   // área de cada condado completo (se calcula una sola vez)
const geomCache = new Map();   // id -> condado completo (attrs y geometria)

async function areas(polygons) {
  const r = await geometryService.areasAndLengths(geometry_url, new AreasAndLengthsParameters({
    polygons, areaUnit: "square-kilometers", calculationType: "preserve-shape",
  }));
  return r.areas.map(Math.abs);
}

async function analizarPosicion(centro, radioKm, { condadosLayer, campos }) {
  const punto = new Point({ longitude: centro[0], latitude: centro[1] });

  // 1. Buffer en el GeometryServer
  const [bufer] = await geometryService.buffer(geometry_url, new BufferParameters({
    geometries: [punto], distances: [radioKm], unit: "kilometers", geodesic: true,
    outSpatialReference: { wkid: 4326 },
  }));

  // 2. Condados que toca el buffer
  const idCampo = condadosLayer.objectIdField;
  const res = await condadosLayer.queryFeatures({
    geometry: bufer, spatialRelationship: "intersects",
    outFields: [idCampo, campos.nombre, campos.estado, campos.poblacion],
    returnGeometry: true, outSR: { wkid: 4326 },
  });
  const feats = res.features;
  if (feats.length === 0) return { buffer: bufer, condados: [], poblacionTotal: 0 };

  // 3. Intersección en el GeometryServer: cada condado recortado por el buffer
  const recortes = await geometryService.intersect(geometry_url, feats.map((f) => f.geometry), bufer);
  if (recortes.length !== feats.length) throw new Error("La intersección no devolvió un resultado por condado.");
  const areaRecorte = await areas(recortes);

  // 4. Áreas de los condados completos (solo los que no están en caché)
  const faltan = feats.filter((f) => !areaCache.has(f.attributes[idCampo]));
  if (faltan.length) {
    const a = await areas(faltan.map((f) => f.geometry));
    faltan.forEach((f, i) => areaCache.set(f.attributes[idCampo], a[i]));
  }

  // 5. Ponderación: población × (área dentro del buffer / área del condado)
  let total = 0;
  const condados = feats.map((f, i) => {
    const porcentaje = Math.min(1, areaRecorte[i] / areaCache.get(f.attributes[idCampo]));
    const poblacion = f.attributes[campos.poblacion] ?? 0;
    total += poblacion * porcentaje;
    return { nombre: f.attributes[campos.nombre], estado: f.attributes[campos.estado], poblacion, porcentaje, geometria: f.geometry };
  });
  return { buffer: bufer, condados, poblacionTotal: Math.round(total) };
}

function dibujarAnalisis(capa, resultado) {
  capa.removeAll();
  if (!resultado) return;
  resultado.condados.forEach((c) => capa.add(new Graphic({
    geometry: c.geometria,
    symbol: { type: "simple-fill", style: "forward-diagonal", color: [255, 193, 7, 0.1], outline: { color: [255, 111, 0], width: 1.5 } },
  })));
  capa.add(new Graphic({
    geometry: resultado.buffer,
    symbol: { type: "simple-fill", color: [0, 120, 255, 0.1], outline: { color: [0, 90, 200], width: 2 } },
  }));
}

async function estadoEn(centro, condadosLayer, campoEstado) {
  const res = await condadosLayer.queryFeatures({
    geometry: new Point({ longitude: centro[0], latitude: centro[1] }),
    spatialRelationship: "intersects", outFields: [campoEstado], returnGeometry: false,
  });
  return res.features[0]?.attributes[campoEstado] ?? null;
}

export { analizarPosicion, estadoEn, dibujarAnalisis };