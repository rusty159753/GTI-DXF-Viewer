import { jsPDF } from 'jspdf';
import type { IDxf } from 'dxf-parser';
import type { Annotation, ViewState } from './types';
import { computeBBox, renderDxf } from './dxf-renderer';

export function exportToPdf(
  dxf: IDxf,
  annotations: Annotation[],
  hiddenLayers: Set<string>
) {
  const bbox = computeBBox(dxf.entities);
  const bboxW = bbox.maxX - bbox.minX;
  const bboxH = bbox.maxY - bbox.minY;

  if (bboxW <= 0 || bboxH <= 0) {
    alert('No geometry to export.');
    return;
  }

  // Use landscape A4-ish proportions, fit content
  const pdfWidth = 297; // mm (A4 landscape)
  const pdfHeight = 210;
  const margin = 15;
  const drawW = pdfWidth - margin * 2;
  const drawH = pdfHeight - margin * 2;

  const scaleX = drawW / bboxW;
  const scaleY = drawH / bboxH;
  const scale = Math.min(scaleX, scaleY);

  // Render to an offscreen canvas
  const canvasW = Math.ceil(pdfWidth * 4); // 4x resolution
  const canvasH = Math.ceil(pdfHeight * 4);
  const offscreen = document.createElement('canvas');
  offscreen.width = canvasW;
  offscreen.height = canvasH;
  const ctx = offscreen.getContext('2d')!;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Map margin and content
  const pixelScale = canvasW / pdfWidth;
  const renderScale = scale * pixelScale;

  const centerX = (bbox.minX + bbox.maxX) / 2;
  const centerY = (bbox.minY + bbox.maxY) / 2;

  const viewState: ViewState = {
    scale: renderScale,
    offsetX: canvasW / 2 - centerX * renderScale,
    offsetY: canvasH / 2 + centerY * renderScale, // +Y because of flip
    rotation: 0,
  };

  // Override colors for print (dark on white)
  // We'll render normally then invert isn't ideal, so let's just render with a custom approach
  renderDxfForPrint(ctx, dxf, viewState, canvasW, canvasH, hiddenLayers, annotations);

  const imgData = offscreen.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

  // Title
  pdf.setFontSize(8);
  pdf.setTextColor(100);
  pdf.text('GTI Glass DXF Viewer - Export', margin, 8);
  pdf.text(new Date().toLocaleString(), pdfWidth - margin - 50, 8);

  pdf.save('dxf-export.pdf');
}

function renderDxfForPrint(
  ctx: CanvasRenderingContext2D,
  dxf: IDxf,
  view: ViewState,
  canvasWidth: number,
  canvasHeight: number,
  hiddenLayers: Set<string>,
  annotations: Annotation[]
) {
  // Render with dark colors on white background
  // We temporarily override - render normally but post-process isn't easy,
  // so we'll render with a global composite trick
  renderDxf(ctx, dxf, view, canvasWidth, canvasHeight, hiddenLayers, annotations);

  // Invert the colors for print (white lines on dark -> dark lines on white)
  ctx.save();
  ctx.globalCompositeOperation = 'difference';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.restore();
}
