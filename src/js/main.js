/**
 * CoverTheMap: main application (map, interface and state machine).
 *
 * Derived from RunEveryStreet by solipsia (https://github.com/solipsia/RunEveryStreet)
 * and its fork by clementh44. Licensed under GPL-3.0-or-later; see CREDITS.md.
 *
 * Workflow (the `mode` variable): choosemap -> selectnode (start) -> selectend ->
 * trim -> solve. See docs/ALGORITHMS.md for the overall design.
 */
import Node from "./Node.js"
import Edge from "./Edge.js"
import Route from "./Route.js"
import { addGpxFiles, allGpxPoints, gpxTracks, matchGpxToEdges } from "./GpxImport.js"
import { solvePostman } from "./PostmanSolver.js"
import { fetchElevations, elevationGain } from "./Elevation.js"
import { t, applyTranslations, setLanguage, getLanguage } from "./i18n.js"
import { getArea } from "ol/sphere"
import Map from "ol/Map"
import XYZ from "ol/source/XYZ"
import VectoreSource from "ol/source/Vector"
import VectorLayer from "ol/layer/Vector"
import Feature from "ol/Feature"
import LineString from "ol/geom/LineString"
import Polygon from "ol/geom/Polygon"
import Stroke from "ol/style/Stroke"
import Fill from "ol/style/Fill"
import Style from "ol/style/Style"
import View from "ol/View"
import TileLayer from "ol/layer/Tile"
import Draw from "ol/interaction/Draw"
import { fromLonLat, toLonLat, transformExtent } from "ol/proj"
import { defaults, ZoomSlider } from "ol/control"
import { Modal } from "bootstrap"
import "bootstrap/dist/css/bootstrap.min.css"
import 'ol/ol.css'
import p5 from "p5"

const vectorSource = new VectoreSource({
    wrapX: false,
  })
  const vector = new VectorLayer({
    source: vectorSource,
    // Custom style for the drawn area. OpenLayers' DEFAULT polygon style fills
    // the interior with 40% white, which washes out the (light) basemap so much
    // that the streets inside the drawn area become hard to see. Use a clear
    // blue outline with a barely-there fill so the map and streets stay visible.
    style: new Style({
      stroke: new Stroke({ color: "rgba(60, 130, 230, 0.95)", width: 2 }),
      fill: new Fill({ color: "rgba(60, 130, 230, 0.06)" }),
    }),
  })
  const gpxSource = new VectoreSource({
    wrapX: false,
  })
  const gpxLayer = new VectorLayer({
    source: gpxSource,
    style: new Style({
      stroke: new Stroke({ color: "rgba(220, 30, 30, 0.7)", width: 2 }),
    }),
  })

  // Selectable basemaps (the dropdown swaps this layer's source). A mix of
  // styles from several independent providers — OpenStreetMap.org,
  // CyclOSM (openstreetmap.fr), OpenTopoMap and Esri. All checked to load.
  const OSM_ATTR =
    '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  const ESRI_ATTR =
    'Tiles © <a href="https://www.esri.com">Esri</a> and the GIS community'
  const CYCLOSM_ATTR = "CyclOSM | " + OSM_ATTR
  const OPENTOPO_ATTR =
    '© <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA), ' + OSM_ATTR
  const SENTINEL_ATTR =
    'Sentinel-2 cloudless © <a href="https://s2maps.eu">EOX IT-Services GmbH</a>'
  function makeBasemapSource(id) {
    switch (id) {
      case "osm":
      default:
        return new XYZ({
          url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          attributions: OSM_ATTR,
          maxZoom: 19,
          transition: 0,
        })
      case "esristreet":
        return new XYZ({
          url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
          attributions: ESRI_ATTR,
          maxZoom: 19,
          transition: 0,
        })
      case "sentinel2":
        return new XYZ({
          url: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg",
          attributions: SENTINEL_ATTR,
          maxZoom: 17,
          transition: 0,
        })
      case "cyclosm":
        return new XYZ({
          url: "https://{a-c}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
          attributions: CYCLOSM_ATTR,
          maxZoom: 20,
          transition: 0,
        })
      case "opentopo":
        return new XYZ({
          url: "https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png",
          attributions: OPENTOPO_ATTR,
          maxZoom: 17,
          transition: 0,
        })
      case "satellite":
        return new XYZ({
          url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          attributions: ESRI_ATTR,
          maxZoom: 19,
          transition: 0,
        })
    }
  }
  var basemapLayer = new TileLayer({
    source: makeBasemapSource("osm"),
    // opacity MUST stay 1 (partial opacity uses a slower intermediate-canvas
    // compositing path) and preload keeps parent tiles ready while zooming.
    opacity: 1,
    preload: 2,
  })

  export var openlayersmap = new Map({
    //OpenLayers https://openlayers.org
    target: "OSMmap",
    layers: [
      basemapLayer,
      vector,
      gpxLayer,
    ],
    view: new View({
      center: fromLonLat([5.95, 47.26]),
      zoom: 12,
      maxZoom: 19,
      // snap to integer zoom levels: tiles stay at native resolution and each
      // level is cached, so re-zooming to a visited level shows instantly
      // (no black reload flash)
      constrainResolution: true,
    }),
    controls: defaults().extend([new ZoomSlider()]),
    // Render the map at CSS resolution (1x) instead of the screen's device
    // pixel ratio. THIS is the fix for "the map goes grey at full screen but
    // works in a narrow window": this machine has no working GPU (Chrome falls
    // back to the "Microsoft Basic Render Driver" software renderer), so
    // compositing the tile canvas is done on the CPU. At the native devicePixel
    // ratio (~1.375) a full-screen map canvas is ~2660 px wide (~3.4M pixels)
    // and the software compositor can't paint it in time, so it stays blank and
    // the grey backdrop shows through. At pixelRatio 1 the canvas is ~1.9× fewer
    // pixels, so the CPU keeps up and the map paints even full screen. The map
    // is a hair softer on HiDPI screens but that is invisible next to the bug.
    pixelRatio: 1,
  })

  // On first paint the map is created before the header has reached its final
  // height (the logo image / web font load after the script runs), so
  // OpenLayers computes a stale frame and only requests the tiles for a small
  // central area — the rest of the screen stays on the backdrop colour (this
  // was the "map goes black / stays black when zooming" bug: the map only ever
  // covered part of the viewport). Re-measuring the viewport with updateSize()
  // makes OL recompute the frame and fetch the missing tiles. Do it once the
  // page has fully loaded, on every resize, and a couple of times shortly after
  // load to catch late layout shifts. updateSize() is cheap (measure + flag a
  // redraw) so calling it a few extra times is harmless.
  var fixMapSize = function () {
    openlayersmap.updateSize()
    // updateSize() only schedules a redraw when the measured size actually
    // changed; here the size is often already "correct" but the initial frame
    // was rendered stale, so force a synchronous render to re-request the tiles
    // for the whole viewport.
    openlayersmap.renderSync()
  }
  window.addEventListener("load", fixMapSize)
  window.addEventListener("resize", fixMapSize)
  setTimeout(fixMapSize, 300)
  setTimeout(fixMapSize, 1200)

  // Force a repaint shortly after tiles finish downloading. OpenLayers normally
  // re-renders on tile load through requestAnimationFrame, but browsers heavily
  // THROTTLE rAF while a lot of JS is running (e.g. right after a zoom, or in a
  // busy tab), so that repaint can be skipped and the freshly loaded tiles never
  // actually appear — the map stays on the backdrop and "never recovers even if
  // you wait". Rendering from a setTimeout (which is not rAF-throttled), batched
  // to once per tick, makes the tiles show up regardless of rAF health. The
  // setTimeout also defers the render out of OpenLayers' tile-load handler, so
  // it never re-enters the renderer.
  var tileRepaintQueued = false
  openlayersmap
    .getLayers()
    .item(0)
    .getSource()
    .on("tileloadend", function () {
      if (tileRepaintQueued) {
        return
      }
      tileRepaintQueued = true
      setTimeout(function () {
        tileRepaintQueued = false
        openlayersmap.renderSync()
      }, 0)
    })

  // Ultimate safety net: a plain timer that keeps the map painted, completely
  // independent of requestAnimationFrame. This is THE fix for the long-standing
  // "map goes grey/black on zoom, worse the closer you are, and doesn't recover"
  // bug: the tiles DO download, but OpenLayers repaints them through rAF, which
  // the browser throttles hard during zooming — so the loaded tiles are simply
  // never drawn and the grey backdrop (with only the street overlay) is left on
  // screen. A timer runs even when rAF is throttled, so re-measuring the
  // viewport (in case the frame size went stale) and forcing a synchronous
  // render a few times a second guarantees the tiles actually appear. renderSync
  // is a no-op-cheap when nothing changed, and there is no event feedback here
  // so it cannot loop.
  setInterval(function () {
    openlayersmap.updateSize()
    openlayersmap.renderSync()
  }, 250)

  // debug helpers to inspect and drive the app from the browser console
  window.RESdebug = {
    map: openlayersmap,
    fromLonLat: fromLonLat,
    setView: function (lon, lat, zoom) {
      openlayersmap.getView().setCenter(fromLonLat([lon, lat]))
      openlayersmap.getView().setZoom(zoom)
    },
    state: function () {
      return {
        nodes: nodes,
        edges: edges,
        bestroute: bestroute,
        mode: mode,
        startnode: startnode,
        settings: settings,
        totaledgedistance: totaledgedistance,
        iterations: iterations,
        myp5: myp5,
        routeAnimation: routeAnimation,
        videoRecorder: videoRecorder,
        endnode: endnode,
        routes: routes,
        activeRouteKey: activeRouteKey,
        elevationsReady: elevationsReady,
      }
    },
    solvePostman: function (requiredArg, allArg, start, end) {
      return solvePostman(requiredArg, allArg, start, end)
    },
    elevationGain: function (waypoints) {
      return elevationGain(waypoints)
    },
    reachFromStart: function (excludeEdge) {
      return reachFromStart(excludeEdge)
    },
    markUnreachableRequired: function () {
      return markUnreachableRequired()
    },
    stitchExternalEndpoints: function () {
      return stitchExternalEndpoints()
    },
  }
  
  var canvas
  var mapHeight
  var mapWidth
  var windowX, windowY
  var headerHeight
  var polygonPadding = 40
  let txtoverpassQuery
  var OSMxml
  var numnodes, numways
  var nodes
  var minlat = Infinity,
    maxlat = -Infinity,
    minlon = Infinity,
    maxlon = -Infinity
  var nodes = [],
    edges = []
export var mapminlat = Infinity,
    mapmaxlat = -Infinity,
    mapminlon = Infinity,
    mapmaxlon = -Infinity
  var totaledgedistance = 0
  var closestnodetomouse = -1
  var closestedgetomouse = -1
  var startnode, currentnode
  var selectnodemode = 2,
    solveRESmode = 4,
    choosemapmode = 1,
    trimmode = 3,
    downloadGPXmode = 5,
    selectendmode = 6,
    brushmode = 7
  var mode
  var remainingedges
  var debugsteps = 0
  var bestdistance
  var currentroute
  export var bestroute
  var bestarea
  var bestdoublingsup
  export var showSteps = false
  var showRoads = true
  var iterations, iterationsperframe
  var actionButton = document.querySelector("#action-button")
  var margin
  var starttime
  var efficiencyhistory = [],
    distancehistory = []
  var totalefficiencygains = 0
  var isTouchScreenDevice = false
  var totaluniqueroads
  var olDraw
  var olDrawCoordinates
  var polygon
