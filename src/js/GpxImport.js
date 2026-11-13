/**
 * All GPX tracks uploaded so far: [{points: [{lat, lon}], name: "file.gpx"}]
 */
export const gpxTracks = []

/**
 * Extracts {lat, lon} track points from GPX XML text (<trkpt lat lon>)
 *
 * @param {String} text GPX file content
 * @returns {Array<{lat: Number, lon: Number}>}
 */
function parseGpxText(text) {
  const xml = new DOMParser().parseFromString(text, "text/xml")
  const trkpts = xml.getElementsByTagName("trkpt")
  const points = []
  for (const trkpt of trkpts) {
    const lat = parseFloat(trkpt.getAttribute("lat"))
    const lon = parseFloat(trkpt.getAttribute("lon"))
    if (!isNaN(lat) && !isNaN(lon)) {
      points.push({ lat, lon })
    }
  }
  return points
}

/**
 * Extracts {lat, lon} track points from Garmin Training Center XML text
 * (<Trackpoint><Position><LatitudeDegrees>/<LongitudeDegrees>)
 *
 * @param {String} text TCX file content
 * @returns {Array<{lat: Number, lon: Number}>}
 */
function parseTcxText(text) {
  const xml = new DOMParser().parseFromString(text, "text/xml")
  const trackpoints = xml.getElementsByTagName("Trackpoint")
  const points = []
  for (const trackpoint of trackpoints) {
    const position = trackpoint.getElementsByTagName("Position")[0]
    if (position == null) {
      continue // trackpoints without GPS fix have no Position
    }
    const latEl = position.getElementsByTagName("LatitudeDegrees")[0]
    const lonEl = position.getElementsByTagName("LongitudeDegrees")[0]
    if (latEl == null || lonEl == null) {
      continue
    }
    const lat = parseFloat(latEl.textContent)
    const lon = parseFloat(lonEl.textContent)
    if (!isNaN(lat) && !isNaN(lon)) {
      points.push({ lat, lon })
    }
  }
  return points
}

/**
 * Reads a GPX file and extracts its track points
 *
 * @param {File} fileInput File object from an <input type="file">
 * @returns {Promise<Array<{lat: Number, lon: Number}>>}
 */
export async function parseGpxFile(fileInput) {
  return parseGpxText(await fileInput.text())
}

/**
 * Reads a Garmin Training Center (TCX) file and extracts its track points
 *
 * @param {File} fileInput File object from an <input type="file">
 * @returns {Promise<Array<{lat: Number, lon: Number}>>}
 */
export async function parseTcxFile(fileInput) {
  return parseTcxText(await fileInput.text())
}

/**
 * Parses every file in a FileList (GPX or TCX, detected by extension or
 * by XML root tag) and accumulates them in gpxTracks
 *
 * @param {FileList} fileList files from an <input type="file" multiple>
 * @returns {Promise<Array<{points: Array, name: String}>>} the newly added tracks
 */
export async function addGpxFiles(fileList) {
  const newTracks = []
  for (const file of fileList) {
    const name = file.name.toLowerCase()
    let points
    if (name.endsWith(".tcx")) {
      points = await parseTcxFile(file)
    } else if (name.endsWith(".gpx")) {
      points = await parseGpxFile(file)
    } else {
      // unknown extension: detect format from the XML root tag
      const text = await file.text()
      points = text.includes("<TrainingCenterDatabase")
        ? parseTcxText(text)
        : parseGpxText(text)
    }
    const track = { points: points, name: file.name }
    gpxTracks.push(track)
    newTracks.push(track)
  }
  return newTracks
}

/**
 * All points of all uploaded tracks combined, for edge matching
 *
 * @returns {Array<{lat: Number, lon: Number}>}
 */
export function allGpxPoints() {
  const points = []
  for (const track of gpxTracks) {
    points.push(...track.points)
  }
  return points
}

/**
 * Marks streets already covered by the GPX history using COVERAGE, not a raw
 * point count: the edge is sampled every ~5 m and a sample counts as covered
 * if any GPX point is within `nearMeters`. The edge is flagged alreadyRun when
 * enough of its length is covered (`coverageNeeded`).
 *
 * Coverage handles the geometries a fixed count/threshold got wrong:
 *  - a perpendicular alley only grazed at its mouth -> low coverage -> skipped
 *  - a street run along the sidewalk a few metres off  -> high coverage -> run
 *  - a parallel carriageway of a boulevard            -> ~0 coverage -> skipped
 *
 * @param {Array<{lat: Number, lon: Number}>} gpxPoints
 * @param {Array<Edge>} edges
 */
