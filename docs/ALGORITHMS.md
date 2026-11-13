# How it works (algorithms)

*Para desarrolladores y curiosos. No hace falta leer esto para usar la web.*

## The problem

Find the shortest walk that traverses **every required street at least once**.
This is the **Chinese Postman Problem** (CPP) when every street is required, and
the **Rural Postman Problem** (RPP) when only some are (streets you trimmed
become optional connectors). The problem is solvable in polynomial time for
undirected graphs (Edmonds & Johnson, 1973), which is why exact answers are
fast. See [BIBLIOGRAPHY](../BIBLIOGRAPHY.md).

## Pipeline

```
polygon ──► Overpass query ──► Node/Edge graph ──► trim / orphan removal
                                                      │
        GPX download ◄── Route ◄── solver ◄── start/end, costs
```

1. **Data** (`main.js: getOverpassData, parseOverpassResponse`). The polygon is
   sent to the Overpass API; ways and nodes come back as XML. Each OSM way is
   split at junctions into `Edge`s joining `Node`s (`Node.js`, `Edge.js`).
   Roundabouts and dual carriageways are merged so they count once.
2. **Cleaning** (`removeOrphans`, `floodfill`). A flood fill from the start
   removes islands that cannot be reached.
3. **Solving** (`PostmanSolver.js`):
   1. *Connect* the required edges: if they form several disconnected pieces,
      add the cheapest connector paths over the full network
      (`connectRequiredComponents`).
   2. Find the nodes with **odd degree**. An Euler circuit exists only if all
      degrees are even, so these must be paired up by repeating streets.
   3. Compute shortest paths between odd nodes (Dijkstra, `dijkstra`).
   4. Choose the pairing with the **minimum total cost**:
      - *exact*: Edmonds' blossom algorithm (`Blossom.js`, O(n³)), a port of
        Joris van Rantwijk's implementation;
      - *heuristic*: greedy matching plus local improvement with restarts
        (`nearOptimalMatching`).
   5. Add the repeated paths and walk an **Euler path/circuit** (Hierholzer).
      With a distinct end node the start and end are kept odd, producing an open
      path instead of a loop.
4. **Elevation-aware variant**. Every edge has a `cost`. By default
   `cost = distance`. For the elevation routes
   `cost = distance + 20 × |Δelevation| / 1000`, so a metre of climb weighs like
   20 m of flat running (`windPenalty` in `main.js`). Because required streets
   are always covered, the penalty only affects *which streets get repeated* and
   which connectors are used. Altitudes come from Open-Meteo (`Elevation.js`)
   with caching and retry/back-off.
5. **Fallback**. When the graph is disconnected or one-way streets are active, a
   randomised walk that always prefers the least-travelled edge is used
   (`startRandomWalk`); it improves while you wait and you stop it when satisfied.

## GPX/TCX history (`GpxImport.js`)

Track points are matched against each street: a street counts as "already run"
when the track covers enough of its length (coverage-based, not point-count based,
so sparse GPS sampling does not matter).

## Session persistence

The polygon, start/end, option toggles and trimmed edges (by stable key) are saved
to `localStorage` and re-applied after the streets reload.

## Source map

| File | Responsibility |
|------|----------------|
| `src/js/main.js` | UI, map, p5 drawing, state machine (`choosemap → selectnode → selectend → trim → solve`) |
| `src/js/PostmanSolver.js` | Pure solver functions (no browser dependencies, unit tested) |
| `src/js/Blossom.js` | Exact minimum-weight perfect matching |
| `src/js/Elevation.js` | Altitude lookup, cache and gain computation |
| `src/js/GpxImport.js` | GPX/TCX parsing and street matching |
| `src/js/Node.js`, `Edge.js`, `Route.js` | Graph and route data structures |
| `src/js/i18n.js` | Translations (EN/ES) |
| `tests/` | Solver tests (`npm test`) |

## Known limitations / ideas

- `main.js` is large and holds most global state. Splitting it into modules
  (map, session, overpass, ui) would be a good first contribution.
- One-way streets (car/bike) exist in the code (`settings.category`) but there is
  no interface switch yet, and the directed problem falls back to the random walk.
- Turn restrictions are not implemented.
