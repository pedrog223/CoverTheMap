# Privacy

CoverTheMap has **no server of its own**: it is a static web page, and all
calculations run in your browser.

- **Your GPX/TCX files never leave your device.** They are read locally to
  work out which streets you already ran; they are not uploaded anywhere.
- **Saved session**: the area you drew, start/end and trimmed streets are stored
  in your browser's `localStorage` so you can restore them. Elevation values are
  cached there too. Clear your browser's site data to erase it.
- **Third-party services contacted** (they see your IP address and the request):
  - Overpass API (street data for the polygon you drew; the polygon's coordinates
    are sent in the request).
  - Open-Meteo (coordinates of street nodes, to get altitudes).
  - The selected base-map provider (tile requests for the visible map area).
- **Your location** is used only if you press "My location", and is only copied
  to your clipboard, never sent by CoverTheMap anywhere.
- There are no cookies, analytics or ads.

Tip: if you publish routes from your home area, remember that a GPX of the
streets around your home can reveal where you live.
