/**
 * Exact Chinese Postman solver for undirected graphs (walk category).
 *
 * Pure functions: they only read edge.from / edge.to / edge.distance and
 * never mutate the app's Node/Edge objects, so the module can be unit
 * tested with plain objects.
 */

import { exactMinWeightMatching } from "./Blossom.js"

/**
 * Cost used for OPTIMIZATION (Dijkstra/matching). Defaults to the horizontal
 * distance, but if an edge carries a `cost` field the solver minimizes that
 * instead — this is how the "windy"/elevation route reuses the same solver
 * with cost = distance + penalty*|elevation change|.
 *
 * @param {Object} edge
 * @returns {Number}
 */
function edgeCost(edge) {
  return edge.cost != null ? edge.cost : edge.distance
}

/**
 * Builds an adjacency map from an edge list
 *
 * @param {Array} edges edges with {from, to, distance}
 * @returns {Map} node -> [{edge, node: otherEndpoint}]
 */
export function buildAdjacency(edges) {
  const adjacency = new Map()
  for (const edge of edges) {
    if (!adjacency.has(edge.from)) {
      adjacency.set(edge.from, [])
    }
    if (!adjacency.has(edge.to)) {
      adjacency.set(edge.to, [])
    }
    adjacency.get(edge.from).push({ edge: edge, node: edge.to })
    adjacency.get(edge.to).push({ edge: edge, node: edge.from })
  }
  return adjacency
}

/**
 * Dijkstra from a source node. O(V^2), fine for these graph sizes.
 *
 * @param {Map} adjacency from buildAdjacency
 * @param {Object} source node to start from
 * @returns {{source, dist: Map, prev: Map}} prev maps node -> {edge, node: previous}
 */
export function dijkstra(adjacency, source) {
  const dist = new Map([[source, 0]])
  const prev = new Map()
  const visited = new Set()
  while (true) {
    let current = null
    let best = Infinity
    for (const [node, d] of dist) {
      if (!visited.has(node) && d < best) {
        best = d
        current = node
      }
    }
    if (current == null) {
      break
    }
    visited.add(current)
    for (const { edge, node } of adjacency.get(current)) {
      const candidate = best + edgeCost(edge)
      const old = dist.has(node) ? dist.get(node) : Infinity
      if (candidate < old) {
        dist.set(node, candidate)
        prev.set(node, { edge: edge, node: current })
      }
    }
  }
  return { source: source, dist: dist, prev: prev }
}

/**
 * Reconstructs the shortest path (list of edges, source->target order)
 * from a dijkstra result. Returns null if target is unreachable.
 */
export function shortestPathEdges(dijkstraResult, target) {
  const path = []
  let current = target
  while (current !== dijkstraResult.source) {
    const step = dijkstraResult.prev.get(current)
    if (step == null) {
      return null
    }
    path.push(step.edge)
    current = step.node
  }
  path.reverse()
  return path
}

/**
 * Exact minimum-weight perfect matching: iterative DP over a bitmask of
 * matched vertices with typed arrays (memoized brute force over all
 * pairings). Viable up to ~20 vertices (2^20 masks, ~8MB).
 *
 * @param {Array<Array<Number>>} cost symmetric cost matrix
 * @returns {{cost: Number, pairs: Array<[Number, Number]>}}
 */
export function minWeightMatching(cost) {
  const n = cost.length
  const full = (1 << n) - 1
  const dp = new Float64Array(full + 1).fill(Infinity)
  const choice = new Int32Array(full + 1).fill(-1)
  dp[0] = 0
  for (let mask = 0; mask < full; mask++) {
    if (dp[mask] === Infinity) {
      continue
    }
    // always match the lowest unmatched vertex (canonical order)
    let i = 0
    while (i < n && mask & (1 << i)) {
      i++
    }
    if (i >= n) {
      continue
    }
    for (let j = i + 1; j < n; j++) {
      if (mask & (1 << j)) {
        continue
      }
      const next = mask | (1 << i) | (1 << j)
      const candidate = dp[mask] + cost[i][j]
      if (candidate < dp[next]) {
        dp[next] = candidate
        choice[next] = i * 32 + j
      }
    }
  }
  if (dp[full] === Infinity) {
    return { cost: Infinity, pairs: [] }
  }
  const pairs = []
  let mask = full
  while (mask !== 0) {
    const packed = choice[mask]
    const i = (packed / 32) | 0
    const j = packed % 32
    pairs.push([i, j])
    mask &= ~(1 << i)
    mask &= ~(1 << j)
  }
  return { cost: dp[full], pairs: pairs }
}

