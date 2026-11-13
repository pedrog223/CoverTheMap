# User guide

*(Versión en español: [USO.md](USO.md))*

CoverTheMap answers one question: **"what is the shortest route that passes
through every street of this area?"** You pick an area on a map, optionally say
where you start and finish, and it computes a route you can download as a GPX
file for your watch, phone or bike computer.

## 1. Quick tour (5 steps)

1. **Draw the area.** Pan/zoom the map to your town or neighbourhood and click
   points to draw a polygon; double-click (or click the first point) to close it.
2. **Press the big blue button** ("Validate the polygon"). The map zooms to your
   area and downloads its streets from OpenStreetMap.
3. **Choose the start.** Click the street junction where you want to begin.
4. **Choose the end.** Click another junction, or click the start again to
   finish where you started (a loop).
5. **Trim, then compute.** Click any street you do *not* want to cover (it turns
   grey). Then press the blue button: the routes are computed and compared in the
   *Route summary* table. Press **Download route (.gpx)**.

## 2. Reading the map colours

| Colour | Meaning |
|--------|---------|
| Lime green | Street that must be covered |
| Red | Street you have already run (from imported GPX history) |
| Grey | Street removed by you; the route may still *cross* it if needed, but it is not required |
| Bright green (after a failed attempt) | Street that cannot be reached from your start. Restore a connecting street or change the start |
| Route (red → green gradient) | The result, ordered from start (red dot) to end (blue dot) |

## 3. Route options explained

After computing, the *Route summary* shows **four candidate routes** side by side.
Click a column to select it; that one is drawn and downloaded.

| Column | What it optimises | Speed |
|--------|-------------------|-------|
| **Distance, heuristic** | Shortest total length; very good but not guaranteed perfect | instant |
| **Distance, exact** | Provably shortest total length (Edmonds' blossom matching) | instant for towns, slower for huge areas |
| **Elevation, heuristic** | Same coverage, but when it has to repeat streets it prefers flat ones | instant |
| **Elevation, exact** | As above with exact optimisation | instant to slow |

Rows: *Route length*, *Elevation gain* (total climb), *Efficiency* (street
length ÷ route length; 100 % means no street is repeated) and *Compute time*.

> **Elevation routes** need altitude data from the Open-Meteo service. They
> appear a few seconds after the distance routes. If the service is busy you
> will see "elevation…" or "n/a"; try again in a minute.

## 4. Toolbar and buttons

| Control | What it does |
|---------|--------------|
| **Restart** | Starts over (reloads the page) |
| **↩ Restore previous area** | Reloads your last polygon, start/end and trimmed streets (saved automatically in your browser) |
| **Import GPX history** | Choose one or more `.gpx`/`.tcx` files of runs you already did. Streets they cover are marked red |
| **Remove ridden streets** | Removes all red streets from the to-do list, so the route only covers what is left |
| **✏️ Draw streets** | Adds a street missing from OpenStreetMap: click a node, then the end point. Right-click deletes the nearest drawn street |
| **Play route / Export video** | Animates the route; the second lets you download it as `.webm` |
| **Start / End lat, lon** | Type coordinates instead of clicking. If you fill in *both*, start and end may lie **outside** the polygon and the route reaches them along real streets |
| **Ignore parks** | Excludes paths, footways, tracks, steps and cycleways (useful when you only want streets) |
| **🎯 Coords by map click** | Click it, then click the map: those coordinates are copied to your clipboard |
| **📍 My location** | Copies your current coordinates (handy for the start field) |
| Map style (bottom right) | Switch base map: streets, OSM, cycling, topographic, satellite |
| Language (top right) | English / Español |

**Mouse:** left-click selects/trims; **right-click** on a grey street restores it.

## 5. Common recipes

- **"Cover my whole town, finishing where I started."** Draw the town → click
  the start junction → click the same junction again as the end → compute.
- **"I don't want to come back to the start."** Choose a different junction as
  the end. The route is an open path from start to end (usually shorter,
  because it does not need to return).
- **"Only streets I haven't run yet."** *Import GPX history* → *Remove ridden
  streets* → choose start/end → compute. Repeat after each run to keep
  progressing.
- **"Fewer hills."** Compute, select an *Elevation* column and compare its
  *Elevation gain* with the *Distance* one.
- **"Split a big town into outings."** Draw a smaller polygon per outing, or
  trim the streets you plan to do on other days.
- **"Start from my house, outside the area."** Fill both *Start* and *End*
  coordinates; the route will approach along actual roads.

## 6. What gets included from OpenStreetMap

Included: streets, roads, paths and pedestrian streets (`highway=*`).
Excluded automatically: motorways, trunk roads, service roads, raceways,
proposed/under-construction ways, elevators, crossings, sidewalks, ways
forbidden to pedestrians and private/no-access ways. Roundabouts are treated as
a single street, and dual carriageways (boulevards) as one street.

## 7. Limits and tips

- Areas bigger than about 25 km² trigger a warning (slow, or rejected by the
  map server). Split them into pieces.
- OpenStreetMap may be incomplete or wrong in your area; use the drawing tool.
- The route follows streets as mapped: always check it is safe (traffic,
  closed paths, private land) before running it.

## 8. Not available yet

See the roadmap in the [README](../README.md#roadmap): a one-way mode for
cars/bikes in the interface and turn restrictions are ideas, **not** implemented.
