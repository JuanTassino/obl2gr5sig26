const estado = {
  modo: "edicion",      // "edicion" | "simulacion"
  cargando: false,      // true mientras carga paradas por código
  rutaActual: null,
};

const oyentes = [];
function suscribir(fn) {
  oyentes.push(fn);
}

function setRutaActual(ruta) {
  estado.rutaActual = ruta;
  oyentes.forEach((fn) => fn(estado));   // avisa a quien muestre algo (etiqueta, botones)
}

// Todas las rutas activas se construyen con esta función, vengan de donde vengan
function crearRuta({ origen, idRuta = null, nombre, paradas, polilinea }) {
  return {
    origen,                         // "guardada" | "calculada"
    idRuta,                         // objectId en Trails, o null si es nueva
    nombre,
    paradas,                        // [{ idEvento, nombre, tipoEvento, geometria }]
    polilinea,                      // en Web Mercator
    modificada: false,
    original: { paradas: [...paradas], polilinea },   // para "descartar cambios"
    base: null,
    invalida: false,
  };
}

function setModo(modo) {
  estado.modo = modo;
  oyentes.forEach((fn) => fn(estado));   // avisa a quien muestre u oculte cosas según el modo
}

export { estado, setRutaActual, crearRuta, suscribir, setModo };