/**
 * 2-opt refinement of a matching: repeatedly re-pairs every two pairs in
 * both alternative ways while it improves the total cost. Turns the
 * greedy fallback into a near-optimal matching in practice.
 */
export function improveMatching(cost, pairs) {
  let improved = true
  while (improved) {
    improved = false
    for (let a = 0; a < pairs.length; a++) {
      for (let b = a + 1; b < pairs.length; b++) {
        const [i, j] = pairs[a]
        const [k, l] = pairs[b]
        const current = cost[i][j] + cost[k][l]
        const alt1 = cost[i][k] + cost[j][l]
        const alt2 = cost[i][l] + cost[j][k]
        if (alt1 < current - 1e-12 && alt1 <= alt2) {
          pairs[a] = [i, k]
          pairs[b] = [j, l]
          improved = true
        } else if (alt2 < current - 1e-12) {
          pairs[a] = [i, l]
          pairs[b] = [j, k]
          improved = true
        }
      }
    }
  }
  return pairs
}

/**
 * Greedy matching fallback for more than 20 odd nodes: repeatedly pair
 * the closest remaining pair. KNOWN LIMITATION: suboptimal (the true
 * minimum matching can be cheaper) even after the 2-opt refinement that
 * solvePostman applies on top — the exact algorithm above is exponential
 * and only viable for small sets.
 */
export function greedyMatching(cost) {
  const n = cost.length
  const used = new Array(n).fill(false)
  const pairs = []
  let total = 0
  while (pairs.length < n / 2) {
    let bestI = -1
    let bestJ = -1
    let bestCost = Infinity
    for (let i = 0; i < n; i++) {
      if (used[i]) {
        continue
      }
      for (let j = i + 1; j < n; j++) {
        if (!used[j] && cost[i][j] < bestCost) {
          bestCost = cost[i][j]
          bestI = i
          bestJ = j
        }
      }
    }
    if (bestI < 0) {
      break
    }
    used[bestI] = true
    used[bestJ] = true
    pairs.push([bestI, bestJ])
    total += bestCost
  }
  return { cost: total, pairs: pairs }
}

/**
 * Near-optimal min-weight perfect matching for sets too big for the exact DP.
 * Runs many randomized restarts, each refined to a 2-opt local optimum, and
 * keeps the cheapest (plus the deterministic greedy result). Far closer to the
 * true optimum than a single greedy pass, and still fast (each restart is
 * O(n^2) per improvement pass). More restarts = better, at more compute.
 *
 * @param {Array<Array<Number>>} cost symmetric cost matrix
 * @param {Number} restarts number of random restarts
 * @returns {{cost: Number, pairs: Array<[Number, Number]>}}
 */
export function nearOptimalMatching(cost, restarts) {
  const n = cost.length
  const total = (pairs) => pairs.reduce((s, [i, j]) => s + cost[i][j], 0)
  // seed with the deterministic greedy + 2-opt result
  let best = greedyMatching(cost)
  improveMatching(cost, best.pairs)
  best = { cost: total(best.pairs), pairs: best.pairs }
  for (let r = 0; r < restarts; r++) {
    const idx = []
    for (let i = 0; i < n; i++) {
      idx.push(i)
    }
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const t = idx[i]
      idx[i] = idx[j]
      idx[j] = t
    }
    const pairs = []
    for (let i = 0; i < n; i += 2) {
      pairs.push([idx[i], idx[i + 1]])
    }
    improveMatching(cost, pairs)
    const c = total(pairs)
    if (c < best.cost) {
      best = { cost: c, pairs: pairs }
    }
  }
  return best
}

/**
 * Hierholzer over an arc adjacency (each arc usable once). Returns the
 * trail as [{node, arcTaken}]: arcTaken connects the previous entry's
 * node to this one (null for the first entry).
 */
function hierholzer(arcAdjacency, start) {
  const pointer = new Map()
  const stack = [{ node: start, arcTaken: null }]
  const trail = []
  while (stack.length > 0) {
    const top = stack[stack.length - 1]
    const list = arcAdjacency.get(top.node) || []
    let i = pointer.has(top.node) ? pointer.get(top.node) : 0
    while (i < list.length && list[i].arc.used) {
      i++
    }
    pointer.set(top.node, i)
    if (i < list.length) {
      const { arc, other } = list[i]
      arc.used = true
      stack.push({ node: other, arcTaken: arc })
    } else {
      trail.push(stack.pop())
    }
  }
  trail.reverse()
  return trail
}