export function matchGpxToEdges(gpxPoints, edges) {
  const nearMeters = 10 // a sample is "covered" if a GPX point is this close
  const coverageNeeded = 0.6 // fraction of the edge that must be covered
  const near2 = (nearMeters / 1000) * (nearMeters / 1000) // km^2
  const bboxMargin = 0.0002 // degrees, cheap pre-filter (~22 m)
  const metersPerDegree = 111.32 // km per degree of latitude
  for (const edge of edges) {
    const fromLat = Number(edge.from.lat)
    const fromLon = Number(edge.from.lon)
    const toLat = Number(edge.to.lat)
    const toLon = Number(edge.to.lon)
    const minLat = Math.min(fromLat, toLat) - bboxMargin
    const maxLat = Math.max(fromLat, toLat) + bboxMargin
    const minLon = Math.min(fromLon, toLon) - bboxMargin
    const maxLon = Math.max(fromLon, toLon) + bboxMargin
    // GPX points near this edge's bounding box (small list to test against)
    const nearby = []
    for (const point of gpxPoints) {
      if (
        point.lat >= minLat && point.lat <= maxLat &&
        point.lon >= minLon && point.lon <= maxLon
      ) {
        nearby.push(point)
      }
    }
    // walk the edge in ~5 m steps and measure how much of it has GPX nearby
    const lengthMeters = edge.distance * 1000
    const samples = Math.max(2, Math.round(lengthMeters / 5))
    let covered = 0
    for (let s = 0; s < samples; s++) {
      const t = samples === 1 ? 0 : s / (samples - 1)
      const sampleLat = fromLat + t * (toLat - fromLat)
      const sampleLon = fromLon + t * (toLon - fromLon)
      const coslat = Math.cos((sampleLat * Math.PI) / 180)
      let near = false
      for (const point of nearby) {
        const dLat = (point.lat - sampleLat) * metersPerDegree
        const dLon = (point.lon - sampleLon) * metersPerDegree * coslat
        if (dLat * dLat + dLon * dLon < near2) {
          near = true
          break
        }
      }
      if (near) {
        covered++
      }
    }
    edge.runCount = covered
    edge.sampleCount = samples
    edge.alreadyRun = covered / samples >= coverageNeeded
  }

  markRoundaboutsPassedThrough(edges)
  markBoulevardTwins(edges, metersPerDegree)
}

/**
 * Roundabouts are a ring of many tiny segments; the runner never traces them
 * perfectly, and demanding every segment is absurd. So if the GPX passes
 * THROUGH a roundabout at all (a meaningful arc of the ring is covered, or any
 * one segment is fully covered), the whole ring counts as run. A tangent pass
 * that never enters the ring covers ~none of it and stays unmarked.
 *
 * @param {Array<Edge>} edges
 */
function markRoundaboutsPassedThrough(edges) {
  const ringFraction = 0.12 // arc of the ring that counts as "passed through"
  const rings = new Map() // wayid -> ring edges
  for (const edge of edges) {
    if (edge.isRoundabout) {
      if (!rings.has(edge.wayid)) {
        rings.set(edge.wayid, [])
      }
      rings.get(edge.wayid).push(edge)
    }
  }
  for (const ring of rings.values()) {
    let covered = 0
    let total = 0
    let anySegmentRun = false
    for (const edge of ring) {
      covered += edge.runCount
      total += edge.sampleCount
      if (edge.alreadyRun) {
        anySegmentRun = true
      }
    }
    if (anySegmentRun || (total > 0 && covered / total >= ringFraction)) {
      for (const edge of ring) {
        edge.alreadyRun = true
      }
    }
  }
}

/**
 * A boulevard is one street modelled as two parallel carriageways with a
 * median between them. Running one side leaves the other (same name, ~15 m to
 * the side, roughly parallel) unmarked even though it's the same street, so
 * this marks that twin carriageway run too. Same-name streets that are
 * perpendicular or a continuation further along are left alone.
 *
 * @param {Array<Edge>} edges
 * @param {Number} metersPerDegree km per degree of latitude
 */
function markBoulevardTwins(edges, metersPerDegree) {
  const maxLateral = 30 // m: carriageways sit within this side offset
  const minLateral = 4 // m: below this it's the same carriageway, not a twin
  const maxAlong = 20 // m: twin must be at roughly the same spot along the road
  const parallelDot = Math.cos((30 * Math.PI) / 180) // within 30 deg of parallel
  // group by street name so we only compare edges of the same street
  const byName = new Map()
  for (const edge of edges) {
    if (!edge.streetName) {
      continue
    }
    if (!byName.has(edge.streetName)) {
      byName.set(edge.streetName, [])
    }
    byName.get(edge.streetName).push(edge)
  }
  // local-metres helpers for an edge: midpoint and unit direction
  const geom = (edge) => {
    const fromLat = Number(edge.from.lat)
    const fromLon = Number(edge.from.lon)
    const toLat = Number(edge.to.lat)
    const toLon = Number(edge.to.lon)
    const midLat = (fromLat + toLat) / 2
    const coslat = Math.cos((midLat * Math.PI) / 180)
    const dx = (toLon - fromLon) * metersPerDegree * 1000 * coslat
    const dy = (toLat - fromLat) * metersPerDegree * 1000
    const len = Math.hypot(dx, dy) || 1
    return {
      midLat: midLat,
      midLon: (fromLon + toLon) / 2,
      coslat: coslat,
      ux: dx / len,
      uy: dy / len,
    }
  }
  for (const group of byName.values()) {
    if (group.length < 2) {
      continue
    }
    const g = group.map(geom)
    const runNow = group.map((e) => e.alreadyRun) // snapshot before propagating
    for (let i = 0; i < group.length; i++) {
      if (!runNow[i]) {
        continue
      }
      for (let j = 0; j < group.length; j++) {
        if (j === i || group[j].alreadyRun) {
          continue
        }
        // offset from edge i's midpoint to edge j's, in metres
        const ox =
          (g[j].midLon - g[i].midLon) * metersPerDegree * 1000 * g[i].coslat
        const oy = (g[j].midLat - g[i].midLat) * metersPerDegree * 1000
        const along = ox * g[i].ux + oy * g[i].uy
        const lateral = Math.sqrt(Math.max(0, ox * ox + oy * oy - along * along))
        const parallel = Math.abs(g[i].ux * g[j].ux + g[i].uy * g[j].uy) >= parallelDot
        if (
          parallel &&
          Math.abs(along) <= maxAlong &&
          lateral >= minLateral &&
          lateral <= maxLateral
        ) {
          group[j].alreadyRun = true // the twin carriageway is the same street
        }
      }
    }
  }
}