export var polygonminX = Infinity,
    polygonmaxX = -Infinity,
    polygonminY = Infinity,
    polygonmaxY = -Infinity
  var settings = {
    category: "walk", //walk = no oneway ; car = oneway ; bicycle = oneway:bicycle
    oneway: false,
  }
  var stack = []
  var stack2 = []
  var ignoreParks = false
  var polygonLonLat = [] // drawn polygon vertices [lon, lat] (required area)
  var useExternalEndpoints = false
  var elevationsReady = false
  var elevationState = "loading" // "loading" | "ready" | "failed"
  var routes = {} // case key -> { route, ms } | "pending" | null
  var activeRouteKey = "dist-exact"
  var routeAnimation = null
  var videoRecorder = null
  var videoRecorderTimer = null
  var recordedVideoBlob = null
  var endnode = null
  // "Draw streets" brush: draw new streets by clicking a start node then an
  // end point. drawFromNode holds the pending start while a street is in
  // progress; brushReturnMode is the mode to restore when leaving the brush.
  var drawFromNode = null
  var brushReturnMode = trimmode
  var drawnNodeSeq = 0
  var drawnWaySeq = 0
  // "Coords by map click": when true, the next map click copies its lat/lon
  var pickingCoord = false
  // set of edge keys to re-trim after Overpass loads (session restore)
  var pendingRestoreTrims = null
  // true while unreachable required streets are highlighted (green) after a
  // solve aborted because they can't be reached from the start
  var showingUnreachable = false

function init() {
      applyTranslations()
      setupWelcomeWindow()
      // keep the toolbar buttons in step with the workflow phase
      updateToolbarState()
      setInterval(updateToolbarState, 250)
      const langSelect = document.querySelector("#lang-select")
      langSelect.value = getLanguage()
      langSelect.addEventListener("change", () => setLanguage(langSelect.value))
      if (navigator.geolocation) {
        //if browser shares user GPS location, update map to center on it.
        navigator.geolocation.getCurrentPosition(function (position) {
          openlayersmap
            .getView()
            .setCenter(
              fromLonLat([position.coords.longitude, position.coords.latitude])
            )
        })
      }
      headerHeight = document.getElementById("header").clientHeight
      actionButton.addEventListener("click", actionButtonClicked)
      // our own zoom buttons (OpenLayers' own control sits under the p5 canvas
      // and is unclickable). Positioned just below the header.
      const zoomControls = document.querySelector("#map-zoom")
      zoomControls.style.top = headerHeight + 10 + "px"
      const zoomStep = (delta) => {
        const view = openlayersmap.getView()
        const current = view.getZoom()
        const target = Math.max(
          view.getMinZoom(),
          Math.min(view.getMaxZoom(), Math.round(current) + delta)
        )
        if (target === current) {
          return
        }
        // Instant zoom + forced synchronous render. Animating the zoom relied on
        // requestAnimationFrame and left OpenLayers with a partial frame that
        // showed the backdrop (the "goes black / stays black on zoom" bug);
        // setZoom + renderSync re-requests and paints the whole viewport at once.
        view.setZoom(target)
        openlayersmap.renderSync()
      }
      document.querySelector("#map-zoom-in").addEventListener("click", () => zoomStep(1))
      document.querySelector("#map-zoom-out").addEventListener("click", () => zoomStep(-1))
      document.querySelector("#ignore-parks-toggle").addEventListener("change", function () {
        ignoreParks = this.checked
      })
      // route-case columns are wired dynamically inside populateSummary
      const homeCoord = document.querySelector("#home-coord")
      homeCoord.addEventListener("click", function () {
        const button = this
        const original = button.textContent
        if (!navigator.geolocation) {
          button.textContent = t("map.geoUnsupported")
          setTimeout(() => (button.textContent = original), 1600)
          return
        }
        button.textContent = t("map.locating")
        navigator.geolocation.getCurrentPosition(
          function (pos) {
            const coord = pos.coords.latitude + ", " + pos.coords.longitude
            navigator.clipboard.writeText(coord).catch(() => {})
            button.textContent = t("map.copied", { coord: coord })
            setTimeout(() => (button.textContent = original), 1800)
          },
          function (err) {
            button.textContent =
              err.code === err.PERMISSION_DENIED
                ? t("map.geoDenied")
                : t("map.geoFailed")
            setTimeout(() => (button.textContent = original), 1800)
          },
          { enableHighAccuracy: true, timeout: 10000 }
        )
      })
      // basemap switcher: swap the tile layer's source
      const basemapSelect = document.querySelector("#basemap-select")
      if (basemapSelect) {
        basemapSelect.addEventListener("change", function () {
          basemapLayer.setSource(makeBasemapSource(this.value))
        })
      }
      // "Coords by map click": arm it; the next map click (handled in
      // canvasClicked) copies the clicked point's lat/lon
      const pickCoordButton = document.querySelector("#pick-coord")
      if (pickCoordButton) {
        pickCoordButton.addEventListener("click", function () {
          pickingCoord = true
          this.classList.add("active")
          this.textContent = t("map.picking")
          // stop the polygon-draw interaction from grabbing this click, and show
          // a crosshair so it reads as "pick a point", not "draw"
          if (olDraw) {
            olDraw.setActive(false)
          }
          setPickCursor(true)
        })
      }
      // The pick is handled through OpenLayers' own click event, because the p5
      // overlay that receives the trim/select clicks is NOT on top in every mode
      // (notably before the map data is loaded, when you're choosing the area) —
      // OL always gets the click, so this fires reliably in all modes.
      openlayersmap.on("singleclick", function (evt) {
        if (pickingCoord) {
          finishPickCoord(toLonLat(evt.coordinate))
        }
      })
      // offer to restore the previous session (area + trims) if one was saved
      const savedSession = readSavedSession()
      const restoreButton = document.querySelector("#restore-session")
      if (
        restoreButton &&
        savedSession &&
        savedSession.polygon &&
        savedSession.polygon.length >= 3
      ) {
        const nTrimmed = (savedSession.trimmed || []).length
        restoreButton.textContent = t("nav.restoreN", { n: nTrimmed })
        restoreButton.style.display = ""
        restoreButton.addEventListener("click", restoreSession)
      }
      const gpxButton = document.querySelector("#import-gpx-button")
      const gpxInput = document.querySelector("#gpx-file-input")
      gpxButton.addEventListener("click", () => gpxInput.click())
      gpxInput.addEventListener("change", async () => {
        if (gpxInput.files.length == 0) {
          return
        }
        const newTracks = await addGpxFiles(gpxInput.files)
        gpxInput.value = "" // allow adding more files later
        for (const track of newTracks) {
          const coordinates = track.points.map((point) =>
            fromLonLat([point.lon, point.lat])
          )
          gpxSource.addFeature(new Feature(new LineString(coordinates)))
        }
        gpxButton.textContent = t("nav.gpxCount", { n: gpxTracks.length })
        if (edges.length > 0) {
          // map already loaded: match and show the result on the streets,
          // then drop the superimposed raw trace
          matchGpxToEdges(allGpxPoints(), edges)
          gpxSource.clear()
        }
      })
      document.querySelector("#play-route-button").addEventListener("click", function () {
        startRouteAnimation()
      })
      document.querySelector("#export-video-button").addEventListener("click", function () {
        if (recordedVideoBlob != null) {
          // second click: hand over the finished recording
          const url = URL.createObjectURL(recordedVideoBlob)
          const link = document.createElement("a")
          link.href = url
          link.download = "route_animation.webm"
          link.click()
          setTimeout(() => URL.revokeObjectURL(url), 10000)
          recordedVideoBlob = null
          this.textContent = t("nav.exportVideo")
          return
        }
        startVideoExport()
      })
      document.querySelector("#trim-run-button").addEventListener("click", function () {
        // trim every edge already covered by the imported GPX history
        for (const edge of edges) {
          if (edge.alreadyRun && !edge.trimmed) {
            trimEdge(edge)
          }
        }
        if (mode == trimmode && startnode != null) {
          removeOrphans() // drop parts that are now unreachable
        }
      })
      document.querySelector("#draw-street-button").addEventListener("click", function () {
        if (mode == brushmode) {
          exitBrushMode()
        } else if (mode == trimmode) {
          enterBrushMode()
        }
        // in any other phase the brush isn't applicable, so the click is a no-op
      })
      switch (settings.category) {
        case "walk":
          settings.oneway = false
          break
        case "car":
        case "bicycle":
          settings.oneway = true
          break
    
        default:
          break
      }
      mode = choosemapmode
      olDraw = new Draw({
        source: vectorSource,
        type: "Polygon",
        // match the finished-area style so the basemap stays visible while
        // drawing too (the default draw style fills with 40% white)
        style: new Style({
          stroke: new Stroke({ color: "rgba(60, 130, 230, 0.95)", width: 2 }),
          fill: new Fill({ color: "rgba(60, 130, 230, 0.06)" }),
        }),
      })
      olDraw.on("drawend", function (event) {
        openlayersmap.removeInteraction(olDraw)
        polygon = event.feature.getGeometry()
        olDrawCoordinates = polygon.getCoordinates()[0]
        updateActionButton(t("action.validatePolygon"), false, false)
      })
      openlayersmap.addInteraction(olDraw)
      openlayersmap.on("postrender", function () {
        // keep node canvas positions in sync with the map view (zoom/pan),
        // then repaint the p5 overlay in the SAME frame as the map render so
        // the roads never lag a frame behind the tiles while moving
        for (const node of nodes) {
          node.updatePosition(openlayersmap)
        }
        if (mode != choosemapmode) {
          myp5.redraw()
        }
      })
      updateActionButton(t("action.createPolygon"), true, false)
}

