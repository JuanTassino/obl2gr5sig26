const cache = new Map();

async function estaEnEEUU(geometria, condadosLayer) {
  const clave = `${Math.round(geometria.x)},${Math.round(geometria.y)}`;
  if (!cache.has(clave)) {
    const n = await condadosLayer.queryFeatureCount({
      geometry: geometria, spatialRelationship: "intersects", distance: 5, units: "kilometers",
    });
    cache.set(clave, n > 0);
  }
  return cache.get(clave);
}
async function paradasFueraDeEEUU(paradas, condadosLayer) {
  const ok = await Promise.all(paradas.map((p) => estaEnEEUU(p.geometria, condadosLayer)));
  return paradas.filter((_, i) => !ok[i]);
}

function mismasParadas(a, b, tolMetros = 150) {
  if (a.length !== b.length) return false;
  return a.every((p, i) =>
    Math.hypot(p.geometria.x - b[i].geometria.x, p.geometria.y - b[i].geometria.y) < tolMetros);
}

export { paradasFueraDeEEUU, estaEnEEUU, mismasParadas };