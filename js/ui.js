import { estado, suscribir } from "./state.js";
import { guardarComoNueva, descartarCambios, nuevaRuta } from "./actions.js";

const $ = (selector) => {
  const el = document.querySelector(selector);
  if (!el) console.warn(`Falta en el HTML el elemento ${selector}`);
  return el ?? document.createElement("div");   // un elemento vacío, para que nada se rompa
};

export function avisar(mensaje) {
  alert(mensaje);   // provisorio
}

// Valores que modifican los reguladores, incluso con la simulación corriendo
export const control = { detenido: false, radioKm: 30, velocidadMedia: 80, aceleracion: 1000 };

export function aplicarTipoSeleccionado() {
  const tipo = Number(document.querySelector("#sel-tipo").value);
  estado.rutaActual?.paradas.forEach((p) => (p.tipoEvento = tipo));
}

function enlazar(selector, fn) {
  const el = $(selector);
  el.addEventListener("calciteSliderInput", () => fn(Number(el.value)));
}

export function iniciarUI(deps) {
  const $ = (s) => document.querySelector(s);
  const btnGuardar = $("#btn-guardar");
  const btnDescartar = $("#btn-descartar");
  const btnNueva = $("#btn-nueva");
  const btnIniciar = $("#btn-iniciar");

  // 1. Habilitación de botones según el estado de la aplicación
  const actualizar = (e) => {
    const r = e.rutaActual;
    const edicion = e.modo === "edicion";
    btnGuardar.disabled = !(edicion && r?.origen === "calculada");
    btnDescartar.disabled = !(edicion && r?.base);
    btnNueva.disabled = !edicion;
    btnIniciar.disabled = !(edicion && r);
  };
  suscribir(actualizar);
  actualizar(estado);     // estado inicial, al abrir la página

  // 2. Acciones
  btnGuardar.addEventListener("click", async () => {
    btnGuardar.disabled = true;
    try {
      aplicarTipoSeleccionado();
      await guardarComoNueva(deps);
      avisar("Ruta guardada.");
    } catch (e) {
      console.error(e);
      avisar("No se pudo guardar: " + e.message);
    } finally {
      actualizar(estado);
    }
  });
  btnDescartar.addEventListener("click", () => descartarCambios(deps));
  btnNueva.addEventListener("click", () => nuevaRuta(deps));

  // 3. Reguladores
  enlazar("#inp-radio", (v) => (control.radioKm = v));
  enlazar("#inp-vel", (v) => (control.velocidadMedia = v));
  $("#sel-acel").addEventListener("calciteSelectChange", (e) => (control.aceleracion = Number(e.target.value)));
}