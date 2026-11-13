# Credits and licence

CoverTheMap is free software released under the **GNU General Public
License v3.0 or later** (see [LICENSE](LICENSE)). In plain words: you may use,
study, share and modify it, but if you distribute a modified version you must
also publish its source under the same licence.

## Project lineage

This project is a derivative work. Thank you to everyone before it:

1. **[solipsia](https://github.com/solipsia)**: created
   [RunEveryStreet](https://github.com/solipsia/RunEveryStreet) (2020): the
   original idea, the OpenStreetMap graph model, the route search and the p5.js
   visualisation.
2. **[clementh44](https://github.com/clementh44)** and **LeJun**: fork
   [RunEveryStreet](https://github.com/clementh44/RunEveryStreet): area
   selection, one-way streets, live site and UI work.
3. **CoverTheMap** (this repository, by [pedrog223](https://github.com/pedrog223)): exact solver, elevation-aware routes,
   GPX/TCX history import, session save/restore, drawing tool, extra base maps,
   bilingual interface, tests and documentation.

## Third-party code and data

| Component | Use | Licence |
|-----------|-----|---------|
| [Joris van Rantwijk's `mwmatching.py`](https://jorisvr.nl/article/maximum-matching) | Algorithm ported to `src/js/Blossom.js` | Permissive (see the author page) |
| [OpenLayers](https://openlayers.org) | Interactive map | BSD-2-Clause |
| [p5.js](https://p5js.org) | Drawing the street graph and route | LGPL-2.1 |
| [Bootstrap](https://getbootstrap.com) | UI components | MIT |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | Street data, queried via the Overpass API | ODbL: © OpenStreetMap contributors |
| [Overpass API](https://overpass-api.de) | Street-data queries | Community service |
| [Open-Meteo Elevation API](https://open-meteo.com) | Altitudes for elevation-aware routes | CC-BY 4.0 (free for non-commercial use) |
| CyclOSM, OpenTopoMap, Esri, EOX Sentinel-2 | Optional base-map tiles | Each provider's own terms (attribution is shown on the map) |

If you believe someone is missing from this list, please open an issue.
