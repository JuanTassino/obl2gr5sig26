-Levantar un servidor HTTP mediante el siguiente comando
python -m http.server
-Iniciar la aplicación en localhost, en el puerto 8000
http://localhost:8000
-El mapa muestar las rutas guardadas
-También permite ingresar paradas y calcular una ruta nueva
-Las rutas guardadas con sus correspondientes paradas pueden simularse como fueron almacenadas y permite intercambiar el orden, agregar o eliminar paradas, recalculando la ruta nuevamente
-El control de ruteo es donde se ingresan las paradas y la ruta es calculada
-El control de configuración permite elegir una velocidad media, un radio para el buffer y una aceleración de simulación
-Tambien muestra un listado de todos los eventos almacenados junto con su 'event_type', y permite la eliminación de 
-El control de principal permite guardar nuevas rutas, descartar modificaciones hechas sobre rutas guardadas, limpiar la ruta y paradas en el controlador de ruteo, exportar el mapa a pdf e iniciar la simulacion
-El control de zoom permite modificar con mayor precision la escala de la vista sobre el mapa

-Una vez iniciada la simulacion, se muestra el estado actual de la simulacion
-Este el progreso de la simulacion, la velocidad actual (con referencia a lo seleccionado), el estado de EEUU en el que se encuentra actualmente y la poblacion que es alcanzada por el buffer
-Durante la simulacion, se marca el radio seleccionado, pintandose los condados que son intersectados y utilizados para calcular la poblacion del buffer
-Al atravesar de un estado a otro, se marca el hito en el mapa con una figura y se muestra el nombre del nuevo estado
-Cuando la simulacion finaliza se muestra un resumen de la misma, mostrando kilometros recorridos, velocidad promedio, poblacion media, lecturas realizadas y una lista de los estados visitados

-En todo momento se puede exportar el mapa en su estado actual a pdf