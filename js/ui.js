import { estado, suscribir } from "./state.js";
import { guardarComoNueva, descartarCambios, nuevaRuta } from "./actions.js";
import { eventos_type } from "./const.js";
import { eventosPropios, rutasQueUsan, eliminarEvento } from "./events.js";

const $ = (selector) => {
  const el = document.querySelector(selector);
  if (!el) console.warn(`Falta en el HTML el elemento ${selector}`);
  return el ?? document.createElement("div");   // un elemento vacío, para que nada se rompa
};

function avisar(mensaje) {
  alert(mensaje);   // provisorio
}

// Valores que modifican los reguladores, incluso con la simulación corriendo
const control = { detenido: false, radioKm: 30, velocidadMedia: 80, aceleracion: 1000 };
let deps2;

function enlazar(selector, fn) {
  const el = $(selector);
  el.addEventListener("calciteSliderInput", () => fn(Number(el.value)));
}

function iniciarUI(deps) {
  const $ = (s) => document.querySelector(s);
  const btnGuardar = $("#btn-guardar");
  const btnDescartar = $("#btn-descartar");
  const btnNueva = $("#btn-nueva");
  const btnIniciar = $("#btn-iniciar");
  deps2 = deps;
  // 1. Habilitación de botones según el estado de la aplicación
  const actualizar = (e) => {
    const r = e.rutaActual;
    const edicion = e.modo === "edicion";
    btnGuardar.disabled = !(edicion && r?.origen === "calculada" && !r.invalida);
    btnDescartar.disabled = !(edicion && e.base && r?.origen === "calculada");
    btnNueva.disabled = !edicion;
    btnIniciar.disabled = !(edicion && r && !r.invalida);
  };
  suscribir(actualizar);
  actualizar(estado);     // estado inicial, al abrir la página
  suscribir((e) => dibujarTipos(e.rutaActual));
  suscribir((e) => {
    deps.directionsElement.style.display = e.modo === "simulacion" ? "none" : "";
  });

  // 2. Acciones
  btnGuardar.addEventListener("click", async () => {
    btnGuardar.disabled = true;
    try {
      await guardarComoNueva(deps);
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
  $("#btn-cerrar-resumen").addEventListener("click", () => ($("#panel-sim").style.display = "none"));
}

function dibujarTipos(r) { 
  const cont = $("#lista-tipos");
  cont.innerHTML = "";
  if (r?.paradas) {
    cont.style.display = "block";
  }
  r?.paradas.forEach((p, i) => {
    const etiqueta = document.createElement("calcite-label");
    etiqueta.textContent = `${i + 1}. ${(p.nombre ?? "").split(",")[0]}`;
    const sel = document.createElement("calcite-select");
    eventos_type.forEach(([valor, texto]) => {
      const op = document.createElement("calcite-option");
      op.value = valor; op.textContent = texto;
      if (Number(valor) === p.tipoEvento) op.selected = true;
      if (p.tipoEvento === null && Number(valor) === 5) op.selected = true;
      sel.appendChild(op);
    });
    sel.addEventListener("calciteSelectChange", () => (p.tipoEvento = Number(sel.value)));
    etiqueta.appendChild(sel);
    cont.appendChild(etiqueta);
  });
}

async function refrescarEventos(deps) {
  const lista = $("#contenedor-eventos");
  lista.style.display = "block";
  lista.innerHTML = "";
  for (const ev of await eventosPropios(deps.eventosLayer)) {
    const item = document.createElement("calcite-list-item");
    item.label = ev.nombre ?? `Evento ${ev.id}`;
    item.description = eventos_type.find(([v]) => Number(v) === ev.tipo)?.[1] ?? "";
    const accion = document.createElement("calcite-action");
    accion.slot = "actions-end"; accion.icon = "trash"; accion.text = "Eliminar";
    accion.addEventListener("click", async () => {
      const usadoPor = await rutasQueUsan(ev.id, deps.trailsLayer);
      const msg = usadoPor.length
        ? `Lo usan estas rutas: ${usadoPor.join(", ")}. Quedarán con una parada menos. ¿Eliminar igual?`
        : "¿Eliminar este evento?";
      if (!confirm(msg)) return;
      try { await eliminarEvento(ev.id, deps.eventosLayer); }
      catch (e) { return avisar(e.message); }
      deps.eventosLayer.refresh();
      refrescarEventos(deps);
    });
    item.appendChild(accion);
    lista.appendChild(item);
  }
}

$("#btn-refrescar-eventos").addEventListener("click", () => refrescarEventos(deps2));

function prepararPanelSim() {
  $("#panel-sim").heading = "Simulación en curso";
  $("#panel-sim").style.display = "";
  $("#sim-barra").value = 0;
  $("#fila-poblacion").style.display = "";
  $("#sim-resumen").style.display = "none";
  $("#btn-detener").style.display = "";
  $("#btn-detener").disabled = false;
  $("#btn-cerrar-resumen").style.display = "none";
  $("#fila-velocidad").style.display = "";
  $("#fila-progreso").style.display = "";
  $("#fila-estado").style.display = "";
  $("#sim-barra").style.display = "";
}

function mostrarResumen(r) {
  $("#panel-sim").heading = r.completada ? "Simulación finalizada" : "Simulación detenida";
  $("#fila-poblacion").style.display = "none";          // ya no hay buffer que mostrar
  $("#sim-barra").style.display = "none";
  $("#fila-velocidad").style.display = "none";
  $("#fila-progreso").style.display = "none";
  $("#fila-estado").style.display = "none";
  $("#btn-detener").style.display = "none";
  $("#res-km").textContent = r.km.toFixed(0);
  $("#res-vel").textContent = r.velocidadMedia.toFixed(0);
  $("#res-poblacion").textContent = r.poblacionMedia.toLocaleString("es");
  $("#res-lecturas").textContent = r.lecturas;
  $("#res-estados").textContent = r.estados.join(" → ") || "-";
  $("#sim-resumen").style.display = "flex";
  $("#btn-cerrar-resumen").style.display = "";
}

export { iniciarUI, control, avisar, prepararPanelSim, mostrarResumen, $ };