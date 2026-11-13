// simulate.js
import { crearRecorrido } from "./trace.js";
import { crearModeloVelocidad, colorPorVelocidad } from "./speed.js";
import { max_lecturas } from "./const.js";

const [Graphic, Point, Polyline] = await $arcgis.import([
  "@arcgis/core/Graphic.js",
  "@arcgis/core/geometry/Point.js",
  "@arcgis/core/geometry/Polyline.js",
]);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export async function ejecutarSimulacion({ ruta, capas, analizar, estadoEn, alCambiar, control }) {
  const rec = crearRecorrido(ruta.polilinea);
  const modelo = crearModeloVelocidad();
  let estadoPrevio = null;
  let d = 0;     // km recorridos
  let i = 0;     // número de lectura
  let sumaPobl = 0;

  control.detenido = false;
  let sumaVel = 0;
  const estadosVisitados = new Set();

  capas.recorrido.removeAll();
  capas.movil.removeAll();
  capas.analisis.removeAll();

  while (d < rec.totalKm && !control.detenido) {
    const inicio = performance.now();
    const dPrev = d;
    const radio = control.radioKm;    
    
    const paso = Math.max(radio * 1.5, rec.totalKm / max_lecturas); // el paso es el radio*1.5 o el total/80 

    // se lee en cada vuelta
    d = Math.min(rec.totalKm, d + paso); // un análisis dependiendo del paso calculado
    i++;
    const v = modelo(control.velocidadMedia);
    const actual = rec.puntoEn(d);
    const punto = new Point({ longitude: actual[0], latitude: actual[1] });

    // 1) Primero se calcula (estado y buffer del punto nuevo); todavía no se dibuja nada
    const [estadoNuevo, resultado] = await Promise.all([
      estadoEn
        ? estadoEn(actual).catch((e) => { console.error("Estado:", e); return null; })
        : Promise.resolve(null),
      analizar
        ? analizar(actual, radio).catch((e) => { console.error("Análisis:", e); return null; })
        : Promise.resolve(null),
    ]);
    if (control.detenido) break;       // si apretaron Detener mientras esperaba, no se dibuja

    // 2) Después se dibuja todo junto: tramo, móvil y buffer aparecen a la vez
    capas.recorrido.add(new Graphic({
      geometry: new Polyline({ paths: [rec.tramoEntre(dPrev, d)], spatialReference: { wkid: 4326 } }),
      symbol: {
        type: "simple-line", width: 5,
        color: colorPorVelocidad(v, control.velocidadMedia * 0.5, control.velocidadMedia * 1.4),
      },
    }));
    capas.movil.removeAll();
    capas.movil.add(new Graphic({
      geometry: punto,
      symbol: { type: "simple-marker", size: 14, color: "white", outline: { color: "black", width: 2 } },
    }));

    // 3) Cambio de estado: marcador y nombre
    const estado = estadoNuevo ?? estadoPrevio;
    if (estado && estadoPrevio && estado !== estadoPrevio) {
      capas.recorrido.add(new Graphic({
        geometry: punto,
        symbol: { type: "simple-marker", style: "diamond", size: 16, color: "#6a1b9a", outline: { color: "white", width: 2 } },
      }));
      capas.recorrido.add(new Graphic({
        geometry: punto,
        symbol: { type: "text", text: estado, color: "#6a1b9a", haloColor: "white", haloSize: 2, yoffset: 14, font: { size: 11, weight: "bold" } },
      }));
    }
    estadoPrevio = estado;
    sumaVel += v;
    if (estado) estadosVisitados.add(estado);

    // 4) Panel y buffer (el dibujo del buffer se hace en alCambiar, justo ahora)
    alCambiar({ i, progreso: d / rec.totalKm, velocidad: v, posicion: actual, estado, resultado });

    sumaPobl += resultado.poblacionTotal;
    // 5) Pausa: tiempo simulado del tramo, acelerado, menos lo que ya tardó el análisis
    const objetivoMs = ((d - dPrev) / v) * 3600 * 1000 / control.aceleracion;
    await esperar(Math.max(0, objetivoMs - (performance.now() - inicio)));
  }
  return {
    completada: d >= rec.totalKm && !control.detenido,
    km: d,
    lecturas: i,
    velocidadMedia: i ? sumaVel / i : 0,
    estados: [...estadosVisitados],
    poblacionMedia: i ? sumaPobl / i : 0,
  };
}