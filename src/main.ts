import './styles.css';
import DxfParser from 'dxf-parser';
import type { IDxf, ILayer } from 'dxf-parser';
import { renderDxf, computeBBox } from './dxf-renderer';
import { exportToPdf } from './pdf-export';
import type { Annotation, ToolMode, ViewState } from './types';

// ---- State ----
let dxf: IDxf | null = null;
let annotations: Annotation[] = [];
let currentTool: ToolMode = 'pan';
let hiddenLayers = new Set<string>();

const view: ViewState = { offsetX: 0, offsetY: 0, scale: 1 };

// ---- DOM Elements ----
const canvas = document.getElementById('render-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const dropZone = document.getElementById('drop-zone')!;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const coordsDisplay = document.getElementById('coords-display')!;
const layersList = document.getElementById('layers-list')!;
const annotationsList = document.getElementById('annotations-list')!;
const modalOverlay = document.getElementById('modal-overlay')!;
const modalTitle = document.getElementById('modal-title')!;
const modalInput = document.getElementById('modal-input') as HTMLInputElement;
const modalCancel = document.getElementById('modal-cancel')!;
const modalOk = document.getElementById('modal-ok')!;

const toolPan = document.getElementById('tool-pan')!;
const toolText = document.getElementById('tool-text')!;
const toolDimension = document.getElementById('tool-dimension')!;
const btnZoomFit = document.getElementById('btn-zoom-fit')!;
const btnZoomIn = document.getElementById('btn-zoom-in')!;
const btnZoomOut = document.getElementById('btn-zoom-out')!;
const btnClearAnnotations = document.getElementById('btn-clear-annotations')!;
const btnExportPdf = document.getElementById('btn-export-pdf')!;

// ---- Canvas Sizing ----
function resizeCanvas() {
  const rect = canvas.parentElement!.getBoundingClientRect();
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  render();
}

window.addEventListener('resize', resizeCanvas);

// ---- Render Loop ----
function render() {
  const w = canvas.width / devicePixelRatio;
  const h = canvas.height / devicePixelRatio;
  ctx.save();
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

  if (!dxf) {
    ctx.clearRect(0, 0, w, h);
    ctx.restore();
    return;
  }

  renderDxf(ctx, dxf, view, w, h, hiddenLayers, annotations);
  ctx.restore();
}

// ---- File Loading ----
function loadDxfString(content: string) {
  const parser = new DxfParser();
  try {
    dxf = parser.parseSync(content);
  } catch (err) {
    alert('Failed to parse DXF file: ' + (err as Error).message);
    return;
  }
  if (!dxf) {
    alert('Failed to parse DXF file.');
    return;
  }

  dropZone.classList.add('hidden');
  annotations = [];
  hiddenLayers.clear();

  populateLayers();
  updateAnnotationsList();
  zoomToFit();
}

function loadFile(file: File) {
  if (!file.name.toLowerCase().endsWith('.dxf')) {
    alert('Please select a .dxf file.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    loadDxfString(reader.result as string);
  };
  reader.readAsText(file);
}

// File input
fileInput.addEventListener('change', () => {
  if (fileInput.files && fileInput.files[0]) {
    loadFile(fileInput.files[0]);
  }
});

// Drag and drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer?.files[0]) {
    loadFile(e.dataTransfer.files[0]);
  }
});

// Also allow drop on the whole viewport when file already loaded
const viewport = document.getElementById('viewport')!;
viewport.addEventListener('dragover', (e) => {
  e.preventDefault();
});
viewport.addEventListener('drop', (e) => {
  e.preventDefault();
  if (e.dataTransfer?.files[0]) {
    loadFile(e.dataTransfer.files[0]);
  }
});