/**
 * Dijkstra from every node satisfying isSource (distance 0) until the first
 * node satisfying isTarget is settled. Returns {target, pathEdges} or null.
 */
function multiSourceDijkstra(adjacency, isSource, isTarget) {
  const dist = new Map()
  const prev = new Map()
  const visited = new Set()
  for (const node of adjacency.keys()) {
    if (isSource(node)) {
      dist.set(node, 0)
    }
  }
  while (true) {
    let current = null
    let best = Infinity
    for (const [node, d] of dist) {
      if (!visited.has(node) && d < best) {
        best = d
        current = node
      }
    }
    if (current == null) {
      return null
    }
    visited.add(current)
    if (isTarget(current)) {
      const pathEdges = []
      let c = current
      while (prev.has(c)) {
        const step = prev.get(c)
        pathEdges.push(step.edge)
        c = step.node
      }
      return { target: current, pathEdges: pathEdges }
    }
    for (const { edge, node } of adjacency.get(current)) {
      const candidate = best + edgeCost(edge)
      if (candidate < (dist.has(node) ? dist.get(node) : Infinity)) {
        dist.set(node, candidate)
        prev.set(node, { edge: edge, node: current })
      }
    }
  }
}

/**
 * Connects the components of the required-edge graph with shortest paths
 * through the full (traversable) graph, so a Rural-Postman instance (cover
 * a subset of streets, may pass through the rest) can be handed to the
 * ordinary CPP. Returns the required edges plus the connector-path edges,
 * or null if a component can't be reached. startnode/endnode are treated as
 * their own singleton components so the route can start/end there.
 */
function connectRequiredComponents(requiredEdges, adjAll, startnode, endnode) {
  const parent = new Map()
  const find = (x) => {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)))
      x = parent.get(x)
    }
    return x
  }
  const add = (n) => {
    if (n != null && !parent.has(n)) {
      parent.set(n, n)
    }
  }
  for (const e of requiredEdges) {
    add(e.from)
    add(e.to)
  }
  add(startnode)
  add(endnode)
  for (const e of requiredEdges) {
    parent.set(find(e.from), find(e.to))
  }
  const roots = new Set()
  for (const n of parent.keys()) {
    roots.add(find(n))
  }
  const cover = requiredEdges.slice()
  if (roots.size <= 1) {
    return cover // required edges already connected (with start/end)
  }
  // Prim-style: grow a connected set from the start node's component,
  // splicing in the nearest still-disconnected component each round
  const seed = startnode != null ? startnode : requiredEdges[0].from
  const connectedRoots = new Set([find(seed)])
  while (connectedRoots.size < roots.size) {
    const hop = multiSourceDijkstra(
      adjAll,
      (n) => parent.has(n) && connectedRoots.has(find(n)),
      (n) => parent.has(n) && !connectedRoots.has(find(n))
    )
    if (hop == null) {
      return null // a required component is unreachable through the graph
    }
    for (const edge of hop.pathEdges) {
      cover.push(edge)
    }
    connectedRoots.add(find(hop.target))
  }
  return cover
}

/**
 * Solves the Chinese/Rural Postman Problem: covers every REQUIRED edge,
 * using the other (traversable) edges only as connectors when the required
 * edges don't form a connected graph. Instant (polynomial), no search.
 *
 * With no endnode (or endnode == startnode) it returns a closed circuit;
 * with a distinct endnode, an open path start->end.
 *
 * @param {Array}  requiredEdges edges that must be covered (non-trimmed)
 * @param {Array}  allEdges      every traversable edge (required + trimmed)
 * @param {Object} startnode
 * @param {Object} endnode       optional fixed end node
 * @param {boolean} exact        true = exact min-weight matching (Blossom);
 *                               false = fast near-optimal heuristic
 * @returns {{waypoints: Array, distance: Number}|null} null if empty or
 *          disconnected (caller falls back to the random walk)
 */
export function solvePostman(requiredEdges, allEdges, startnode, endnode, exact) {
  if (requiredEdges.length === 0 || startnode == null) {
    return null
  }
  const adjAll = buildAdjacency(allEdges)
  if (!adjAll.has(startnode)) {
    return null
  }
  const coverEdges = connectRequiredComponents(
    requiredEdges,
    adjAll,
    startnode,
    endnode
  )
  if (coverEdges == null) {
    return null
  }
  return solveConnectedCPP(coverEdges, adjAll, startnode, endnode, exact)
}

