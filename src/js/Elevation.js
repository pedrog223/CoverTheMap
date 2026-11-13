/**
 * Ground-elevation lookup for the street graph, used by the elevation-aware
 * ("windy") route. Elevations come from the free Open-Meteo Elevation API
 * (https://open-meteo.com/en/docs/elevation-api) — no API key, allows
 * cross-origin browser requests, answers a 100-point batch in ~250 ms.
 *
 * Robustness matters here because Open-Meteo enforces a weight-based rate limit
 * (~600 coordinates/minute per IP): a burst of parallel batches, or re-solving,
 * quickly earns HTTP 429 and — with the old all-or-nothing logic — left the two
 * "desnivel" routes permanently showing "no disp.". So this module:
 *   - caches every looked-up point in localStorage (keyed by rounded lat/lon),
 *     so re-solving or overlapping polygons never re-fetch the same point;
 *   - fetches only the still-unknown points, in small parallel groups;
 *   - retries a failed/429 batch a few times with growing back-off (the 429
 *     window clears after up to a minute); and
 *   - runs in the background, so the distance routes are ready immediately and
 *     the elevation routes fill in whenever the data arrives.
 *
 * (Open-Elevation, the previous provider, is dead — 504/timeout. Open-Topo-Data
 * has no CORS. Open-Meteo is the only usable free batch service, so we lean on
 * caching + back-off rather than switching away.)
 *
 * Elevations are stored on node.elevation in metres.
 */

const ENDPOINT = "https://api.open-meteo.com/v1/elevation"
const BATCH = 100 // Open-Meteo accepts up to 100 coordinates per request
const CONCURRENCY = 2 // keep bursts small so we don't trip the rate limit
const REQUEST_TIMEOUT = 12000 // ms per attempt before giving up
// back-off before retry attempts 2..n (attempt 1 has no wait). The later waits
// straddle a minute so a weight-limited 429 has time to clear.
const RETRY_DELAYS = [2000, 8000, 20000, 30000]
const CACHE_PREFIX = "elev:"
const COORD_KEY_DP = 5 // ~1 m grid for the cache key

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function cacheKey(lat, lon) {
  return CACHE_PREFIX + Number(lat).toFixed(COORD_KEY_DP) + "," + Number(lon).toFixed(COORD_KEY_DP)
}

function cacheGet(lat, lon) {
  try {
    const v = localStorage.getItem(cacheKey(lat, lon))
    return v == null ? null : Number(v)
  } catch (e) {
    return null
  }
}

function cacheSet(lat, lon, elevation) {
  try {
    localStorage.setItem(cacheKey(lat, lon), String(elevation))
  } catch (e) {
    /* localStorage full/unavailable — just skip caching */
  }
}

/**
 * GET one batch of coordinates from Open-Meteo, once, with a timeout.
 * Returns { ok:true, elevations } | { ok:false, retriable } (retriable is true
 * for 429 / network errors / timeouts, false for a definitive bad response).
 */
async function fetchBatchOnce(nodes) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
  try {
    const lats = nodes.map((n) => Number(n.lat).toFixed(6)).join(",")
    const lons = nodes.map((n) => Number(n.lon).toFixed(6)).join(",")
    const url = ENDPOINT + "?latitude=" + lats + "&longitude=" + lons
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      // 429 (rate limit) and 5xx are worth retrying; 4xx (other) is not
      return { ok: false, retriable: response.status === 429 || response.status >= 500 }
    }
    const data = await response.json()
    if (!Array.isArray(data.elevation) || data.elevation.length !== nodes.length) {
      return { ok: false, retriable: false }
    }
    return { ok: true, elevations: data.elevation }
  } catch (e) {
    return { ok: false, retriable: true } // network error / abort → retry
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Fetch one batch with retries/back-off. On success, writes node.elevation and
 * the cache. Returns true if the batch succeeded, false if it gave up.
 */
async function fetchBatch(nodes) {
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAYS[attempt - 1])
    }
    const res = await fetchBatchOnce(nodes)
    if (res.ok) {
      for (let k = 0; k < nodes.length; k++) {
        nodes[k].elevation = res.elevations[k]
        cacheSet(nodes[k].lat, nodes[k].lon, res.elevations[k])
      }
      return true
    }
    if (!res.retriable) {
      return false
    }
  }
  return false
}

/**
 * Fetches elevation (metres) for every node and stores it on node.elevation.
 * Points already in the localStorage cache are filled instantly; the rest are
 * fetched in small parallel groups with retries. Resolves to true only if EVERY
 * node ends up with an elevation (so the caller can mark the windy route
 * unavailable instead of waiting forever).
 *
 * @param {Array} nodes nodes with .lat/.lon (string or number)
 * @returns {Promise<boolean>}
 */
export async function fetchElevations(nodes) {
  // 1) serve whatever we can from the cache
  const missing = []
  for (const n of nodes) {
    const cached = cacheGet(n.lat, n.lon)
    if (cached != null) {
      n.elevation = cached
    } else {
      missing.push(n)
    }
  }
  if (missing.length === 0) {
    return true
  }
  // 2) fetch the rest in batches, CONCURRENCY at a time
  const batches = []
  for (let i = 0; i < missing.length; i += BATCH) {
    batches.push(missing.slice(i, i + BATCH))
  }
  let ok = true
  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const slice = batches.slice(i, i + CONCURRENCY)
    const results = await Promise.all(slice.map((batch) => fetchBatch(batch)))
    if (results.some((r) => !r)) {
      ok = false
    }
  }
  return ok
}

/**
 * Total elevation gain (sum of uphill metres) along a route's waypoints.
 *
 * @param {Array} waypoints nodes with .elevation
 * @returns {Number} metres climbed
 */
export function elevationGain(waypoints) {
  let gain = 0
  for (let i = 1; i < waypoints.length; i++) {
    const a = waypoints[i - 1].elevation
    const b = waypoints[i].elevation
    if (a != null && b != null && b > a) {
      gain += b - a
    }
  }
  return gain
}
