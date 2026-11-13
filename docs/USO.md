# Guía de uso

*(English version: [USAGE.md](USAGE.md))*

CoverTheMap responde a una pregunta: **«¿cuál es la ruta más corta que pasa
por todas las calles de esta zona?»** Eliges una zona en el mapa, indicas (si
quieres) dónde empiezas y dónde terminas, y obtienes una ruta que puedes
descargar en formato GPX para tu reloj, móvil o ciclocomputador.

## 1. Recorrido rápido (5 pasos)

1. **Dibuja la zona.** Mueve y haz zoom hasta tu pueblo o barrio y pulsa puntos
   para dibujar un polígono; doble clic (o pulsar el primer punto) lo cierra.
2. **Pulsa el botón azul grande** («Validar el polígono»). El mapa se ajusta a tu
   zona y descarga sus calles de OpenStreetMap.
3. **Elige la salida.** Pulsa el cruce donde quieres empezar.
4. **Elige la meta.** Pulsa otro cruce, o vuelve a pulsar la salida para
   terminar donde empezaste (circuito).
5. **Recorta y calcula.** Pulsa las calles que *no* quieras cubrir (se ponen
   grises). Luego pulsa el botón azul: se calculan y comparan las rutas en la
   tabla *Resumen de la ruta*. Pulsa **Descargar ruta (.gpx)**.

## 2. Colores del mapa

| Color | Significado |
|-------|-------------|
| Verde lima | Calle que hay que cubrir |
| Rojo | Calle que ya has corrido (del historial GPX importado) |
| Gris | Calle quitada por ti; la ruta puede *cruzarla* si hace falta, pero no es obligatoria |
| Verde brillante (tras un intento fallido) | Calle inalcanzable desde tu salida. Restaura una calle que conecte o cambia la salida |
| Ruta (degradado rojo → verde) | El resultado, ordenado de salida (punto rojo) a meta (punto azul) |

## 3. Opciones de ruta

Tras calcular, el *Resumen de la ruta* muestra **cuatro rutas candidatas** lado
a lado. Pulsa una columna para elegirla: es la que se dibuja y descarga.

| Columna | Qué optimiza | Velocidad |
|---------|--------------|-----------|
| **Distancia, heurística** | Longitud total mínima; muy buena pero no garantizada perfecta | instantánea |
| **Distancia, exacta** | Longitud total demostrablemente mínima (emparejamiento «blossom» de Edmonds) | instantánea en pueblos, más lenta en zonas enormes |
| **Desnivel, heurística** | Cubre lo mismo, pero cuando debe repetir calles prefiere las llanas | instantánea |
| **Desnivel, exacta** | Lo anterior con optimización exacta | de instantánea a lenta |

Filas: *Longitud de la ruta*, *Desnivel positivo* (subida total), *Eficiencia*
(longitud de calles ÷ longitud de ruta; 100 % = no se repite ninguna calle) y
*Tiempo de cálculo*.

> Las rutas de **desnivel** necesitan altitudes del servicio Open-Meteo y
> aparecen unos segundos después. Si el servicio está saturado verás
> «altitudes…» o «n/a»; inténtalo de nuevo en un minuto.

## 4. Barra de herramientas

| Control | Qué hace |
|---------|----------|
| **Reiniciar** | Empieza de cero |
| **↩ Restaurar zona anterior** | Recarga tu último polígono, salida/meta y calles recortadas (se guarda solo en tu navegador) |
| **Importar historial GPX** | Elige archivos `.gpx`/`.tcx` de carreras ya hechas. Las calles que cubren se marcan en rojo |
| **Quitar calles ya corridas** | Quita las calles rojas de la lista de pendientes |
| **✏️ Dibujar calles** | Añade una calle que falte en OpenStreetMap: pulsa un nodo y luego el punto final. Clic derecho borra la calle dibujada más cercana |
| **Reproducir ruta / Exportar vídeo** | Anima la ruta; con el segundo la descargas en `.webm` |
| **Salida / Meta lat, lon** | Escribe coordenadas en vez de pulsar. Si rellenas *las dos*, pueden estar **fuera** del polígono y la ruta llega por calles reales |
| **Ignorar parques** | Excluye caminos, sendas, pistas, escaleras y carriles bici |
| **🎯 Coordenadas con clic** | Púlsalo y luego pulsa el mapa: se copian esas coordenadas |
| **📍 Mi ubicación** | Copia tus coordenadas actuales |
| Estilo de mapa (abajo a la derecha) | Calles, OSM, ciclismo, topográfico, satélite |
| Idioma (arriba a la derecha) | English / Español |

**Ratón:** clic izquierdo selecciona/recorta; **clic derecho** sobre una calle gris la restaura.

## 5. Recetas habituales

- **«Cubrir todo mi pueblo y acabar donde empecé».** Dibuja el pueblo → cruce de
  salida → pulsa el mismo cruce como meta → calcula.
- **«No quiero volver al punto de partida».** Elige otro cruce como meta. La
  ruta es un camino abierto (suele ser más corta, porque no debe regresar).
- **«Solo las calles que aún no he corrido».** *Importar historial GPX* →
  *Quitar calles ya corridas* → salida/meta → calcula. Repite tras cada salida.
- **«Menos cuestas».** Calcula, elige una columna de *Desnivel* y compara su
  *Desnivel positivo* con el de *Distancia*.
- **«Dividir un pueblo grande en salidas».** Dibuja un polígono menor por salida
  o recorta las calles de otros días.
- **«Salir desde mi casa, fuera de la zona».** Rellena *Salida* y *Meta*.

## 6. Qué se incluye de OpenStreetMap

Se incluyen calles, carreteras, caminos y calles peatonales (`highway=*`). Se
excluyen automáticamente autopistas, vías rápidas (trunk), vías de servicio,
circuitos, vías propuestas o en construcción, ascensores, pasos de cebra,
aceras, vías prohibidas a peatones y accesos privados. Las rotondas cuentan como
una sola calle y los bulevares (dos calzadas) también.

## 7. Límites y consejos

- Zonas de más de ~25 km² muestran un aviso (lentas o rechazadas por el servidor).
- OpenStreetMap puede estar incompleto; usa la herramienta de dibujo.
- La ruta sigue las calles tal como están mapeadas: comprueba siempre que sea
  segura (tráfico, caminos cerrados, propiedad privada).

## 8. Aún no disponible

Mira la hoja de ruta del [README](../README.md#hoja-de-ruta-roadmap): un modo de
calles de sentido único (coche/bici) en la interfaz y las restricciones de giro son
ideas, **no** implementadas.