/**
 * CPP over a CONNECTED required-edge multiset `edges` (may contain repeated
 * edge objects for connectors), pairing the odd-degree vertices via shortest
 * paths in `adjAll` (the FULL traversable graph). Using the full graph for
 * the matching is what lets the route close through gray/connector streets
 * instead of backtracking a required street it just covered.
 */
function solveConnectedCPP(edges, adjAll, startnode, endnode, exact) {
  if (edges.length === 0 || startnode == null) {
    return null
  }
  const adjacency = buildAdjacency(edges)
  if (!adjacency.has(startnode)) {
    return null
  }
  // odd-degree nodes (degree within the required cover multigraph)
  let toMatch = []
  for (const [node, arcs] of adjacency) {
    if (arcs.length % 2 === 1) {
      toMatch.push(node)
    }
  }
  const openPath =
    endnode != null && endnode !== startnode && adjacency.has(endnode)
  if (openPath) {
    // start and end must remain odd (natural endpoints of the open
    // eulerian path): toggle their membership in the set to pair up
    for (const endpoint of [startnode, endnode]) {
      const idx = toMatch.indexOf(endpoint)
      if (idx >= 0) {
        toMatch.splice(idx, 1)
      } else {
        toMatch.push(endpoint)
      }
    }
  }
  // toMatch has even size (handshake lemma keeps parity)
  const virtuals = []
  if (toMatch.length > 0) {
    // shortest paths for the matching run over the FULL graph, so odd
    // vertices can be paired through connector streets, not only required ones
    const dijkstras = toMatch.map((node) => dijkstra(adjAll, node))
    const cost = toMatch.map((a, i) =>
      toMatch.map((b, j) => {
        if (i === j) {
          return Infinity
        }
        return dijkstras[i].dist.has(b) ? dijkstras[i].dist.get(b) : Infinity
      })
    )
    let matching
    if (exact) {
      // guaranteed optimum via Edmonds' blossom algorithm (fast, O(n^3))
      matching = exactMinWeightMatching(cost)
    } else if (toMatch.length <= 20) {
      matching = minWeightMatching(cost) // exact DP, cheap at this size
    } else {
      // fast near-optimal: randomized restarts + 2-opt
      matching = nearOptimalMatching(cost, 400)
    }
    if (matching.cost === Infinity) {
      return null // some odd nodes cannot reach each other: disconnected
    }
    for (const [i, j] of matching.pairs) {
      const path = shortestPathEdges(dijkstras[i], toMatch[j])
      if (path == null) {
        return null
      }
      virtuals.push({
        from: toMatch[i],
        to: toMatch[j],
        distance: dijkstras[i].dist.get(toMatch[j]),
        path: path, // oriented from -> to
      })
    }
  }
  // arc multigraph: every real edge once + one virtual arc per matched pair
  const arcAdjacency = new Map()
  for (const node of adjacency.keys()) {
    arcAdjacency.set(node, [])
  }
  const addArc = (arc, a, b) => {
    arcAdjacency.get(a).push({ arc: arc, other: b })
    arcAdjacency.get(b).push({ arc: arc, other: a })
  }
  for (const edge of edges) {
    addArc({ edge: edge, virtual: false, used: false }, edge.from, edge.to)
  }
  for (const virtual of virtuals) {
    addArc(
      {
        virtual: true,
        from: virtual.from,
        to: virtual.to,
        distance: virtual.distance,
        path: virtual.path,
        used: false,
      },
      virtual.from,
      virtual.to
    )
  }
  const trail = hierholzer(arcAdjacency, startnode)
  if (trail.length - 1 !== edges.length + virtuals.length) {
    return null // not all arcs reachable: disconnected graph
  }
  // expand virtual arcs into their real shortest-path edge sequences
  const waypoints = [trail[0].node]
  let distance = 0
  for (let k = 1; k < trail.length; k++) {
    const arc = trail[k].arcTaken
    if (!arc.virtual) {
      waypoints.push(trail[k].node)
      distance += arc.edge.distance
    } else {
      const forward = trail[k - 1].node === arc.from
      const path = forward ? arc.path : arc.path.slice().reverse()
      let current = trail[k - 1].node
      for (const edge of path) {
        current = edge.from === current ? edge.to : edge.from
        waypoints.push(current)
        distance += edge.distance
      }
    }
  }
  return { waypoints: waypoints, distance: distance }
}
