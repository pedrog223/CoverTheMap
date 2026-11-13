/**
 * Minimal internationalisation (i18n) helper.
 *
 * "i18n" is just shorthand for "internationalisation": making the interface
 * available in several languages. Every user-visible string lives in the
 * `MESSAGES` table below, once per language. The rest of the code asks for a
 * string by key with `t("key")` instead of hard-coding English text.
 *
 * To add a language: copy one of the blocks in MESSAGES, translate the values,
 * and add its code to `SUPPORTED`.
 *
 * Placeholders such as {n} are replaced with the values passed to `t()`:
 *   t("unreachable", { n: 3 })  ->  "3 street(s) can't be reached ..."
 */

const SUPPORTED = ["en", "es"]
const STORAGE_KEY = "coverthemap.lang"

const MESSAGES = {
  en: {
    // --- navigation bar & static buttons ---
    "nav.restart": "Restart",
    "nav.restore": "↩ Restore previous area",
    "nav.restore.title":
      "Reload the area, start/end and trimmed streets from your previous session",
    "nav.restoreN": "↩ Restore previous area ({n} trimmed)",
    "nav.importGpx": "Import GPX history",
    "nav.gpxCount": "GPX: {n} tracks",
    "nav.trimRun": "Remove ridden streets",
    "nav.trimRun.title":
      "Remove from the route every street already covered by the imported GPX/TCX history",
    "nav.draw": "✏️ Draw streets",
    "nav.draw.title":
      "Only during the trim phase: click to enable, then click a node and click the end point to create a new street. Right click deletes the nearest drawn street.",
    "nav.drawFinish": "✓ Finish drawing",
    "nav.play": "Play route",
    "nav.exportVideo": "Export video",
    "nav.downloadVideo": "Download video (.webm)",
    "nav.source": "Source code",
    "nav.language": "Language",
    // --- coordinate / option bar ---
    "opt.start": "Start lat, lon",
    "opt.start.title":
      "Start coordinates (lat, lon). If you fill in both start and end, the click selection is skipped.",
    "opt.end": "End lat, lon",
    "opt.end.title": "End coordinates (lat, lon).",
    "opt.parks": "Ignore parks",
    "opt.parks.title": "Exclude park paths from the map",
    // --- floating map widgets ---
    "map.zoomIn": "Zoom in",
    "map.zoomOut": "Zoom out",
    "map.pick": "🎯 Coords by map click",
    "map.pick.title": "Click, then click a point on the map to copy its coordinates",
    "map.picking": "🎯 Click on the map…",
    "map.copied": "✓ copied: {coord}",
    "map.locate": "📍 My location — click to copy",
    "map.locate.title": "Click to copy your current location",
    "map.locating": "📍 locating…",
    "map.geoUnsupported": "✗ geolocation not supported",
    "map.geoDenied": "✗ location permission denied",
    "map.geoFailed": "✗ couldn't get location",
    "map.basemap.title": "Change the map style",
    "map.base.osm": "OpenStreetMap",
    "map.base.esristreet": "Street map (Esri)",
    "map.base.cyclosm": "Cycling (CyclOSM)",
    "map.base.opentopo": "Topographic",
    "map.base.satellite": "Satellite (Esri)",
    "map.base.sentinel2": "Satellite (Sentinel-2)",
    // --- main action button (wording follows the workflow step) ---
    "action.createPolygon": "Create a polygon, then click here",
    "action.validatePolygon": "Validate the polygon",
    "action.loading": "Loading map data…",
    "action.loadingServer": "Loading map data… (server {i}/{total})",
    "action.busy": "Map servers are busy — click to retry",
    "action.trim": "Click on roads to trim, then click here",
    "action.pickStart": "Click on start of route",
    "action.pickEnd": "Click on end of route (or the start to loop back)",
    "action.drawing": "Drawing streets: click a node, then the end point",
    "action.computing": "Computing routes…",
    "action.calculating": "Calculating… Click to stop when satisfied",
    "action.download": "Download route (.gpx)",
    "action.unreachableFailed":
      "{n} street(s) can't be reached from the start — shown in green. Restore a connecting street (right-click) or clear the start/end, then try again",
    "action.cannotComplete":
      "The route can't be completed from this start/end — restore a connecting street or clear the start/end, then try again",
    "action.unreachableStill":
      "{n} street(s) still can't be reached from the start — shown in green. Restore a connecting street (right-click) or clear the start/end, then click to trace",
    "action.areaLarge":
      "This area is large ({km2} km²) and may be slow or rejected by the map server. Zoom in or draw a smaller polygon, or click again to continue anyway.",
    // --- summary table ---
    "sum.title": "Route summary",
    "sum.hint":
      "Click a column to choose it: the highlighted one is drawn and downloaded.",
    "sum.shared": "Streets covered: {n}  ·  Total street length: {km} km",
    "sum.length": "Route length",
    "sum.gain": "Elevation gain",
    "sum.efficiency": "Efficiency",
    "sum.time": "Compute time",
    "sum.case.distance": "Distance",
    "sum.case.elevation": "Elevation",
    "sum.case.heuristic": "heuristic",
    "sum.case.exact": "exact",
    "sum.computing": "computing…",
    "sum.elevationWait": "elevation…",
    // --- legend ---
    "legend.streets": "Streets",
    "legend.toCover": "To cover",
    "legend.ridden": "Already ridden (GPX)",
    "legend.discarded": "Discarded / access",
    "legend.route": "Route",
    "legend.order": "Order: start → end",
    "legend.start": "Start",
    "legend.end": "End",
    // --- on-canvas graph / report ---
    "graph.status":
      "Routes tried: {tried}, Length of all roads: {all}km, Best route: {best}km ({eff}%)",
    "report.title": "Route Summary",
    "report.roads": "Total roads covered",
    "report.allLength": "Total length of all roads",
    "report.finalLength": "Length of final route",
    "report.efficiency": "Efficiency",
    "nav.help":
      "? Help",
    "welcome.title":
      "Welcome to CoverTheMap",
    "welcome.intro":
      "Plan the shortest route that covers every street of an area, then download it as a GPX file for your watch or phone.",
    "welcome.stepsTitle":
      "How to use it",
    "welcome.step1":
      "Draw the area. Click points on the map to draw a polygon around your town or neighbourhood; double-click to close it. Then press the blue button at the top.",
    "welcome.step2":
      "Wait for the streets. They are downloaded from OpenStreetMap; it can take up to a minute when the server is busy.",
    "welcome.step3":
      "Choose start and end. Click a street junction to start, then another one to finish (or the same one again to make a loop). You can also type coordinates in the two boxes at the top; they may be outside the area.",
    "welcome.step4":
      "Trim the streets (optional). Click any street you do not want to cover; it turns grey. Right-click a grey street to bring it back. You can also import your GPX history to remove the streets you have already run.",
    "welcome.step5":
      "Compute and download. Press the blue button, compare the four routes in the table, click a column to choose one, and press Download route (.gpx).",
    "welcome.controlsTitle":
      "What is what",
    "welcome.mouse":
      "Mouse: left-click selects (points, junctions, streets to trim); right-click restores a trimmed street; drag to move the map; scroll wheel or the + / − buttons to zoom.",
    "welcome.topBar":
      "Top bar: Import GPX history and Remove ridden streets (skip streets you already ran), Draw streets (add a missing street), Play route / Export video (animate the result), Ignore parks (leave out paths and footways), and the Start / End coordinate boxes.",
    "welcome.bottom":
      "On the map: Coords by map click copies the coordinates of a point you click; My location copies where you are; the selector at the bottom right changes the map style.",
    "welcome.more":
      "Full guide:",
    "welcome.guideLink":
      "user guide",
    "welcome.creditsLink":
      "credits",
    "welcome.disclaimer":
      "This is an amateur hobby project by pedrog223. It works well for me, but it may contain errors and the map data can be incomplete: always check that a route is safe before running or riding it. It is based on RunEveryStreet by solipsia and clementh44.",
    "welcome.dontShow":
      "Don't show this again",
    "welcome.start":
      "Start",
  },

  es: {
    "nav.restart": "Reiniciar",
    "nav.restore": "↩ Restaurar zona anterior",
    "nav.restore.title":
      "Recarga la zona, la salida/meta y las calles recortadas de tu sesión anterior",
    "nav.restoreN": "↩ Restaurar zona anterior ({n} recortadas)",
    "nav.importGpx": "Importar historial GPX",
    "nav.gpxCount": "GPX: {n} recorridos",
    "nav.trimRun": "Quitar calles ya corridas",
    "nav.trimRun.title":
      "Elimina de la ruta todas las calles ya cubiertas por el historial GPX/TCX importado",
    "nav.draw": "✏️ Dibujar calles",
    "nav.draw.title":
      "Solo en la fase de recorte: actívalo, pulsa un nodo y luego el punto final para crear una calle nueva. El clic derecho borra la calle dibujada más cercana.",
    "nav.drawFinish": "✓ Terminar de dibujar",
    "nav.play": "Reproducir ruta",
    "nav.exportVideo": "Exportar vídeo",
    "nav.downloadVideo": "Descargar vídeo (.webm)",
    "nav.source": "Código fuente",
    "nav.language": "Idioma",
    "opt.start": "Salida lat, lon",
    "opt.start.title":
      "Coordenadas de salida (lat, lon). Si rellenas salida y meta, se omite la selección con clics.",
    "opt.end": "Meta lat, lon",
    "opt.end.title": "Coordenadas de meta (lat, lon).",
    "opt.parks": "Ignorar parques",
    "opt.parks.title": "Excluye los caminos de parques del mapa",
    "map.zoomIn": "Acercar",
    "map.zoomOut": "Alejar",
    "map.pick": "🎯 Coordenadas con clic",
    "map.pick.title": "Pulsa aquí y luego un punto del mapa para copiar sus coordenadas",
    "map.picking": "🎯 Pulsa en el mapa…",
    "map.copied": "✓ copiado: {coord}",
    "map.locate": "📍 Mi ubicación — pulsa para copiar",
    "map.locate.title": "Pulsa para copiar tu ubicación actual",
    "map.locating": "📍 localizando…",
    "map.geoUnsupported": "✗ geolocalización no disponible",
    "map.geoDenied": "✗ permiso de ubicación denegado",
    "map.geoFailed": "✗ no se pudo obtener la ubicación",
    "map.basemap.title": "Cambiar el estilo del mapa",
    "map.base.osm": "OpenStreetMap",
    "map.base.esristreet": "Mapa de calles (Esri)",
    "map.base.cyclosm": "Ciclismo (CyclOSM)",
    "map.base.opentopo": "Topográfico",
    "map.base.satellite": "Satélite (Esri)",
    "map.base.sentinel2": "Satélite (Sentinel-2)",
    "action.createPolygon": "Dibuja un polígono y pulsa aquí",
    "action.validatePolygon": "Validar el polígono",
    "action.loading": "Cargando datos del mapa…",
    "action.loadingServer": "Cargando datos del mapa… (servidor {i}/{total})",
    "action.busy": "Los servidores del mapa están ocupados — pulsa para reintentar",
    "action.trim": "Pulsa las calles que quieras recortar y luego aquí",
    "action.pickStart": "Pulsa el punto de salida de la ruta",
    "action.pickEnd": "Pulsa el punto de meta (o la salida para volver al inicio)",
    "action.drawing": "Dibujando calles: pulsa un nodo y luego el punto final",
    "action.computing": "Calculando rutas…",
    "action.calculating": "Calculando… Pulsa para parar cuando estés conforme",
    "action.download": "Descargar ruta (.gpx)",
    "action.unreachableFailed":
      "{n} calle(s) no se pueden alcanzar desde la salida — en verde. Restaura una calle que conecte (clic derecho) o borra salida/meta e inténtalo de nuevo",
    "action.cannotComplete":
      "No se puede completar la ruta con esta salida/meta — restaura una calle que conecte o borra salida/meta e inténtalo de nuevo",
    "action.unreachableStill":
      "{n} calle(s) siguen sin poder alcanzarse desde la salida — en verde. Restaura una calle que conecte (clic derecho) o borra salida/meta y pulsa para trazar",
    "action.areaLarge":
      "La zona es grande ({km2} km²) y puede ser lenta o ser rechazada por el servidor del mapa. Acércate o dibuja un polígono menor, o pulsa de nuevo para continuar igualmente.",
    "sum.title": "Resumen de la ruta",
    "sum.hint":
      "Pulsa una columna para elegirla: la resaltada es la que se dibuja y se descarga.",
    "sum.shared": "Calles cubiertas: {n}  ·  Longitud total de calles: {km} km",
    "sum.length": "Longitud de la ruta",
    "sum.gain": "Desnivel positivo",
    "sum.efficiency": "Eficiencia",
    "sum.time": "Tiempo de cálculo",
    "sum.case.distance": "Distancia",
    "sum.case.elevation": "Desnivel",
    "sum.case.heuristic": "heurística",
    "sum.case.exact": "exacta",
    "sum.computing": "calculando…",
    "sum.elevationWait": "altitudes…",
    "legend.streets": "Calles",
    "legend.toCover": "Por cubrir",
    "legend.ridden": "Ya recorridas (GPX)",
    "legend.discarded": "Descartadas / acceso",
    "legend.route": "Ruta",
    "legend.order": "Orden: salida → meta",
    "legend.start": "Salida",
    "legend.end": "Meta",
    "graph.status":
      "Rutas probadas: {tried}, Longitud de todas las calles: {all}km, Mejor ruta: {best}km ({eff}%)",
    "report.title": "Resumen de la ruta",
    "report.roads": "Calles cubiertas",
    "report.allLength": "Longitud total de calles",
    "report.finalLength": "Longitud de la ruta final",
    "report.efficiency": "Eficiencia",
    "nav.help":
      "? Ayuda",
    "welcome.title":
      "Bienvenido a CoverTheMap",
    "welcome.intro":
      "Planifica la ruta más corta que recorre todas las calles de una zona y descárgala como archivo GPX para tu reloj o móvil.",
    "welcome.stepsTitle":
      "Cómo se usa",
    "welcome.step1":
      "Dibuja la zona. Pulsa puntos en el mapa para dibujar un polígono alrededor de tu pueblo o barrio; doble clic para cerrarlo. Luego pulsa el botón azul de arriba.",
    "welcome.step2":
      "Espera a las calles. Se descargan de OpenStreetMap; puede tardar hasta un minuto si el servidor está ocupado.",
    "welcome.step3":
      "Elige salida y meta. Pulsa un cruce para empezar y otro para terminar (o el mismo otra vez para hacer un circuito). También puedes escribir coordenadas en las dos casillas de arriba; pueden estar fuera de la zona.",
    "welcome.step4":
      "Recorta calles (opcional). Pulsa las calles que no quieras cubrir; se ponen grises. Clic derecho sobre una calle gris la recupera. También puedes importar tu historial GPX para quitar las calles que ya has corrido.",
    "welcome.step5":
      "Calcula y descarga. Pulsa el botón azul, compara las cuatro rutas de la tabla, pulsa una columna para elegirla y pulsa Descargar ruta (.gpx).",
    "welcome.controlsTitle":
      "Qué es cada cosa",
    "welcome.mouse":
      "Ratón: el clic izquierdo selecciona (puntos, cruces, calles a recortar); el clic derecho recupera una calle recortada; arrastra para mover el mapa; rueda o botones + / − para el zoom.",
    "welcome.topBar":
      "Barra superior: Importar historial GPX y Quitar calles ya corridas (omiten calles ya hechas), Dibujar calles (añade una calle que falta), Reproducir ruta / Exportar vídeo (animan el resultado), Ignorar parques (deja fuera caminos y sendas) y las casillas de coordenadas de salida / meta.",
    "welcome.bottom":
      "En el mapa: Coordenadas con clic copia las coordenadas del punto que pulses; Mi ubicación copia dónde estás; el selector de abajo a la derecha cambia el estilo del mapa.",
    "welcome.more":
      "Guía completa:",
    "welcome.guideLink":
      "guía de uso",
    "welcome.creditsLink":
      "créditos",
    "welcome.disclaimer":
      "Es un proyecto de afición, amateur, de pedrog223. A mí me funciona bien, pero puede tener errores y los datos del mapa pueden estar incompletos: comprueba siempre que una ruta sea segura antes de correrla o recorrerla en bici. Está basado en RunEveryStreet de solipsia y clementh44.",
    "welcome.dontShow":
      "No volver a mostrar",
    "welcome.start":
      "Empezar",
  },
}