export let myp5 = new p5((sk) => {
    sk.setup = () => {
      console.log("setup")
      // Draw the road overlay at 1x too (not the screen's device pixel ratio).
      // On this software-rendered machine (no GPU) a device-pixel-ratio buffer
      // doubles the pixels the CPU has to composite every frame; 1x keeps the
      // overlay light so it and the map both paint even full screen. Coordinates
      // stay in CSS pixels, so nothing else changes.
      sk.pixelDensity(1)
      mapWidth = sk.windowWidth
      mapHeight = sk.windowHeight - headerHeight
      windowX = sk.windowWidth
      windowY = mapHeight
      canvas = sk.createCanvas(windowX, windowY)
      // Pointer handling: left-drag pans the map (in every mode), a left
      // click without dragging selects a node / trims a road, and the right
      // click only restores a road. p5's mousePressed fires for EVERY button
      // (so a right click used to also trim), so it is replaced with explicit
      // handlers that distinguish button and drag.
      let pointerDown = false
      let dragged = false
      let lastX = 0
      let lastY = 0
      const dragThreshold = 4 // px of movement before a press counts as a pan
      canvas.elt.addEventListener("mousedown", function (event) {
        if (event.button !== 0) {
          return // only the left button pans or selects
        }
        pointerDown = true
        dragged = false
        lastX = event.clientX
        lastY = event.clientY
      })
      window.addEventListener("mousemove", function (event) {
        if (!pointerDown || mode == choosemapmode) {
          return
        }
        const dx = event.clientX - lastX
        const dy = event.clientY - lastY
        if (!dragged && Math.abs(dx) + Math.abs(dy) < dragThreshold) {
          return // still within click tolerance
        }
        dragged = true
        lastX = event.clientX
        lastY = event.clientY
        // pan the OpenLayers view by the pixel delta, then force a synchronous
        // render so postrender reprojects the nodes and repaints the overlay
        // immediately (no lag between tiles and roads while dragging)
        const view = openlayersmap.getView()
        const res = view.getResolution()
        const center = view.getCenter()
        view.setCenter([center[0] - dx * res, center[1] + dy * res])
        openlayersmap.renderSync()
      })
      window.addEventListener("mouseup", function (event) {
        if (event.button !== 0 || !pointerDown) {
          return
        }
        pointerDown = false
        if (!dragged) {
          canvasClicked() // a real click (not a drag): select node / trim road
        }
      })
      canvas.elt.addEventListener("contextmenu", function (event) {
        event.preventDefault()
        if (mode == trimmode) {
          restoreEdgeNearMouse()
        } else if (mode == brushmode) {
          // right click: cancel the street in progress, or delete the nearest
          // hand-drawn street if none is in progress
          if (drawFromNode != null) {
            drawFromNode = null
          } else {
            deleteDrawnEdgeNearMouse()
          }
        }
      })
      canvas.elt.addEventListener(
        "wheel",
        function (event) {
          // The p5 canvas sits on top of the map and would swallow the wheel
          // event, so we forward it as a zoom on the OpenLayers view, anchored
          // under the cursor.
          //
          // This used to ANIMATE the zoom (view.animate), but the animation is
          // driven by requestAnimationFrame and left OpenLayers showing only a
          // partial frame — the rest of the viewport stayed on the backdrop
          // colour and never filled in, which is exactly the "zoom flickers /
          // goes black and never recovers" bug. Zooming INSTANTLY to the next
          // whole level and forcing a synchronous render re-requests and paints
          // the whole viewport in one go: no flicker, no black, and it lands
          // exactly on a native tile resolution every time. Applies in every
          // mode (including while choosing the map / drawing the polygon) so
          // zoom behaves the same everywhere.
          event.preventDefault()
          const view = openlayersmap.getView()
          const current = view.getZoom()
          const target = Math.max(
            view.getMinZoom(),
            Math.min(
              view.getMaxZoom(),
              event.deltaY < 0 ? Math.round(current) + 1 : Math.round(current) - 1
            )
          )
          if (target === current) {
            return
          }
          // keep the point under the cursor fixed while zooming
          const anchor = openlayersmap.getEventCoordinate(event)
          const oldRes = view.getResolution()
          view.setZoom(target)
          const newRes = view.getResolution()
          if (anchor != null && oldRes != null && newRes != null) {
            const c = view.getCenter() // setZoom leaves the centre unchanged
            view.setCenter([
              anchor[0] + (c[0] - anchor[0]) * (newRes / oldRes),
              anchor[1] + (c[1] - anchor[1]) * (newRes / oldRes),
            ])
          }
          openlayersmap.renderSync()
        },
        { passive: false }
      )
      sk.colorMode(sk.HSB)
      iterationsperframe = 1
      margin = 0.1 // don't pull data in the extreme edges of the map
    }
    
    sk.draw = () => {
      //main loop called by the P5.js framework every frame
      if (sk.touches.length > 0) {
        isTouchScreenDevice = true
      } // detect touch screen device such as mobile
      sk.clear()
      if (mode != choosemapmode) {
        if (showRoads) {
          showEdges() //draw connections between nodes
        }
        if (mode == solveRESmode) {
          iterationsperframe = myp5.max(0.01, iterationsperframe - 1 * (5 - myp5.frameRate())) // dynamically adapt iterations per frame to hit 5fps
          for (let it = 0; it < iterationsperframe; it++) {
            iterations++
            let solutionfound = false
            let walkSteps = 0
            // A single walk should cover every REACHABLE required street within a
            // small multiple of the edge count. If it runs far past that, some
            // required streets are unreachable from the start (e.g. the start
            // point is outside the area and disconnected, or trimming split the
            // graph): remainingedges never hits 0, the walk never ends, and
            // waypoints grows until Array.push throws "Invalid array length".
            // Cap it and bail out gracefully instead of freezing/crashing.
            const maxWalkSteps = Math.max(200000, edges.length * 50)
            while (!solutionfound) {
              walkSteps++
              if (walkSteps > maxWalkSteps) {
                mode = trimmode
                showRoads = true
                document.querySelector("#summary").style.display = "none"
                const nUnreachable = markUnreachableRequired()
                showingUnreachable = nUnreachable > 0
                updateActionButton(
                  nUnreachable > 0
                    ? t("action.unreachableFailed", { n: nUnreachable })
                    : t("action.cannotComplete"),
                  false,
                  false
                )
                return // abort this frame; mode is no longer solveRESmode
              }
              //run randomly down least roads until all roads have been run
              if (
                !currentnode.reachableEdges ||
                currentnode.reachableEdges.length === 0
              ) {
                // dead-ended on an isolated node — treat like unreachable above
                walkSteps = maxWalkSteps + 1
                continue
              }
              myp5.shuffle(currentnode.reachableEdges, true) //P5js function
              currentnode.reachableEdges.sort(
                (a, b) => a.travels + edgeWeight(a) - (b.travels + edgeWeight(b))
              ) // walk down the lowest-cost edge; trimmed/already-run edges
              //   cost more so they're only used to connect required streets
              let edgewithleasttravels = currentnode.reachableEdges[0]
              let nextNode = edgewithleasttravels.OtherNodeofEdge(currentnode)
              edgewithleasttravels.travels++
              currentroute.addWaypoint(nextNode, edgewithleasttravels.distance)
              currentnode = nextNode
              if (edgewithleasttravels.travels == 1 && !edgewithleasttravels.trimmed) {
                // first time on a REQUIRED edge (trimmed ones aren't required)
                remainingedges-- //fewer edges that have not been travelled
              }
              if (remainingedges == 0) {
                //once all edges have been traveled, the route is complete. Work out total distance and see if this route is the best so far.
                solutionfound = true
                currentroute.distance += calcdistance(
                  currentnode.lat,
                  currentnode.lon,
                  startnode.lat,
                  startnode.lon
                )
                if (currentroute.distance < bestdistance) {
                  // this latest route is now record
                  bestroute = new Route(null, currentroute)
                  bestdistance = currentroute.distance
                  if (efficiencyhistory.length > 1) {
                    totalefficiencygains +=
                      totaledgedistance / bestroute.distance -
                      efficiencyhistory[efficiencyhistory.length - 1]
                  }
                  efficiencyhistory.push(totaledgedistance / bestroute.distance)
                  distancehistory.push(bestroute.distance)
                }
                currentnode = startnode
                remainingedges = edges.filter((edge) => !edge.trimmed).length
                currentroute = new Route(currentnode, null)
                resetEdges()
              }
            }
          }
        }
        showNodes()
        if (mode == brushmode) {
          drawBrushPreview()
        }
        if (bestroute != null) {
          bestroute.show()
        }
        if (routeAnimation != null && bestroute != null) {
          drawRouteAnimation()
        }
        if (mode == solveRESmode) {
          drawProgressGraph()
        }
        // the route summary is now an HTML panel (showSummary), not drawn here
        //showStatus();
      }
    }
  })



// ---- Session persistence (remember the area + trims across reloads) --------

const SESSION_KEY = "res-session-v1"

/** Stable, order-independent key for an edge. OSM node ids are stable across
 *  loads, so the same street gets the same key next time. */
function edgeKey(edge) {
  const a = edge.from.nodeId,
    b = edge.to.nodeId
  return a < b ? a + "|" + b : b + "|" + a
}

/** Saves the drawn area, start/end, options and the trimmed streets so the
 *  work can be restored after a reload/crash. */
function saveSession() {
  if (!polygonLonLat || polygonLonLat.length < 3) {
    return
  }
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        polygon: polygonLonLat,
        start: document.querySelector("#start-coord").value,
        end: document.querySelector("#end-coord").value,
        ignoreParks: ignoreParks,
        trimmed: edges.filter((e) => e.trimmed).map(edgeKey),
        savedAt: Date.now(),
      })
    )
  } catch (e) {
    /* localStorage full/unavailable — just skip saving */
  }
}

/** The last saved session, or null. */
function readSavedSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

/** Rebuilds the polygon + options from the last saved session, then reloads the
 *  streets; the saved trims are re-applied once they load (pendingRestoreTrims,
 *  handled in parseOverpassResponse). */
function restoreSession() {
  const s = readSavedSession()
  if (!s || !s.polygon || s.polygon.length < 3) {
    return
  }
  const ring = s.polygon.map((c) => fromLonLat([c[0], c[1]]))
  ring.push(ring[0].slice()) // close the ring
  polygon = new Polygon([ring])
  olDrawCoordinates = polygon.getCoordinates()[0]
  vectorSource.clear()
  vectorSource.addFeature(new Feature(polygon))
  if (olDraw) {
    openlayersmap.removeInteraction(olDraw) // leave drawing mode
  }
  document.querySelector("#start-coord").value = s.start || ""
  document.querySelector("#end-coord").value = s.end || ""
  document.querySelector("#ignore-parks-toggle").checked = !!s.ignoreParks
  ignoreParks = !!s.ignoreParks
  pendingRestoreTrims = new Set(s.trimmed || [])
  const rb = document.querySelector("#restore-session")
  if (rb) {
    rb.style.display = "none"
  }
  updateActionButton(t("action.loading"), true, true)
  openlayersmap.getView().fit(polygon, {
    padding: [
      polygonPadding,
      polygonPadding,
      polygonPadding + headerHeight,
      polygonPadding,
    ],
    duration: 800,
    callback: getOverpassData,
  })
}

