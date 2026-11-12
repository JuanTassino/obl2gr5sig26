const [webMercatorUtils] = await $arcgis.import([
  "@arcgis/core/geometry/support/webMercatorUtils.js",
]);

const R = 6371; // radio terrestre en km

function haversine(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad;
  const dLon = (b[0] - a[0]) * rad;
  const h = Math.sin(dLat / 2) ** 2 +
            Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function crearRecorrido(polilineaWebMercator) {
  const geo = webMercatorUtils.webMercatorToGeographic(polilineaWebMercator);
  const puntos = geo.paths.flat().map(([x, y]) => [x, y]);
  const acumulada = [0];
  for (let i = 1; i < puntos.length; i++) {
    acumulada.push(acumulada[i - 1] + haversine(puntos[i - 1], puntos[i]));
  }
  const totalKm = acumulada[acumulada.length - 1];

  function puntoEn(km) {
    const d = Math.min(Math.max(km, 0), totalKm);
    let lo = 0, hi = acumulada.length - 1;
    while (hi - lo > 1) {                       // búsqueda binaria del tramo
      const mid = (lo + hi) >> 1;
      if (acumulada[mid] <= d) lo = mid; else hi = mid;
    }
    const largo = acumulada[hi] - acumulada[lo] || 1;
    const t = (d - acumulada[lo]) / largo;
    const [x0, y0] = puntos[lo];
    const [x1, y1] = puntos[hi];
    return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
  }

  function tramoEntre(km0, km1) {
    const pts = [puntoEn(km0)];
    for (let i = 0; i < acumulada.length; i++) {
      if (acumulada[i] > km0 && acumulada[i] < km1) pts.push(puntos[i]);
    }
    pts.push(puntoEn(km1));
    return pts;
  }

  return { totalKm, puntoEn, tramoEntre };
}

export { crearRecorrido };