/** Picks the initial language: the saved choice, otherwise English. */
function detectLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (SUPPORTED.includes(saved)) return saved
  } catch (e) {
    /* storage unavailable — ignore */
  }
  return "en" // English by default; the selector in the nav bar changes it
}

let currentLanguage = detectLanguage()

/** Returns the active language code ("en" or "es"). */
export function getLanguage() {
  return currentLanguage
}

/**
 * Translates a key, filling {placeholders} from `vars`.
 * Falls back to English, then to the key itself, so a missing translation
 * never breaks the interface.
 *
 * @param {string} key
 * @param {Object<string, string|number>} [vars]
 * @returns {string}
 */
export function t(key, vars) {
  const table = MESSAGES[currentLanguage] || MESSAGES.en
  let text = table[key] != null ? table[key] : MESSAGES.en[key]
  if (text == null) return key
  if (vars) {
    for (const name of Object.keys(vars)) {
      text = text.split("{" + name + "}").join(String(vars[name]))
    }
  }
  return text
}

/**
 * Translates every element in the page that declares what it needs:
 *   data-i18n="key"              -> element text
 *   data-i18n-title="key"        -> title (tooltip)
 *   data-i18n-placeholder="key"  -> input placeholder
 *   data-i18n-aria="key"         -> aria-label
 * Call again after changing language.
 */
export function applyTranslations() {
  document.documentElement.lang = currentLanguage
  for (const el of document.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.getAttribute("data-i18n"))
  }
  for (const el of document.querySelectorAll("[data-i18n-title]")) {
    el.title = t(el.getAttribute("data-i18n-title"))
  }
  for (const el of document.querySelectorAll("[data-i18n-placeholder]")) {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"))
  }
  for (const el of document.querySelectorAll("[data-i18n-aria]")) {
    el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")))
  }
}

/**
 * Switches language, remembers the choice and reloads the page so every
 * dynamically-built string (buttons, tables, canvas text) is rebuilt.
 */
export function setLanguage(lang) {
  if (!SUPPORTED.includes(lang)) return
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch (e) {
    /* storage unavailable — choice just won't persist */
  }
  currentLanguage = lang
  window.location.reload()
}