function getOverpassData() {
  //load nodes and edge map data in XML format from OpenStreetMap via the Overpass API
  canvas.position(0, headerHeight) // start canvas just below logo image
  bestroute = null
  totaluniqueroads = 0
  var LonLat = ""
  polygonLonLat = []
  for (let i = 1; i < olDrawCoordinates.length; i++) {
    //skip the first coordinates (duplicated in the last)
    const coord = toLonLat(olDrawCoordinates[i])
    if (i > 1) {
      LonLat += " "
    }
    polygonLonLat.push([coord[0], coord[1]])
    mapminlat = myp5.min(coord[1], mapminlat)
    mapmaxlat = myp5.max(coord[1], mapmaxlat)
    mapminlon = myp5.min(coord[0], mapminlon)
    mapmaxlon = myp5.max(coord[0], mapmaxlon)

    const pixelCoordinate = openlayersmap.getPixelFromCoordinate(
      olDrawCoordinates[i]
    ) //X = long = -1.... | Y = lat = 47....
    polygonminX = myp5.min(pixelCoordinate[0], polygonminX)
    polygonmaxX = myp5.max(pixelCoordinate[0], polygonmaxX)
    polygonminY = myp5.min(pixelCoordinate[1], polygonminY)
    polygonmaxY = myp5.max(pixelCoordinate[1], polygonmaxY)

    LonLat = LonLat + coord[1] + " " + coord[0]
  }

  // If start & end coordinates are given, query a bounding box that also
  // covers them (so the real streets around those points load and the route
  // reaches them along actual roads, not an invented straight line). The drawn
  // polygon still defines which streets must be COVERED; everything outside it
  // becomes traversable-but-not-required access.
  const startCoord = parseLatLon(document.querySelector("#start-coord").value)
  const endCoord = parseLatLon(document.querySelector("#end-coord").value)
  useExternalEndpoints = startCoord != null && endCoord != null

  let regionSelector = 'poly:"' + LonLat + '"'
  if (useExternalEndpoints) {
    let s = mapminlat, n = mapmaxlat, w = mapminlon, e = mapmaxlon
    for (const c of [startCoord, endCoord]) {
      s = Math.min(s, c.lat)
      n = Math.max(n, c.lat)
      w = Math.min(w, c.lon)
      e = Math.max(e, c.lon)
    }
    const buf = 0.0015 // ~150 m so the endpoint streets are fully included
    regionSelector =
      s - buf + "," + (w - buf) + "," + (n + buf) + "," + (e + buf)
  }

  let overpassquery =
    "(way(" + regionSelector + "){{filter}};node(w)(" + regionSelector + "););out;"
  let filter =
    "['highway']['highway' !~ 'trunk']['highway' !~ 'motorway']['highway' !~ 'motorway_link']['highway' !~ 'raceway']['highway' !~ 'proposed']['highway' !~ 'construction']['highway' !~ 'service']['highway' !~ 'elevator']['footway' !~ 'crossing']['footway' !~ 'sidewalk']['foot' !~ 'no']['access' !~ 'private']['access' !~ 'no']"

  if (ignoreParks) {
    // drop the park/garden paths and tracks (footways, paths, tracks, steps)
    // that clutter the network when the user only wants real streets
    filter +=
      "['highway' !~ 'path']['highway' !~ 'footway']['highway' !~ 'track']['highway' !~ 'steps']['highway' !~ 'cycleway']"
  }

  overpassquery = overpassquery.replace("{{filter}}", filter)
  loadOverpass(encodeURI(overpassquery), parseOverpassResponse)
}

/**
 * Ray-casting point-in-polygon test on the drawn polygon (lon/lat vertices).
 *
 * @param {Number} lon
 * @param {Number} lat
 * @returns {boolean} true if inside the drawn polygon
 */
function insidePolygon(lon, lat) {
  const poly = polygonLonLat
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1]
    const xj = poly[j][0], yj = poly[j][1]
    const intersects =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersects) {
      inside = !inside
    }
  }
  return inside
}

/**
 * Overpass API endpoints tried in order; if one is down/busy (504, CORS or
 * network error) the next is used, so a single flaky server no longer
 * breaks map loading.
 */
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter?data=",
  "https://lz4.overpass-api.de/api/interpreter?data=",
  "https://z.overpass-api.de/api/interpreter?data=",
  "https://overpass.private.coffee/api/interpreter?data=",
]

/**
 * Fetches the Overpass query from the endpoints in turn until one returns
 * usable XML. On total failure it shows a retry prompt instead of letting
 * an uncaught error surface (which used to trigger the dev error overlay
 * and block all map interaction).
 *
 * @param {String} encodedQuery URI-encoded Overpass QL query
 * @param {Function} onSuccess called with the response text
 */
async function loadOverpass(encodedQuery, onSuccess) {
  for (let i = 0; i < OVERPASS_ENDPOINTS.length; i++) {
    updateActionButton(
      t("action.loadingServer", { i: i + 1, total: OVERPASS_ENDPOINTS.length }),
      true,
      true
    )
    try {
      // per-request timeout so a mirror that hangs doesn't stall the whole
      // load: abort after 40s and move on to the next endpoint (public Overpass
      // servers can take 20-30 s when busy, so don't be too impatient)
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 40000)
      let response
      try {
        response = await fetch(OVERPASS_ENDPOINTS[i] + encodedQuery, {
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timer)
      }
      if (!response.ok) {
        continue // 504/429/etc: try the next mirror
      }
      const text = await response.text()
      if (!text || text.indexOf("<node") === -1) {
        continue // empty response or Overpass error page (no map data)
      }
      onSuccess(text)
      return
    } catch (e) {
      // network error, CORS, or abort (timeout): fall through to the next
    }
  }
  // every endpoint failed: let the user retry (mode is still choosemapmode)
  updateActionButton(t("action.busy"), false, false)
}

function parseOverpassResponse(response) {
    let OverpassResponse = response
    var parser = new DOMParser()
    OSMxml = parser.parseFromString(OverpassResponse, "text/xml")
    var XMLnodes = OSMxml.getElementsByTagName("node")
    var XMLways = OSMxml.getElementsByTagName("way")
    numnodes = XMLnodes.length
    numways = XMLways.length
    for (let i = 0; i < numnodes; i++) {
      var lat = XMLnodes[i].getAttribute("lat")
      var lon = XMLnodes[i].getAttribute("lon")
      minlat = myp5.min(minlat, lat)
      maxlat = myp5.max(maxlat, lat)
      minlon = myp5.min(minlon, lon)
      maxlon = myp5.max(maxlon, lon)
    }
    nodes = []
    edges = []
    endnode = null // nodes are being rebuilt, a previous end node is stale
    for (let i = 0; i < numnodes; i++) {
      var lat = XMLnodes[i].getAttribute("lat")
      var lon = XMLnodes[i].getAttribute("lon")
      var nodeid = XMLnodes[i].getAttribute("id")
      let node = new Node(nodeid, lat, lon)
      nodes.push(node)
    }
    //parse ways into edges
    for (let i = 0; i < numways; i++) {
      let wayid = XMLways[i].getAttribute("id")
      let tagsinsideway = XMLways[i].getElementsByTagName("tag")

      // street name (links the two carriageways of a boulevard) and whether
      // this way is a roundabout ring
      let streetName = ""
      let isRoundabout = false
      for (const tag of tagsinsideway) {
        const k = tag.getAttribute("k")
        if (k == "name") {
          streetName = tag.getAttribute("v")
        }
        if (k == "junction" && tag.getAttribute("v") == "roundabout") {
          isRoundabout = true
        }
      }

      // check if oneway for the settings
      let oneway = false
      if (settings.oneway) {
        let onewayTag = null
        let onewayBicycleTag = null
        for (const tag of tagsinsideway) {
          var tagValue = tag.getAttribute("k")
          if (tagValue == "oneway") {
            onewayTag = tag.getAttribute("v") == "yes"
          }
          if (tagValue == "oneway:bicycle") {
            onewayBicycleTag = tag.getAttribute("v") == "yes"
          }
          if (tagValue == "junction" && tag.getAttribute("v") == "roundabout") {
            onewayTag = true
          }
        }
        if (settings.category == "car" && onewayTag != null) {
          oneway = onewayTag
        }
        if (settings.category == "bicycle" && onewayTag) {
          oneway = !(onewayBicycleTag == false)
        }
      }

      let nodesinsideway = XMLways[i].getElementsByTagName("nd")
      for (let j = 0; j < nodesinsideway.length - 1; j++) {
        let fromnode = getNodebyId(nodesinsideway[j].getAttribute("ref"))
        let tonode = getNodebyId(nodesinsideway[j + 1].getAttribute("ref"))
        if ((fromnode != null) & (tonode != null)) {
          let newEdge = new Edge(fromnode, tonode, wayid, oneway)
          newEdge.streetName = streetName
          newEdge.isRoundabout = isRoundabout
          edges.push(newEdge)
          totaledgedistance += newEdge.distance
        }
      }
    }
    for (const node of nodes) {
      node.updatePosition(openlayersmap)
    }
    // fetch ground elevation in the background; when ready, the elevation
    // ("windy") route becomes available at solve time
    elevationsReady = false
    elevationState = "loading"
    fetchElevations(nodes).then((ok) => {
      elevationsReady = ok
      elevationState = ok ? "ready" : "failed"
      // if the user already solved, fill in (or update) the elevation cases
      if (mode == downloadGPXmode) {
        if (ok) {
          computeWindRoutesLate()
        } else {
          populateSummary() // "cargando…" -> "no disp."
        }
      }
    })
    if (gpxTracks.length > 0) {
      matchGpxToEdges(allGpxPoints(), edges)
      // the already-run streets are now drawn red on the map, so remove the
      // superimposed raw GPX trace overlay (the matching data is kept)
      gpxSource.clear()
    }
    if (useExternalEndpoints) {
      // only the streets inside the drawn polygon must be covered; the streets
      // loaded outside it (the corridor to the start/end points) are access
      // only — traversable connectors, drawn gray, not required
      for (const edge of edges) {
        const midLon = (Number(edge.from.lon) + Number(edge.to.lon)) / 2
        const midLat = (Number(edge.from.lat) + Number(edge.to.lat)) / 2
        if (!insidePolygon(midLon, midLat)) {
          edge.trimmed = true
        }
      }
    }
    // re-apply trims from a restored session (streets are now loaded)
    if (pendingRestoreTrims) {
      for (const edge of edges) {
        if (pendingRestoreTrims.has(edgeKey(edge))) {
          edge.trimmed = true
        }
      }
      pendingRestoreTrims = null
    }
    if (resolveFixedEndpoints()) {
      // start & end were typed as coordinates: skip the click selection and
      // jump straight to trimming with those endpoints already set
      stitchExternalEndpoints() // bridge OSM gaps so the start/end can actually
      //                           reach the streets to cover (see the function)
      removeOrphans()
      mode = trimmode
      updateActionButton(t("action.trim"), false, false)
    } else {
      mode = selectnodemode
      updateActionButton(t("action.pickStart"), true, false)
    }
    saveSession() // remember this area/options so it can be restored later
}

/**
 * Parses "lat, lon" text into {lat, lon}, or null if empty/invalid.
 */
function parseLatLon(text) {
  if (!text) {
    return null
  }
  const parts = text.split(",")
  if (parts.length !== 2) {
    return null
  }
  const lat = parseFloat(parts[0].trim())
  const lon = parseFloat(parts[1].trim())
  if (
    isNaN(lat) || isNaN(lon) ||
    lat < -90 || lat > 90 || lon < -180 || lon > 180
  ) {
    return null
  }
  return { lat: lat, lon: lon }
}

/**
 * Snaps a coordinate to the nearest existing street node. Because the query
 * region is expanded to include the start/end points, there are real streets
 * around them, so the route reaches the point along actual roads instead of an
 * invented straight line.
 *
 * @param {{lat: Number, lon: Number}} coord
 * @returns {Node|null}
 */
function nodeForCoordinate(coord) {
  let nearest = null
  let nearestKm = Infinity
  for (const node of nodes) {
    const dist = calcdistance(
      coord.lat,
      coord.lon,
      Number(node.lat),
      Number(node.lon)
    )
    if (dist < nearestKm) {
      nearestKm = dist
      nearest = node
    }
  }
  return nearest
}

/**
 * If both the Salida and Meta coordinate fields hold a valid lat,lon, set
 * startnode/endnode from them and return true (so the flow skips the manual
 * point selection). Otherwise returns false.
 */