// ---- Layers ----
function populateLayers() {
  if (!dxf) return;
  const layers = (dxf.tables?.layer as any)?.layers as Record<string, ILayer> | undefined;
  if (!layers) {
    layersList.innerHTML = '<em>No layers</em>';
    return;
  }

  const layerNames = Object.keys(layers).sort();
  layersList.innerHTML = '';

  for (const name of layerNames) {
    const layer = layers[name];
    const color = layer.color != null
      ? '#' + ('000000' + layer.color.toString(16)).slice(-6)
      : '#ffffff';

    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    cb.addEventListener('change', () => {
      if (cb.checked) {
        hiddenLayers.delete(name);
      } else {
        hiddenLayers.add(name);
      }
      render();
    });

    const swatch = document.createElement('span');
    swatch.className = 'layer-color-swatch';
    swatch.style.background = color;

    label.appendChild(cb);
    label.appendChild(swatch);
    label.appendChild(document.createTextNode(' ' + name));
    layersList.appendChild(label);
  }
}

// ---- View Controls ----
function zoomToFit() {
  if (!dxf) return;
  const bbox = computeBBox(dxf.entities);
  const w = canvas.width / devicePixelRatio;
  const h = canvas.height / devicePixelRatio;
  const bboxW = bbox.maxX - bbox.minX;
  const bboxH = bbox.maxY - bbox.minY;

  if (bboxW <= 0 || bboxH <= 0) return;

  const padding = 0.9; // 10% margin
  const scaleX = (w * padding) / bboxW;
  const scaleY = (h * padding) / bboxH;
  view.scale = Math.min(scaleX, scaleY);

  const centerX = (bbox.minX + bbox.maxX) / 2;
  const centerY = (bbox.minY + bbox.maxY) / 2;
  view.offsetX = w / 2 - centerX * view.scale;
  view.offsetY = h / 2 + centerY * view.scale;

  render();
}

btnZoomFit.addEventListener('click', zoomToFit);

btnZoomIn.addEventListener('click', () => {
  const w = canvas.width / devicePixelRatio;
  const h = canvas.height / devicePixelRatio;
  zoomAt(w / 2, h / 2, 1.3);
});

btnZoomOut.addEventListener('click', () => {
  const w = canvas.width / devicePixelRatio;
  const h = canvas.height / devicePixelRatio;
  zoomAt(w / 2, h / 2, 1 / 1.3);
});

function zoomAt(screenX: number, screenY: number, factor: number) {
  const wxBefore = (screenX - view.offsetX) / view.scale;
  const wyBefore = -(screenY - view.offsetY) / view.scale;

  view.scale *= factor;

  view.offsetX = screenX - wxBefore * view.scale;
  view.offsetY = screenY + wyBefore * view.scale;

  render();
}

// ---- Mouse / Interaction ----
let isPanning = false;
let lastMouseX = 0;
let lastMouseY = 0;
let spaceHeld = false;

function screenToWorld(sx: number, sy: number): { x: number; y: number } {
  const wx = (sx - view.offsetX) / view.scale;
  const wy = -(sy - view.offsetY) / view.scale;
  return { x: wx, y: wy };
}

function getCanvasXY(e: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

// Scroll zoom
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const { x, y } = getCanvasXY(e);
  const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
  zoomAt(x, y, factor);
}, { passive: false });

// Pan with middle mouse or space+drag
canvas.addEventListener('mousedown', (e) => {
  const { x, y } = getCanvasXY(e);

  if (e.button === 1 || (e.button === 0 && (currentTool === 'pan' || spaceHeld))) {
    isPanning = true;
    lastMouseX = x;
    lastMouseY = y;
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
    return;
  }

  if (e.button === 0 && dxf) {
    const world = screenToWorld(x, y);
    if (currentTool === 'text') {
      showModal('Add Text Note', 'Enter text...', (text) => {
        annotations.push({
          id: crypto.randomUUID(),
          type: 'text',
          x: world.x,
          y: world.y,
          text,
        });
        updateAnnotationsList();
        render();
      });
    } else if (currentTool === 'dimension') {
      showModal('Dimension Override', 'Enter dimension value...', (text) => {
        annotations.push({
          id: crypto.randomUUID(),
          type: 'dimension',
          x: world.x,
          y: world.y,
          text,
        });
        updateAnnotationsList();
        render();
      });
    }
  }
});

