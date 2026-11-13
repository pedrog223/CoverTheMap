# Development guide

## Set-up

```bash
git clone https://github.com/pedrog223/CoverTheMap.git
cd CoverTheMap
npm install
npm start          # dev server with auto-reload at http://localhost:8080
npm test           # unit tests (Node's built-in test runner, no extra tools)
npm run build      # production build in ./dist
```

Project layout: see the source map in [ALGORITHMS.md](ALGORITHMS.md#source-map).

## Adding or changing interface text

All user-visible strings live in `src/js/i18n.js`. Static HTML elements use
`data-i18n="key"` (also `data-i18n-title`, `data-i18n-placeholder`,
`data-i18n-aria`); strings built in JavaScript call `t("key", {vars})`.
To add a language, copy one block of `MESSAGES`, translate it and add the code to
`SUPPORTED` (and an `<option>` in `public/index.html`).

## Publishing the site (GitHub Pages)

The workflow in `.github/workflows/deploy.yml` tests, builds and publishes on every
push to `main`. One-time setup: repository **Settings → Pages → Build and
deployment → Source: GitHub Actions**. The site appears at
`https://<user>.github.io/<repo>/`.

## A note on external services

The app relies on free public services (Overpass for streets, Open-Meteo for
altitudes, OpenStreetMap for map tiles). They are fine for normal use; just
keep the map attribution visible and avoid bulk or automatic requests.

## Code style

Plain modern JavaScript, no framework. Document every function with JSDoc
(what, parameters, result) and explain *why* non-obvious code exists, not just
what it does. Keep `PostmanSolver.js` free of browser APIs so it stays testable.

## Contributing

1. Fork, create a branch, make your change.
2. `npm test` must pass; add a test for solver changes.
3. Open a pull request describing what and why.
