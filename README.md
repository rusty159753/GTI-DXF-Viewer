# GTI DXF Viewer

A zero-install, browser-based AutoCAD DXF viewer and lightweight 2D editor for glass manufacturing templates. Runs entirely client-side — no backend server required.

## Features

- **Drag & Drop** — Open `.dxf` files by dragging onto the viewport or using the file picker
- **2D Geometry Rendering** — Lines, Arcs, Circles, Polylines, Splines, Ellipses, Text, MText, Block Inserts
- **Viewport Controls** — Pan (middle-click or Space+drag), Zoom (scroll wheel), Zoom to Fit
- **Layer Visibility** — Toggle individual DXF layers on/off
- **Text Notation Tool** — Click anywhere on the canvas to place custom text notes
- **Dimension Override Tool** — Click near a segment to add a visual dimension override for glass cutters
- **Export to PDF** — Captures base DXF geometry plus all annotations to a downloadable A4 landscape PDF
- **Live Coordinates** — Real-time X/Y world coordinate display in the sidebar

## Quick Start

### Development

```bash
npm install
npm run dev
```

### Production Build

```bash
npm run build
```

The compiled static site is output to the `dist/` folder.

### Running the Production Build

Option 1 — Python HTTP server:
```bash
cd dist
python3 -m http.server 8080
# open http://localhost:8080
```

Option 2 — Vite preview:
```bash
npm run preview
```

Option 3 — Open `dist/index.html` directly in a browser (works for most browsers).

## Tech Stack

- **Vite** — Build tool (vanilla TypeScript)
- **dxf-parser** — ASCII DXF file parsing
- **Canvas 2D** — Geometry rendering with orthographic projection
- **jsPDF** — PDF export
