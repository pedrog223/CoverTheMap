# CoverTheMap 🧹🗺️

**Plan the shortest route that runs (or rides) every street of an area.**
*Planifica la ruta más corta que recorre todas las calles de una zona.*

[English](#english) · [Español](#español)

---

## English

CoverTheMap is a free web app that solves the **Chinese / Rural Postman
Problem** on real maps: you draw an area, it downloads the streets from
OpenStreetMap, and it finds the shortest route that covers all of them. Export
the result as a **GPX** file for your watch or phone. Everything runs in your
browser: no account, no server, no tracking.

**Live site:** https://pedrog223.github.io/CoverTheMap/

### Features

- Draw any area; start and end anywhere (even outside it).
- **Four routes compared side by side:** shortest distance or lowest climbing,
  each with a fast heuristic or a provably optimal (exact) solver.
- **Open path or loop:** pick the same junction for start and end to loop, or a
  different one to avoid coming back.
- **Import your GPX/TCX history** to mark streets you already ran and plan only
  what is left.
- Trim streets you don't want, draw streets missing from the map, ignore parks.
- Save/restore your session, play/export an animation of the route.
- Several base maps (streets, cycling, topographic, satellite).
- English and Spanish interface.

### Using it

Read the **[user guide](docs/USAGE.md)** (5-step tour, every button, recipes).

### Run it locally

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm start        # opens http://localhost:8080
npm test         # runs the solver tests
npm run build    # production build into ./dist
```

### Documentation

| Document | Contents |
|----------|----------|
| [docs/USAGE.md](docs/USAGE.md) / [USO.md](docs/USO.md) | User guide (EN/ES) |
| [docs/ALGORITHMS.md](docs/ALGORITHMS.md) | How the solver works, file map |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Contributing, deploying to GitHub Pages |
| [BIBLIOGRAPHY.md](BIBLIOGRAPHY.md) | Papers behind the algorithms |
| [PRIVACY.md](PRIVACY.md) | What data goes where |
| [CREDITS.md](CREDITS.md) | Lineage, third-party code and data |

### Roadmap

Ideas **not implemented yet** (contributions welcome):

- [ ] Interface switch for one-way streets (car / bicycle modes exist in the code)
- [ ] Turn restrictions
- [ ] Undo for trimmed streets; zoom while trimming
- [ ] Split `main.js` into smaller modules
- [ ] Draw streets differently by type (road, cycleway, path)

### Responsible use

Routes follow streets *as mapped in OpenStreetMap*, which can be incomplete or
outdated. Check traffic, closures and private land. Be considerate with the free
services this app relies on (see [PRIVACY.md](PRIVACY.md) and
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)).

### Licence and credits

GPL-3.0-or-later, see [LICENSE](LICENSE). CoverTheMap is a derivative of
[solipsia/RunEveryStreet](https://github.com/solipsia/RunEveryStreet) and of
[clementh44's fork](https://github.com/clementh44/RunEveryStreet). Full credits
in [CREDITS.md](CREDITS.md). Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.

---

## Español

CoverTheMap es una web gratuita que resuelve el **problema del cartero chino /
cartero rural** sobre mapas reales: dibujas una zona, descarga sus calles de
OpenStreetMap y calcula la ruta más corta que las cubre todas. El resultado se
exporta como **GPX** para tu reloj o móvil. Todo se ejecuta en tu navegador: sin
cuenta, sin servidor, sin seguimiento.

**Web:** https://pedrog223.github.io/CoverTheMap/

### Características

- Dibuja cualquier zona; salida y meta en cualquier punto (incluso fuera de ella).
- **Cuatro rutas comparadas:** distancia mínima o mínimo desnivel, cada una con
  un método rápido (heurístico) o uno demostrablemente óptimo (exacto).
- **Circuito o camino abierto:** mismo cruce de salida y meta = circuito; otro
  distinto = no hace falta volver.
- **Importa tu historial GPX/TCX** para marcar las calles ya corridas y planificar
  solo lo que falta.
- Recorta calles, dibuja calles que faltan en el mapa, ignora parques.
- Guarda y restaura tu sesión; reproduce o exporta una animación de la ruta.
- Varios mapas base (calles, ciclismo, topográfico, satélite).
- Interfaz en español e inglés.

### Uso

Lee la **[guía de uso](docs/USO.md)** (recorrido en 5 pasos, todos los botones,
recetas).

### Ejecutar en local

Necesitas [Node.js](https://nodejs.org) 18 o superior.

```bash
npm install
npm start        # abre http://localhost:8080
npm test         # ejecuta los tests del solver
npm run build    # compilación de producción en ./dist
```

### Hoja de ruta (roadmap)

Ideas **aún no implementadas** (se aceptan contribuciones):

- [ ] Interruptor en la interfaz para calles de sentido único (existen los modos coche/bici en el código)
- [ ] Restricciones de giro
- [ ] Deshacer calles recortadas; zoom mientras se recorta
- [ ] Dividir `main.js` en módulos más pequeños
- [ ] Dibujar de forma distinta cada tipo de vía (calle, carril bici, sendero)

### Uso responsable

Las rutas siguen las calles *tal como están en OpenStreetMap*, que puede estar
incompleto o desactualizado. Comprueba tráfico, cortes y propiedad privada. Sé
considerado con los servicios gratuitos de los que depende la aplicación.

### Licencia y créditos

GPL-3.0-or-later, ver [LICENSE](LICENSE). CoverTheMap deriva de
[solipsia/RunEveryStreet](https://github.com/solipsia/RunEveryStreet) y del
[fork de clementh44](https://github.com/clementh44/RunEveryStreet). Créditos
completos en [CREDITS.md](CREDITS.md). Datos del mapa © colaboradores de
[OpenStreetMap](https://www.openstreetmap.org/copyright).