function resolveFixedEndpoints() {
  const startCoord = parseLatLon(document.querySelector("#start-coord").value)
  const endCoord = parseLatLon(document.querySelector("#end-coord").value)
  if (startCoord == null || endCoord == null) {
    return false
  }
  startnode = nodeForCoordinate(startCoord)
  if (
    Math.abs(startCoord.lat - endCoord.lat) < 1e-6 &&
    Math.abs(startCoord.lon - endCoord.lon) < 1e-6
  ) {
    endnode = startnode // same point typed twice: a closed loop
  } else {
    endnode = nodeForCoordinate(endCoord)
  }
  return startnode != null && endnode != null
}

function showNodes() {
  let closestnodetomousedist = Infinity
  for (let i = 0; i < nodes.length; i++) {
    if (showRoads) {
      nodes[i].show()
    }
    if (mode == selectnodemode || mode == selectendmode) {
      let disttoMouse = myp5.dist(nodes[i].x, nodes[i].y, myp5.mouseX, myp5.mouseY)
      if (disttoMouse < closestnodetomousedist) {
        closestnodetomousedist = disttoMouse
        closestnodetomouse = i
      }
    }
  }
  if (mode == selectnodemode) {
    startnode = nodes[closestnodetomouse]
  }
  if (mode == selectendmode) {
    endnode = nodes[closestnodetomouse]
  }
  if (startnode != null && (!isTouchScreenDevice || mode != selectnodemode)) {
    startnode.highlight()
  }
  if (endnode != null) {
    endnode.highlight()
  }
}

function showEdges() {
  let closestedgetomousedist = Infinity
  for (let i = 0; i < edges.length; i++) {
    edges[i].show()
    if (mode == trimmode && !edges[i].trimmed) {
      // left click trims active edges; trimmed ones are targeted by right click
      let dist = edges[i].canvasSegmentDistance(myp5.mouseX, myp5.mouseY)
      if (dist < closestedgetomousedist) {
        closestedgetomousedist = dist
        closestedgetomouse = i
      }
    }
  }
  if (closestedgetomouse >= 0 && !isTouchScreenDevice) {
    edges[closestedgetomouse].highlight()
  }
  // draw the unreachable streets last so their green sits on top of everything
  if (showingUnreachable) {
    for (let i = 0; i < edges.length; i++) {
      if (edges[i].unreachable) {
        edges[i].highlightUnreachable()
      }
    }
  }
}



function resetEdges() {
  for (const edge of edges) {
    edge.travels = 0
    edge.visited = false
  }
}

/**
 * OSM data around the drawn area is often split into several disconnected
 * fragments (a footway that doesn't share a node with the road it meets, a
 * service road filtered out by the query, etc.). With external start/end
 * points that can strand the start on a fragment a few metres away from the
 * streets it must cover, so the route can't be traced at all. This stitches
 * the graph back together: it adds trimmed (traversable, gray, not-required)
 * connector edges across the smallest gaps until the start, the end and every
 * required street sit in ONE connected component. Nothing is added when the
 * graph is already connected, so the normal "reach the points along real
 * streets" behaviour is preserved and no straight line is invented needlessly.
 *
 * @returns {Number} how many connector edges were added
 */
function stitchExternalEndpoints() {
  if (nodes.length === 0) {
    return 0
  }
  // 1) label the connected components (traversing every edge, trimmed included).
  //    NB: `Map` is OpenLayers' Map in this module (import at the top), so use a
  //    WeakMap for the node→component-id lookup, not `new Map()`.
  const compId = new WeakMap()
  const compNodes = []
  let id = 0
  for (const seed of nodes) {
    if (compId.has(seed)) {
      continue
    }
    const arr = []
    const q = [seed]
    compId.set(seed, id)
    while (q.length > 0) {
      const c = q.shift()
      arr.push(c)
      for (const e of c.edges) {
        const o = e.OtherNodeofEdge(c)
        if (!compId.has(o)) {
          compId.set(o, id)
          q.push(o)
        }
      }
    }
    compNodes.push(arr)
    id++
  }
  // 2) the components that must all end up connected: the start's, the end's,
  //    and every component that holds a required (non-trimmed) street
  const must = new Set()
  if (startnode) {
    must.add(compId.get(startnode))
  }
  if (endnode) {
    must.add(compId.get(endnode))
  }
  for (const e of edges) {
    if (!e.trimmed) {
      must.add(compId.get(e.from))
    }
  }
  if (must.size <= 1) {
    return 0 // already all reachable — leave the real-street corridor untouched
  }
  // 3) grow one blob from the start's component, bridging to the nearest still
  //    separate must-component each step (Prim-style over the gaps)
  const anchor = startnode ? compId.get(startnode) : must.values().next().value
  let blob = compNodes[anchor].slice()
  const targets = [...must].filter((c) => c !== anchor)
  // equirectangular squared distance (cheap, no trig in the inner loop; good
  // enough to pick the closest gap over such a small area)
  const coslat = Math.cos((Number(nodes[0].lat) * Math.PI) / 180)
  const d2 = (a, b) => {
    const dx = (Number(a.lon) - Number(b.lon)) * coslat
    const dy = Number(a.lat) - Number(b.lat)
    return dx * dx + dy * dy
  }
  let added = 0
  while (targets.length > 0) {
    let best = Infinity
    let ba = null
    let bb = null
    let bestTi = -1
    for (let ti = 0; ti < targets.length; ti++) {
      const cn = compNodes[targets[ti]]
      for (const a of blob) {
        for (const b of cn) {
          const d = d2(a, b)
          if (d < best) {
            best = d
            ba = a
            bb = b
            bestTi = ti
          }
        }
      }
    }
    if (ba == null) {
      break
    }
    const connector = new Edge(ba, bb, "gap-connector", false)
    connector.trimmed = true // access bridge: traversable, not a street to cover
    edges.push(connector)
    added++
    blob = blob.concat(compNodes[targets[bestTi]])
    targets.splice(bestTi, 1)
  }
  return added
}

/**
 * remove unreachable nodes and edges
 */
function removeOrphans() {
  resetEdges()
  currentnode = startnode
  stack = []
  stack2 = []
  floodfill(currentnode, 1)
  let newedges = []
  let newnodes = []
  totaledgedistance = 0
  for (const edge of edges) {
    // Keep an edge if: it's trimmed (drawn gray, restorable), it was reached by
    // the flood fill from the start node, OR — when using external start/end
    // points — it's a REQUIRED street inside the drawn polygon. Without that
    // last clause, a start/end point outside the polygon floods from there and,
    // if the required streets aren't reachable from it in the loaded data, they
    // get deleted and the whole inside of the area shows up empty. The required
    // streets are the point of the tool, so they must never be pruned.
    if (
      edge.trimmed ||
      edge.travels > 0 ||
      (useExternalEndpoints && !edge.trimmed)
    ) {
      newedges.push(edge)
      if (!edge.trimmed) {
        totaledgedistance += edge.distance
      }
      if (!newnodes.includes(edge.from)) {
        newnodes.push(edge.from)
      }
      if (!newnodes.includes(edge.to)) {
        newnodes.push(edge.to)
      }
    } else {
      deleteElementFromArray(edge, edge.from.edges)
      deleteElementFromArray(edge, edge.to.edges)
      if (settings.oneway) {
        deleteElementFromArray(edge, edge.from.reachableEdges)
        deleteElementFromArray(edge, edge.to.reachableEdges)
      } else {
        // trimmed edges stay traversable (they can still be walked to reach
        // unrun streets beyond them), so reachableEdges keeps every
        // surviving edge of the node, trimmed or not
        edge.from.reachableEdges = edge.from.edges
        edge.to.reachableEdges = edge.to.edges
      }
    }
  }
  edges = newedges
  nodes = newnodes
  resetEdges()
}

/**
 * recursively walk every unwalked route until all connected nodes have been reached at least once
 * @param {Node} node node to explore from
 * @param {Number} stepssofar how deep we are in the graph
 */
function floodfill(node, stepssofar) {
  for (const reachableEdge of node.reachableEdges) {
    if (
      settings.oneway &&
      ((node == currentnode && stepssofar > 1) ||
        (reachableEdge.visited &&
          reachableEdge.travels > 0 &&
          stack.length > 0 &&
          !(stack.includes(reachableEdge) || stack2.includes(reachableEdge))))
    ) {
      //clean the stacks if it's not a dead end
      stack = [] //to save the explored edges when we go down in the recusion (in the graph)
      stack2 = [] //to save the explored edges when we go up in the recusion (in the graph)
    }
    if (!reachableEdge.visited) {
      reachableEdge.travels = stepssofar
      reachableEdge.visited = true
      if (settings.oneway && (reachableEdge.oneway || stack.length > 0)) {
        //we save the edge if it is one way (and potentially a dead end) |OR| if we already are in a dead end
        stack.push(reachableEdge)
      }
      floodfill(reachableEdge.OtherNodeofEdge(node), stepssofar + 1) //let's go deaper in the graph
      if (settings.oneway && stack.length + stack2.length > 0) {
        //if the stacks are not empty, we didn't find an exit for the dead end yet...
        if (
          !reachableEdge.travels > 0 ||
          stack.includes(reachableEdge) ||
          stack2.includes(reachableEdge)
        ) {
          if (!stack2.includes(reachableEdge)) {
            stack2.push(reachableEdge) //...so we save the edge in the stack2. Waiting for a confirmation (dead end or not)
          }
          if (stack.includes(reachableEdge)) {
            deleteElementFromArray(reachableEdge, stack)
            if (reachableEdge.oneway) {
              //if the last edge is a oneway, it was a dead end and we'll be able to remove all the edges deaper
              for (const edge of stack2) {
                edge.travels = 0
              }
              stack2 = []
            }
          }
        }
      }
    }
  }
}

// the four route variants compared in the summary
var ROUTE_CASES = [
  { key: "dist-heur", label: "sum.case.distance", sub: "sum.case.heuristic", exact: false, wind: false },
  { key: "dist-exact", label: "sum.case.distance", sub: "sum.case.exact", exact: true, wind: false },
  { key: "wind-heur", label: "sum.case.elevation", sub: "sum.case.heuristic", exact: false, wind: true },
  { key: "wind-exact", label: "sum.case.elevation", sub: "sum.case.exact", exact: true, wind: true },
]

/**
 * Computes all four route variants (distance/elevation x heuristic/exact) for
 * the walk case, one at a time, refreshing the summary after each so the user
 * sees progress and the per-case time. Returns a promise resolving to true if
 * at least one route was found (else the caller falls back to the random walk).
 */
async function computeRoutes() {
  removeOrphans()
  showRoads = false
  if (settings.oneway) {
    return false
  }
  const requiredEdges = edges.filter((edge) => !edge.trimmed)
  routes = {}
  for (const c of ROUTE_CASES) {
    // elevation cases wait until the elevation data is available
    routes[c.key] = c.wind && !elevationsReady ? null : "pending"
  }
  totaluniqueroads = countUniqueRoads()
  mode = downloadGPXmode
  showSummary()
  let any = false
  for (const c of ROUTE_CASES) {
    if (routes[c.key] === null) {
      continue
    }
    await new Promise((r) => setTimeout(r, 0)) // let the summary repaint first
    routes[c.key] = timedSolve(requiredEdges, c)
    if (routes[c.key].route != null) {
      any = true
    }
    populateSummary()
  }
  if (!any) {
    return false // disconnected: caller falls back to the random walk
  }
  const preferred =
    routes["dist-exact"] && routes["dist-exact"].route ? "dist-exact" : "dist-heur"
  selectRoute(preferred)
  populateSummary()
  return true
}

