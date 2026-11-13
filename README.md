# Simulador de móvil con análisis demográfico – Obligatorio 2, Introducción a los SIG (2026)

Aplicación web (ArcGIS Maps SDK for JavaScript 5.1) que simula un móvil recorriendo una ruta por EE. UU. y calcula, en cada posición, la población que queda dentro de un radio de búsqueda (buffer).

## Requisitos

- Navegador moderno y conexión a internet.
- Python 3 (o cualquier servidor HTTP estático).
- Una cuenta de ArcGIS con una API key habilitada para geocodificación y ruteo.

## Configuración

1. Copiar `config.example.js` como `config.js`.
2. Pegar la API key propia en `config.js`. Este archivo no se sube al repositorio.

## Ejecución

Desde la carpeta que contiene `index.html`:

```
python -m http.server
```

Abrir http://localhost:8000 (no abrir el archivo con doble clic: el navegador lo bloquea).

## Uso

### Mapa y rutas guardadas
- El mapa muestra las rutas guardadas. Al hacer clic en una, se carga con sus paradas (naranja = guardada, celeste = calculada sin guardar).
- Una ruta guardada se simula tal como fue almacenada, sin recalcularla.

### Panel de ruteo
- Permite ingresar paradas (buscador o clic en el mapa), reordenarlas, agregarlas o quitarlas. La ruta se recalcula con cada cambio.
- Solo se aceptan paradas dentro de EE. UU.

### Panel "Ruta"
- **Guardar como nueva**: guarda la ruta y sus paradas (como eventos); pide un nombre.
- **Descartar cambios**: vuelve a la ruta guardada original.
- **Nueva ruta**: limpia la ruta y las paradas.
- **Iniciar simulación**: si la ruta no está guardada, ofrece guardarla antes.
- **Exportar a PDF**: disponible antes y después de simular.

### Panel "Configuración"
- Radio del buffer, velocidad media y aceleración de la simulación (se pueden cambiar durante la simulación).
- Tipo de evento de cada parada.
- "Mis eventos": lista de los eventos almacenados con su tipo, y permite eliminarlos.

### Panel "Zoom"
- Ajuste fino de la escala del mapa.

### Simulación
- Se muestran: progreso, velocidad actual (varía alrededor de la velocidad media elegida), estado de EE. UU. en el que está el móvil y población dentro del buffer.
- El trazo se colorea según la velocidad, y se resaltan los condados que el buffer intersecta.
- Al pasar de un estado a otro, se marca el punto en el mapa con el nombre del nuevo estado.
- Al finalizar o detener se muestra un resumen: distancia recorrida, velocidad promedio, población media, lecturas realizadas y estados visitados.

## Limitaciones

- Los servicios de Esri de ejemplo (eventos y rutas) son compartidos y pueden vaciarse o no estar disponibles.
- La población se reparte de forma uniforme dentro de cada condado.
- La velocidad es simulada: no representa tráfico real.