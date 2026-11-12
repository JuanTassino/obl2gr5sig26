function crearModeloVelocidad() {
  let v = null;
  return (media) => {
    const min = media * 0.5, max = media * 1.4;
    if (v === null) v = media;
    v += (Math.random() - 0.5) * media * 0.25;
    return (v = Math.min(max, Math.max(min, v)));
  };
}

const VERDE = [46, 204, 113], AMARILLO = [241, 196, 15], ROJO = [231, 76, 60];
const mezclar = (a, b, t) => a.map((c, i) => Math.round(c + (b[i] - c) * t));

function colorPorVelocidad(v, min = 40, max = 110) {
  const t = Math.min(1, Math.max(0, (v - min) / (max - min)));
  return t < 0.5 ? mezclar(VERDE, AMARILLO, t * 2) : mezclar(AMARILLO, ROJO, (t - 0.5) * 2);
}

export { crearModeloVelocidad, colorPorVelocidad };