/**
 * Solves one route case with its cost, timing it. Returns { route, ms }
 * (route null if disconnected). Distances on the route are always the real
 * horizontal length regardless of the optimisation cost.
 */
function timedSolve(requiredEdges, c) {
  const costFn = c.wind
    ? (edge) => edge.distance + windPenalty(edge)
    : (edge) => edge.distance
  for (const edge of edges) {
    edge.cost = costFn(edge)
  }
  const t0 = performance.now()
  const solution = solvePostman(requiredEdges, edges, startnode, endnode, c.exact)
  const ms = Math.round(performance.now() - t0)
  for (const edge of edges) {
    edge.cost = null
  }
  if (solution == null) {
    return { route: null, ms: ms }
  }
  const route = new Route(startnode, null)
  for (let i = 1; i < solution.waypoints.length; i++) {
    const a = solution.waypoints[i - 1]
    const b = solution.waypoints[i]
    route.addWaypoint(b, calcdistance(a.lat, a.lon, b.lat, b.lon))
  }
  return { route: route, ms: ms }
}

/**
 * Extra optimisation cost for climbing an edge: |elevation change| weighted
 * (~1 m of climb like 20 m of horizontal). Only affects optional traversals
 * (duplications/connectors), never whether a required street is covered.
 */
function windPenalty(edge) {
  if (edge.from.elevation == null || edge.to.elevation == null) {
    return 0
  }
  return (20 * Math.abs(edge.to.elevation - edge.from.elevation)) / 1000
}

/**
 * Initialises the iterative random-walk solver (oneway categories, or the
 * fallback when the postman graph is disconnected).
 */
function startRandomWalk() {
  clearUnreachable() // fresh attempt: drop any leftover green highlight
  removeOrphans()
  showRoads = false
  remainingedges = edges.filter((edge) => !edge.trimmed).length
  currentroute = new Route(currentnode, null)
  bestroute = new Route(currentnode, null)
  bestdistance = Infinity
  iterations = 0
  iterationsperframe = 1
  starttime = myp5.millis()
}

/**
 * Recomputes the two elevation route cases once elevation data arrives after
 * the user already solved (called from the elevation fetch callback).
 */
function computeWindRoutesLate() {
  const requiredEdges = edges.filter((edge) => !edge.trimmed)
  for (const c of ROUTE_CASES) {
    if (c.wind && (routes[c.key] === null || routes[c.key] === "pending")) {
      routes[c.key] = timedSolve(requiredEdges, c)
    }
  }
  populateSummary()
}

/**
 * Selects which computed route is active (shown on the map and downloaded).
 */
function selectRoute(key) {
  const entry = routes[key]
  if (entry && entry.route) {
    bestroute = entry.route
    activeRouteKey = key
    bestdistance = bestroute.distance
  }
}

function showSummary() {
  populateSummary()
  document.querySelector("#summary").style.display = "block"
  document.querySelector("#legend").style.display = "block" // only with the route
}

/** Text for a case cell that has no route yet. */
function pendingCell(entry) {
  if (entry === "pending") return t("sum.computing")
  if (entry === null) {
    return elevationState === "failed"
      ? "n/a"
      : elevationState === "ready"
      ? "—"
      : t("sum.elevationWait")
  }
  return "—" // { route: null } -> disconnected
}

/**
 * Builds the 4-column comparison table (one column per route case) and wires
 * clicking a column to select that route.
 */
function populateSummary() {
  document.querySelector("#summary-shared").textContent =
    t("sum.shared", { n: totaluniqueroads, km: myp5.nf(totaledgedistance, 0, 2) })
  const metric = (entry, fn) =>
    entry && entry.route ? fn(entry) : pendingCell(entry)
  const rows = [
    {
      label: t("sum.length"),
      cls: "metric",
      fn: (e) => myp5.nf(e.route.distance, 0, 2) + " km",
    },
    {
      label: t("sum.gain"),
      cls: "metric",
      fn: (e) => Math.round(elevationGain(e.route.waypoints)) + " m",
    },
    {
      label: t("sum.efficiency"),
      cls: "",
      fn: (e) =>
        e.route.distance > 0
          ? Math.round((100 * totaledgedistance) / e.route.distance) + "%"
          : "—",
    },
    {
      label: t("sum.time"),
      cls: "time",
      fn: (e) => e.ms + " ms",
    },
  ]
  let html = "<table><thead><tr><th></th>"
  for (const c of ROUTE_CASES) {
    const a = c.key === activeRouteKey ? " active" : ""
    html +=
      '<th class="col' +
      a +
      '" data-key="' +
      c.key +
      '">' +
      t(c.label) +
      "<small>" +
      t(c.sub) +
      "</small></th>"
  }
  html += "</tr></thead><tbody>"
  for (const r of rows) {
    html += "<tr><td>" + r.label + "</td>"
    for (const c of ROUTE_CASES) {
      const a = c.key === activeRouteKey ? " active" : ""
      html +=
        '<td class="col ' +
        r.cls +
        a +
        '" data-key="' +
        c.key +
        '">' +
        metric(routes[c.key], r.fn) +
        "</td>"
    }
    html += "</tr>"
  }
  html += "</tbody></table>"
  const body = document.querySelector("#summary-body")
  body.innerHTML = html
  body.querySelectorAll("[data-key]").forEach((el) => {
    el.addEventListener("click", function () {
      const key = this.getAttribute("data-key")
      if (routes[key] && routes[key].route) {
        selectRoute(key)
        populateSummary()
      }
    })
  })
}

/**
 * Enables each toolbar button only in the phase where it makes sense:
 *   - Import GPX history ........ before the streets are loaded (choose-map phase)
 *   - Remove ridden streets ..... once the streets are loaded, until the route is made
 *   - Draw streets .............. only while trimming (it needs the street graph)
 *   - Play route / Export video . once a route exists (download phase)
 * Runs a few times per second (cheap), so it never misses a mode change.
 */
function updateToolbarState() {
  const streetsLoaded =
    mode == selectnodemode ||
    mode == selectendmode ||
    mode == trimmode ||
    mode == brushmode
  const state = {
    "#import-gpx-button": mode == choosemapmode,
    "#trim-run-button": streetsLoaded,
    "#draw-street-button": mode == trimmode || mode == brushmode,
    "#play-route-button": mode == downloadGPXmode,
    "#export-video-button": mode == downloadGPXmode,
  }
  for (const selector in state) {
    const button = document.querySelector(selector)
    if (button && button.disabled === state[selector]) {
      button.disabled = !state[selector]
    }
  }
}

/**
 * The welcome / how-to window. It opens on every visit unless the user ticked
 * "Don't show this again" (remembered in localStorage), and can always be
 * reopened with the "Help" button.
 */
function setupWelcomeWindow() {
  const WELCOME_KEY = "coverthemap.hideWelcome"
  const element = document.querySelector("#welcome-modal")
  const dontShow = document.querySelector("#welcome-dont-show")
  const modal = new Modal(element)
  let hidden = false
  try {
    hidden = localStorage.getItem(WELCOME_KEY) === "1"
  } catch (e) {
    /* storage unavailable: just show the window */
  }
  dontShow.checked = hidden
  element.addEventListener("hidden.bs.modal", function () {
    try {
      localStorage.setItem(WELCOME_KEY, dontShow.checked ? "1" : "0")
    } catch (e) {
      /* ignore */
    }
  })
  document.querySelector("#help-button").addEventListener("click", () => modal.show())
  if (!hidden) {
    modal.show()
  }
}

/** Areas above this size (km²) trigger a one-time warning before downloading. */
const LARGE_AREA_KM2 = 25
/** Area of the polygon the user was last warned about (so the 2nd click proceeds). */
let warnedAreaKm2 = null

function actionButtonClicked() {
  if (mode == choosemapmode) {
    // Was in Choose map mode and clicked on button.
    // Very large areas make the Overpass query slow (or rejected) and the
    // solver heavy: warn once and let the user either shrink it or insist.
    const areaKm2 = getArea(polygon) / 1e6
    if (areaKm2 > LARGE_AREA_KM2 && warnedAreaKm2 !== areaKm2) {
      warnedAreaKm2 = areaKm2
      updateActionButton(t("action.areaLarge", { km2: Math.round(areaKm2) }), false, false)
      return
    }
    updateActionButton(t("action.loading"), true, true)
    openlayersmap.getView().fit(polygon, {
      padding: [
        polygonPadding,
        polygonPadding,
        polygonPadding + headerHeight,
        polygonPadding,
      ],
      duration: 1000,
      callback: getOverpassData,
    })
    return
  }
  if (mode == trimmode) {
    showNodes() // recalculate closest node
    if (!settings.oneway) {
      // walk: compute the four route cases asynchronously (shows progress)
      updateActionButton(t("action.computing"), true, true)
      computeRoutes().then((found) => {
        if (found) {
          updateActionButton(t("action.download"), false, false)
        } else {
          document.querySelector("#summary").style.display = "none"
          startRandomWalk()
          mode = solveRESmode
          updateActionButton(t("action.calculating"), false, true)
        }
      })
    } else {
      // car/bicycle: directed problem, keep the original random walk
      startRandomWalk()
      mode = solveRESmode
      updateActionButton(t("action.calculating"), false, true)
    }
    return
  }
  if (mode == solveRESmode) {
    // Was busy solving and user clicked on button
    mode = downloadGPXmode
    updateActionButton(t("action.download"), false, false)
    totaluniqueroads = countUniqueRoads()
    // the random-walk result is the single (heuristic distance) route
    routes = { "dist-heur": { route: bestroute, ms: 0 } }
    activeRouteKey = "dist-heur"
    showSummary()
    return
  }
  if (mode == downloadGPXmode) {
    // Clicked Download Route
    bestroute.exportGPX()
    return
  }
}

/** Toggles the crosshair pick cursor. A body class (see CSS) forces the cursor
 *  on every canvas — needed because the element actually under the mouse (the OL
 *  tile canvas before data loads, the p5 overlay after) changes between modes,
 *  and each one's own cursor:auto would otherwise win. */
function setPickCursor(active) {
  document.body.classList.toggle("picking-coord", !!active)
}

/** Completes a "coords by map click" pick: copies the lat/lon and restores the
 *  polygon-draw interaction, cursor and button. Guarded so the OL and p5 click
 *  paths can't both fire it twice. */
function finishPickCoord(lonlat) {
  if (!pickingCoord) {
    return
  }
  pickingCoord = false
  const text = lonlat[1].toFixed(7) + ", " + lonlat[0].toFixed(7) // lat, lon
  navigator.clipboard.writeText(text).catch(() => {})
  if (olDraw) {
    olDraw.setActive(true)
  }
  setPickCursor(false)
  const pb = document.querySelector("#pick-coord")
  if (pb) {
    pb.classList.remove("active")
    pb.textContent = t("map.copied", { coord: text })
    setTimeout(() => (pb.textContent = t("map.pick")), 1900)
  }
}