canvas.addEventListener('mousemove', (e) => {
  const { x, y } = getCanvasXY(e);

  if (isPanning) {
    const dx = x - lastMouseX;
    const dy = y - lastMouseY;
    view.offsetX += dx;
    view.offsetY += dy;
    lastMouseX = x;
    lastMouseY = y;
    render();
    return;
  }

  // Update coordinate display
  const world = screenToWorld(x, y);
  coordsDisplay.textContent = `X: ${world.x.toFixed(2)}  Y: ${world.y.toFixed(2)}`;
});

canvas.addEventListener('mouseup', () => {
  isPanning = false;
  updateCursor();
});

canvas.addEventListener('mouseleave', () => {
  isPanning = false;
  updateCursor();
});

// Prevent middle-click scroll
canvas.addEventListener('auxclick', (e) => { if (e.button === 1) e.preventDefault(); });

// Space key for temporary pan
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !spaceHeld && document.activeElement === document.body) {
    spaceHeld = true;
    updateCursor();
    e.preventDefault();
  }
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    spaceHeld = false;
    updateCursor();
  }
});

function updateCursor() {
  if (currentTool === 'pan' || spaceHeld) {
    canvas.style.cursor = 'grab';
  } else if (currentTool === 'text') {
    canvas.style.cursor = 'text';
  } else if (currentTool === 'dimension') {
    canvas.style.cursor = 'crosshair';
  }
}

// ---- Tool Selection ----
function setTool(tool: ToolMode) {
  currentTool = tool;
  toolPan.classList.toggle('active', tool === 'pan');
  toolText.classList.toggle('active', tool === 'text');
  toolDimension.classList.toggle('active', tool === 'dimension');
  updateCursor();
}

toolPan.addEventListener('click', () => setTool('pan'));
toolText.addEventListener('click', () => setTool('text'));
toolDimension.addEventListener('click', () => setTool('dimension'));

// ---- Annotations List ----
function updateAnnotationsList() {
  if (annotations.length === 0) {
    annotationsList.innerHTML = '<em>None</em>';
    return;
  }
  annotationsList.innerHTML = '';
  for (const ann of annotations) {
    const div = document.createElement('div');
    div.className = 'annotation-item';

    const label = document.createElement('span');
    const icon = ann.type === 'text' ? 'T' : 'D';
    const truncated = ann.text.length > 16 ? ann.text.slice(0, 16) + '...' : ann.text;
    label.textContent = `[${icon}] ${truncated}`;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'x';
    removeBtn.title = 'Remove';
    removeBtn.addEventListener('click', () => {
      annotations = annotations.filter(a => a.id !== ann.id);
      updateAnnotationsList();
      render();
    });

    div.appendChild(label);
    div.appendChild(removeBtn);
    annotationsList.appendChild(div);
  }
}

btnClearAnnotations.addEventListener('click', () => {
  annotations = [];
  updateAnnotationsList();
  render();
});

// ---- Modal ----
let modalCallback: ((text: string) => void) | null = null;

function showModal(title: string, placeholder: string, onOk: (text: string) => void) {
  modalTitle.textContent = title;
  modalInput.placeholder = placeholder;
  modalInput.value = '';
  modalOverlay.classList.remove('hidden');
  modalCallback = onOk;
  setTimeout(() => modalInput.focus(), 50);
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  modalCallback = null;
}

modalCancel.addEventListener('click', closeModal);

modalOk.addEventListener('click', () => {
  const text = modalInput.value.trim();
  if (text && modalCallback) {
    modalCallback(text);
  }
  closeModal();
});

modalInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    modalOk.click();
  } else if (e.key === 'Escape') {
    closeModal();
  }
});

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

// ---- Export ----
btnExportPdf.addEventListener('click', () => {
  if (!dxf) {
    alert('No DXF file loaded.');
    return;
  }
  exportToPdf(dxf, annotations, hiddenLayers);
});

// ---- Init ----
resizeCanvas();