function canvasClicked() {
  // "Coords by map click": copy the clicked point's lat/lon, then stop. (This
  // is the fallback for modes where the p5 overlay is on top; the primary path
  // is OpenLayers' singleclick handler wired in init.)
  if (pickingCoord) {
    finishPickCoord(
      toLonLat(openlayersmap.getCoordinateFromPixel([myp5.mouseX, myp5.mouseY]))
    )
    return
  }
  // brush: click a start node/point, then an end node/point, to add a street
  if (mode == brushmode) {
    brushClick()
    return
  }
  // click the start node, then the end node, then trim roads
  if (mode == selectnodemode) {
    showNodes() // locks in startnode (closest to mouse)
    removeOrphans() // prune now so the end can only be a reachable node
    mode = selectendmode
    updateActionButton(
      t("action.pickEnd"),
      true,
      false
    )
    return
  }
  if (mode == selectendmode) {
    showNodes() // locks in endnode (closest to mouse, from the pruned graph)
    mode = trimmode
    updateActionButton(t("action.trim"), false, false)
    return
  }
  if (mode == trimmode) {
    showEdges() // find closest edge
    // clicked on edge to remove it
    trimSelectedEdge()
  }
}

// ---- "Draw streets" brush -------------------------------------------------

/** Enters the street-drawing brush (only from the trim phase). */
function enterBrushMode() {
  brushReturnMode = mode
  mode = brushmode
  drawFromNode = null
  const b = document.querySelector("#draw-street-button")
  b.textContent = t("nav.drawFinish")
  b.classList.add("active")
  updateActionButton(t("action.drawing"), true, false)
}

/** Leaves the brush and returns to the trim phase. */
function exitBrushMode() {
  drawFromNode = null
  mode = brushReturnMode || trimmode
  const b = document.querySelector("#draw-street-button")
  b.textContent = t("nav.draw")
  b.classList.remove("active")
  if (mode == trimmode) {
    updateActionButton(t("action.trim"), false, false)
  }
}

/**
 * The nearest node to the mouse within maxDistPx screen pixels, or null.
 * Used to snap the brush endpoints onto existing junctions.
 */
function nearestNodeToMouse(maxDistPx) {
  let best = null
  let bestDist = maxDistPx
  for (const node of nodes) {
    const d = myp5.dist(node.x, node.y, myp5.mouseX, myp5.mouseY)
    if (d < bestDist) {
      bestDist = d
      best = node
    }
  }
  return best
}

/** Creates a brand-new node at the current mouse position and registers it. */
function createNodeAtMouse() {
  const coord = toLonLat(
    openlayersmap.getCoordinateFromPixel([myp5.mouseX, myp5.mouseY])
  )
  const node = new Node("drawn-n" + drawnNodeSeq++, coord[1], coord[0])
  nodes.push(node)
  return node
}

/**
 * One brush click: the first click fixes the start (snapped to a node if one is
 * close, else a new node), the second click creates a required street to the
 * end point (again snapped or new).
 */
function brushClick() {
  const SNAP_PX = 18
  const target = nearestNodeToMouse(SNAP_PX) || createNodeAtMouse()
  if (drawFromNode == null) {
    drawFromNode = target
    return
  }
  if (target !== drawFromNode) {
    const newEdge = new Edge(drawFromNode, target, "drawn-w" + drawnWaySeq++, false)
    edges.push(newEdge)
    totaledgedistance += newEdge.distance // keep the on-screen total in step
  }
  drawFromNode = null // ready for the next street
}

/** Removes the nearest hand-drawn street to the mouse (right click in brush). */
function deleteDrawnEdgeNearMouse() {
  let best = null
  let bestDist = 20 // px
  for (const edge of edges) {
    if (typeof edge.wayid !== "string" || edge.wayid.indexOf("drawn-w") !== 0) {
      continue // only delete streets created with the brush
    }
    const d = edge.canvasSegmentDistance(myp5.mouseX, myp5.mouseY)
    if (d < bestDist) {
      bestDist = d
      best = edge
    }
  }
  if (best == null) {
    return
  }
  deleteElementFromArray(best, edges)
  deleteElementFromArray(best, best.from.edges)
  deleteElementFromArray(best, best.to.edges)
  deleteElementFromArray(best, best.from.reachableEdges)
  deleteElementFromArray(best, best.to.reachableEdges)
  if (!best.trimmed) {
    totaledgedistance -= best.distance
  }
}

/** Draws the brush feedback: snap highlight and a rubber-band to the mouse. */
function drawBrushPreview() {
  const snap = nearestNodeToMouse(18)
  if (snap != null) {
    snap.highlight()
  }
  if (drawFromNode != null) {
    drawFromNode.highlight()
    const tx = snap != null ? snap.x : myp5.mouseX
    const ty = snap != null ? snap.y : myp5.mouseY
    myp5.push()
    myp5.colorMode(myp5.RGB)
    myp5.stroke(0, 210, 255)
    myp5.strokeWeight(3)
    myp5.line(drawFromNode.x, drawFromNode.y, tx, ty)
    myp5.pop()
  }
}

/**
 * Random-walk cost weight for an edge: required (unrun) streets are
 * cheapest so the walk covers them first; already-run streets cost more;
 * trimmed streets cost most (used only as connectors, never required).
 *
 * @param {Edge} edge
 * @returns {Number}
 */
function edgeWeight(edge) {
  if (edge.trimmed) {
    return 5
  }
  if (edge.alreadyRun) {
    return 3
  }
  return 1
}

/**
 * Number of distinct OSM ways among the non-trimmed edges
 */
function countUniqueRoads() {
  let uniqueways = []
  for (let i = 0; i < edges.length; i++) {
    if (!edges[i].trimmed && !uniqueways.includes(edges[i].wayid)) {
      uniqueways.push(edges[i].wayid)
    }
  }
  return uniqueways.length
}

export function calcdistance(lat1, long1, lat2, long2) {
  lat1 = myp5.radians(lat1)
  long1 = myp5.radians(long1)
  lat2 = myp5.radians(lat2)
  long2 = myp5.radians(long2)
  return (
    2 *
    myp5.asin(
        myp5.sqrt(
            myp5.pow(myp5.sin((lat2 - lat1) / 2), 2) +
            myp5.cos(lat1) * myp5.cos(lat2) * myp5.pow(myp5.sin((long2 - long1) / 2), 2)
      )
    ) *
    6371.0
  )
}

function getNodebyId(id) {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].nodeId == id) {
      return nodes[i]
    }
  }
  return null
}

/**
 * Update the action button
 * @param {String}  msg       message to display
 * @param {Boolean} disabled  if button enabled or disabled
 * @param {Boolean} spinner   spinner enabled
 */
function updateActionButton(msg, disabled, spinner) {
  actionButton.querySelectorAll("span")[1].innerHTML = msg
  actionButton.disabled = disabled
  if (spinner) {
    actionButton.querySelectorAll("span")[0].classList.remove("d-none")
  } else {
    actionButton.querySelectorAll("span")[0].classList.add("d-none")
  }
}

/**
 * Remove a element from the array
 *
 * @param {Object} elementToDelete object to delete from the array
 * @param {Array} array array where the element will be removed
 */
function deleteElementFromArray(elementToDelete, array) {
  if (array.includes(elementToDelete)) {
    array.splice(
      array.findIndex((element) => element == elementToDelete),
      1
    )
  }
}

function trimSelectedEdge() {
  if (closestedgetomouse >= 0) {
    const cut = edges[closestedgetomouse]
    trimEdge(cut)
    cascadeTrimDeadEnds(cut) // trimming the entry of a dead-end also grays the
    //                          whole stub behind it (like the original delete)
    closestedgetomouse = -1
    saveSession() // persist the updated trims
    refreshUnreachable() // trimming may cut off more streets — keep green current
  }
}

/**
 * After manually trimming `cut`, gray out any street that is now reachable
 * from the start ONLY by crossing `cut` — i.e. the dead-end stub behind the
 * cut. Every other street (including run/trimmed connectors) is treated as
 * traversable, so this doesn't touch streets that are still reachable another
 * way. Reproduces the original "trim the entry, the whole dead-end goes away"
 * behaviour, but non-destructively (everything stays restorable).
 *
 * @param {Edge} cut the edge just trimmed
 */
function cascadeTrimDeadEnds(cut) {
  if (startnode == null) {
    return
  }
  // A street is a dead-end behind the cut only if it WAS reachable from the
  // start and is NO LONGER reachable once the cut is severed. Comparing before
  // vs after (instead of just "not reachable after") is essential when the start
  // point is OUTSIDE the polygon and disconnected from the drawn streets in the
  // loaded data: those streets were never reachable from the start, so a simple
  // "not reachable now" test would gray out the ENTIRE area on the first trim.
  const reachedWithCut = reachFromStart(null) // traverse everything, incl. cut
  const reachedWithoutCut = reachFromStart(cut) // cut severed
  for (const edge of edges) {
    if (edge.trimmed) {
      continue
    }
    const wasReachable =
      reachedWithCut.has(edge.from) && reachedWithCut.has(edge.to)
    const stillReachable =
      reachedWithoutCut.has(edge.from) && reachedWithoutCut.has(edge.to)
    if (wasReachable && !stillReachable) {
      edge.trimmed = true
    }
  }
}

/** Breadth-first set of nodes reachable from the start node over every street
 *  (trimmed streets stay traversable), optionally skipping one edge. */
function reachFromStart(excludeEdge) {
  const reached = new Set([startnode])
  const queue = [startnode]
  while (queue.length > 0) {
    const node = queue.shift()
    for (const edge of node.edges) {
      if (edge === excludeEdge) {
        continue
      }
      const other = edge.OtherNodeofEdge(node)
      if (!reached.has(other)) {
        reached.add(other)
        queue.push(other)
      }
    }
  }
  return reached
}

/**
 * Flags every REQUIRED (non-trimmed) street that can't be reached from the
 * start node, so showEdges() can draw them green. Trimmed edges stay
 * traversable, so reachFromStart walks through them; a required edge is
 * unreachable only if its endpoints are in no connected path from the start.
 *
 * @returns {Number} how many required streets are unreachable
 */
function markUnreachableRequired() {
  const reached = reachFromStart(null)
  let count = 0
  for (const edge of edges) {
    const bad = !edge.trimmed && !reached.has(edge.from) && !reached.has(edge.to)
    edge.unreachable = bad
    if (bad) {
      count++
    }
  }
  return count
}

/** Clears the green "unreachable" highlight from every street. */
function clearUnreachable() {
  for (const edge of edges) {
    edge.unreachable = false
  }
  showingUnreachable = false
}

/**
 * Marks an edge as trimmed: it stays on screen (gray) but is no longer
 * reachable for routing. Mirrors the oneway-aware wiring of the Edge
 * constructor (from always, to only if !oneway).
 *
 * @param {Edge} edge edge to trim
 */
function trimEdge(edge) {
  // "trimmed" means: not required to cover (drawn gray, excluded from the
  // route's target set) but STILL traversable — a trimmed street can be
  // walked to reach unrun streets beyond it. So trimming never disconnects
  // the graph nor deletes the streets past it.
  edge.trimmed = true
}

/**
 * Puts a trimmed edge back into the routable graph
 *
 * @param {Edge} edge edge to restore
 */
function restoreEdge(edge) {
  edge.trimmed = false
  if (!edge.from.reachableEdges.includes(edge)) {
    edge.from.reachableEdges.push(edge)
  }
  if (!edge.oneway && !edge.to.reachableEdges.includes(edge)) {
    edge.to.reachableEdges.push(edge)
  }
}

/**
 * Restores the trimmed edge closest to the mouse (right click in trim mode)
 */
function restoreEdgeNearMouse() {
  let closestdist = Infinity
  let closestedge = null
  for (const edge of edges) {
    if (edge.trimmed) {
      let dist = edge.canvasSegmentDistance(myp5.mouseX, myp5.mouseY)
      if (dist < closestdist) {
        closestdist = dist
        closestedge = edge
      }
    }
  }
  // only restore when the cursor is actually on a trimmed line (within
  // 15px), so a right click on empty space does nothing
  if (closestedge != null && closestdist < 15) {
    restoreEdge(closestedge)
    removeOrphans() // recompute reachability with the restored edge
    saveSession() // persist the updated trims
    refreshUnreachable() // live-update the green highlight as it gets fixed
  }
}

/**
 * While the green "unreachable" highlight is showing, recompute it after the
 * user changes the graph (restores/trims a street) so streets that just became
 * reachable turn normal and the message updates. Clears the highlight once
 * everything is reachable.
 */
function refreshUnreachable() {
  if (!showingUnreachable) {
    return
  }
  const nUnreachable = markUnreachableRequired()
  if (nUnreachable > 0) {
    updateActionButton(
      t("action.unreachableStill", { n: nUnreachable }),
      false,
      false
    )
  } else {
    clearUnreachable()
    updateActionButton(t("action.trim"), false, false)
  }
}

/**
 * Starts the moving-dot animation along bestroute, interpolating the
 * position by elapsed time over the real distances between waypoints
 */
function startRouteAnimation() {
  if (bestroute == null || bestroute.waypoints.length < 2) {
    return
  }
  const cumdist = [0]
  for (let i = 1; i < bestroute.waypoints.length; i++) {
    const a = bestroute.waypoints[i - 1]
    const b = bestroute.waypoints[i]
    cumdist.push(cumdist[i - 1] + calcdistance(a.lat, a.lon, b.lat, b.lon))
  }
  routeAnimation = {
    cumdist: cumdist,
    total: cumdist[cumdist.length - 1],
    start: myp5.millis(),
    // ~4s per km, clamped to 8-30s
    duration: Math.min(30000, Math.max(8000, bestroute.distance * 4000)),
  }
}

function drawRouteAnimation() {
  const anim = routeAnimation
  const frac = Math.min(1, (myp5.millis() - anim.start) / anim.duration)
  const targetKm = frac * anim.total
  let i = 1
  while (i < anim.cumdist.length - 1 && anim.cumdist[i] < targetKm) {
    i++
  }
  const segStart = anim.cumdist[i - 1]
  const segEnd = anim.cumdist[i]
  const segFrac = segEnd > segStart ? (targetKm - segStart) / (segEnd - segStart) : 0
  const a = bestroute.waypoints[i - 1]
  const b = bestroute.waypoints[i]
  const x = a.x + (b.x - a.x) * segFrac
  const y = a.y + (b.y - a.y) * segFrac
  myp5.noStroke()
  myp5.fill(130, 255, 255, 1)
  myp5.ellipse(x, y, 16)
  myp5.fill(0, 0, 255, 1)
  myp5.ellipse(x, y, 8)
  if (frac >= 1) {
    routeAnimation = null
    stopVideoExport() // if a recording is running, finish it with the animation
  }
}

/**
 * Records the route animation to a .webm using canvas.captureStream and
 * MediaRecorder. The map (OpenLayers canvas) and the route (p5 canvas)
 * are composited onto an offscreen canvas that feeds the recorder.
 */
function startVideoExport() {
  if (bestroute == null || bestroute.waypoints.length < 2) {
    return
  }
  if (videoRecorder != null && videoRecorder.state == "recording") {
    return
  }
  const p5canvas = canvas.elt
  const olcanvas = document.querySelector("#OSMmap canvas")
  const composite = document.createElement("canvas")
  composite.width = p5canvas.width
  composite.height = p5canvas.height
  const ctx = composite.getContext("2d")
  const chunks = []
  videoRecorder = new MediaRecorder(composite.captureStream(30), {
    mimeType: "video/webm",
  })
  videoRecorder.ondataavailable = function (event) {
    if (event.data.size > 0) {
      chunks.push(event.data)
    }
  }
  videoRecorder.onstop = function () {
    // don't auto-download: the user gesture has expired by now and the
    // browser would block it. Offer the file on the next (real) click.
    recordedVideoBlob = new Blob(chunks, { type: "video/webm" })
    window.__lastVideoBlob = recordedVideoBlob // exposed for debugging/tests
    document.querySelector("#export-video-button").textContent =
      t("nav.downloadVideo")
  }
  const compose = function () {
    ctx.fillStyle = "#14161a"
    ctx.fillRect(0, 0, composite.width, composite.height)
    if (olcanvas != null) {
      ctx.drawImage(olcanvas, 0, 0)
    }
    ctx.drawImage(p5canvas, 0, 0)
  }
  videoRecorder.start(1000)
  compose()
  // setInterval instead of requestAnimationFrame so the recording also
  // advances when the tab is backgrounded (at a throttled frame rate)
  videoRecorderTimer = setInterval(compose, 33)
  startRouteAnimation()
}

function stopVideoExport() {
  if (videoRecorderTimer != null) {
    clearInterval(videoRecorderTimer)
    videoRecorderTimer = null
  }
  if (videoRecorder != null && videoRecorder.state == "recording") {
    videoRecorder.stop()
  }
}

function drawProgressGraph() {
  if (efficiencyhistory.length > 0) {
    myp5.noStroke()
    myp5.fill(0, 0, 0, 0.3)
    let graphHeight = 100
    myp5.rect(0, myp5.height - graphHeight, myp5.windowWidth, graphHeight)
    myp5.fill(0, 5, 225, 255)
    myp5.textAlign(myp5.LEFT)
    myp5.textSize(12)
    myp5.text(
      t("graph.status", {
        tried: iterations.toLocaleString(),
        all: myp5.nf(totaledgedistance, 0, 1),
        best: myp5.nf(bestroute.distance, 0, 1),
        eff: myp5.round(efficiencyhistory[efficiencyhistory.length - 1] * 100),
      }),
      15,
      myp5.height - graphHeight + 18
    )
    myp5.textAlign(myp5.CENTER)
    myp5.textSize(12)
    for (let i = 0; i < efficiencyhistory.length; i++) {
      myp5.fill((i * 128) / efficiencyhistory.length, 255, 205, 1)
      let startx = myp5.map(i, 0, efficiencyhistory.length, 0, myp5.windowWidth)
      let starty = myp5.height - graphHeight * efficiencyhistory[i]
      myp5.rect(
        startx,
        starty,
        myp5.windowWidth / efficiencyhistory.length,
        graphHeight * efficiencyhistory[i]
      )
      myp5.fill(0, 5, 0)
      myp5.text(
        myp5.round(distancehistory[i]) + "km",
        startx + myp5.windowWidth / efficiencyhistory.length / 2,
        myp5.height - 5
      )
    }
  }
}

function showReportOut() {
  myp5.fill(250, 255, 0, 0.6)
  myp5.noStroke()
  myp5.rect(myp5.width / 2 - 150, myp5.height / 2 - 250, 300, 450)
  myp5.fill(250, 255, 0, 0.15)
  myp5.rect(myp5.width / 2 - 147, myp5.height / 2 - 247, 300, 450)
  myp5.strokeWeight(1)
  myp5.stroke(20, 255, 255, 0.8)
  myp5.line(myp5.width / 2 - 150, myp5.height / 2 - 200, myp5.width / 2 + 150, myp5.height / 2 - 200)
  myp5.noStroke()
  myp5.fill(0, 0, 255, 1)
  myp5.textSize(28)
  myp5.textAlign(myp5.CENTER)
  myp5.text(t("report.title"), myp5.width / 2, myp5.height / 2 - 215)
  myp5.fill(0, 0, 255, 0.75)
  myp5.textSize(16)
  myp5.text(t("report.roads"), myp5.width / 2, myp5.height / 2 - 170 + 0 * 95)
  myp5.text(t("report.allLength"), myp5.width / 2, myp5.height / 2 - 170 + 1 * 95)
  myp5.text(t("report.finalLength"), myp5.width / 2, myp5.height / 2 - 170 + 2 * 95)
  myp5.text(t("report.efficiency"), myp5.width / 2, myp5.height / 2 - 170 + 3 * 95)

  myp5.textSize(36)
  myp5.fill(20, 255, 255, 1)
  myp5.text(totaluniqueroads, myp5.width / 2, myp5.height / 2 - 120 + 0 * 95)
  myp5.text(myp5.nf(totaledgedistance, 0, 1) + "km", myp5.width / 2, myp5.height / 2 - 120 + 1 * 95)
  myp5.text(
    myp5.nf(bestroute.distance, 0, 1) + "km",
    myp5.width / 2,
    myp5.height / 2 - 120 + 2 * 95
  )
  myp5.text(
    myp5.round((100 * totaledgedistance) / bestroute.distance) + "%",
    myp5.width / 2,
    myp5.height / 2 - 120 + 3 * 95
  )
}

function showStatus() {
  if (startnode != null) {
    let textx = 2
    let texty = mapHeight - 400
    myp5.fill(0, 5, 225)
    myp5.noStroke()
    myp5.textSize(12)
    myp5.textAlign(myp5.LEFT)
    myp5.text("Total number nodes: " + nodes.length, textx, texty)
    myp5.text("Total number road sections: " + edges.length, textx, texty + 20)
    myp5.text(
      "Length of roads: " + myp5.nf(totaledgedistance, 0, 3) + "km",
      textx,
      texty + 40
    )
    if (bestroute != null) {
      if (bestroute.waypoints.length > 0) {
        myp5.text(
          "Best route: " +
            nf(bestroute.distance, 0, 3) +
            "km, " +
            nf((100 * totaledgedistance) / bestroute.distance, 0, 2) +
            "%",
          textx,
          texty + 60
        )
      }
      myp5.text("Routes tried: " + iterations, textx, texty + 80)
      myp5.text("Frame rate: " + myp5.frameRate(), textx, texty + 100)
      myp5.text("Solutions per frame: " + iterationsperframe, textx, texty + 120)
      myp5.text(
        "Iterations/second: " + (iterations / (myp5.millis() - starttime)) * 1000,
        textx,
        texty + 140
      )
      myp5.text("best routes: " + efficiencyhistory.length, textx, texty + 160)
      myp5.text(
        "efficiency gains: " +
          myp5.nf(100 * totalefficiencygains, 0, 2) +
          "% and " +
          myp5.nf(
            ((100 * totalefficiencygains) / (myp5.millis() - starttime)) * 1000,
            0,
            2
          ) +
          "% gains/sec:",
        textx,
        texty + 180
      ) //
      myp5.text("isTouchScreenDevice: " + isTouchScreenDevice, textx, texty + 200)
    }
  }
}

init()