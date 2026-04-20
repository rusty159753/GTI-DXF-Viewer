import type { IEntity, IPoint } from 'dxf-parser';
import type { ILineEntity } from 'dxf-parser/dist/entities/line';
import type { IArcEntity } from 'dxf-parser/dist/entities/arc';
import type { ICircleEntity } from 'dxf-parser/dist/entities/circle';
import type { ILwpolylineEntity } from 'dxf-parser/dist/entities/lwpolyline';
import type { IPolylineEntity } from 'dxf-parser/dist/entities/polyline';
import type { ISplineEntity } from 'dxf-parser/dist/entities/spline';
import type { IEllipseEntity } from 'dxf-parser/dist/entities/ellipse';
import type { IMtextEntity } from 'dxf-parser/dist/entities/mtext';
import type { ITextEntity } from 'dxf-parser/dist/entities/text';
import type { IPointEntity } from 'dxf-parser/dist/entities/point';
import type { ISolidEntity } from 'dxf-parser/dist/entities/solid';
import type { IDxf, ILayer } from 'dxf-parser';
import AutoCadColorIndex from 'dxf-parser/dist/AutoCadColorIndex';
import type { ViewState, Annotation } from './types';

const DEG = Math.PI / 180;

export interface BBox {
  minX: number; minY: number; maxX: number; maxY: number;
}

function colorFromIndex(idx: number): string {
  if (idx === 0 || idx === 256 || idx == null) return '#ffffff';
  const c = AutoCadColorIndex[idx];
  if (c == null) return '#ffffff';
  return '#' + ('000000' + c.toString(16)).slice(-6);
}

function getEntityColor(entity: IEntity, layers: Record<string, ILayer> | undefined): string {
  if (entity.color != null && entity.color !== 0) {
    return '#' + ('000000' + entity.color.toString(16)).slice(-6);
  }
  if (entity.colorIndex != null && entity.colorIndex !== 0 && entity.colorIndex !== 256) {
    return colorFromIndex(entity.colorIndex);
  }
  // inherit from layer
  if (layers && entity.layer && layers[entity.layer]) {
    const layer = layers[entity.layer];
    if (layer.color != null) {
      return '#' + ('000000' + layer.color.toString(16)).slice(-6);
    }
    if (layer.colorIndex != null) {
      return colorFromIndex(layer.colorIndex);
    }
  }
  return '#ffffff';
}

function expandBBox(bbox: BBox, x: number, y: number) {
  if (x < bbox.minX) bbox.minX = x;
  if (x > bbox.maxX) bbox.maxX = x;
  if (y < bbox.minY) bbox.minY = y;
  if (y > bbox.maxY) bbox.maxY = y;
}

export function computeBBox(entities: IEntity[]): BBox {
  const bbox: BBox = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const e of entities) {
    switch (e.type) {
      case 'LINE': {
        const le = e as ILineEntity;
        for (const v of le.vertices) {
          expandBBox(bbox, v.x, v.y);
        }
        break;
      }
      case 'CIRCLE':
      case 'ARC': {
        const ce = e as ICircleEntity | IArcEntity;
        expandBBox(bbox, ce.center.x - ce.radius, ce.center.y - ce.radius);
        expandBBox(bbox, ce.center.x + ce.radius, ce.center.y + ce.radius);
        break;
      }
      case 'LWPOLYLINE': {
        const lw = e as ILwpolylineEntity;
        for (const v of lw.vertices) {
          expandBBox(bbox, v.x, v.y);
        }
        break;
      }
      case 'POLYLINE': {
        const pl = e as IPolylineEntity;
        for (const v of pl.vertices) {
          expandBBox(bbox, v.x, v.y);
        }
        break;
      }
      case 'ELLIPSE': {
        const el = e as IEllipseEntity;
        const mx = Math.abs(el.majorAxisEndPoint.x);
        const my = Math.abs(el.majorAxisEndPoint.y);
        const r = Math.max(mx, my);
        expandBBox(bbox, el.center.x - r, el.center.y - r);
        expandBBox(bbox, el.center.x + r, el.center.y + r);
        break;
      }
      case 'SPLINE': {
        const sp = e as ISplineEntity;
        const pts = sp.controlPoints || sp.fitPoints || [];
        for (const p of pts) {
          expandBBox(bbox, p.x, p.y);
        }
        break;
      }
      case 'MTEXT': {
        const mt = e as IMtextEntity;
        expandBBox(bbox, mt.position.x, mt.position.y);
        break;
      }
      case 'TEXT': {
        const tx = e as ITextEntity;
        expandBBox(bbox, tx.startPoint.x, tx.startPoint.y);
        break;
      }
      case 'POINT': {
        const pt = e as IPointEntity;
        expandBBox(bbox, pt.position.x, pt.position.y);
        break;
      }
      case 'SOLID': {
        const sol = e as ISolidEntity;
        if (sol.points) {
          for (const p of sol.points) {
            expandBBox(bbox, p.x, p.y);
          }
        }
        break;
      }
    }
  }
  if (!isFinite(bbox.minX)) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
  }
  return bbox;
}

export function renderDxf(
  ctx: CanvasRenderingContext2D,
  dxf: IDxf,
  view: ViewState,
  canvasWidth: number,
  canvasHeight: number,
  hiddenLayers: Set<string>,
  annotations: Annotation[]
) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.save();

  // Apply view transform: translate, rotate, then scale
  ctx.translate(view.offsetX, view.offsetY);
  if (view.rotation) ctx.rotate(view.rotation);
  ctx.scale(view.scale, -view.scale); // flip Y

  const layers = dxf.tables?.layer?.layers as Record<string, ILayer> | undefined;

  // Render block inserts by inlining block entities
  for (const entity of dxf.entities) {
    if (hiddenLayers.has(entity.layer)) continue;
    if (entity.type === 'INSERT') {
      const ins = entity as any;
      const block = dxf.blocks?.[ins.name];
      if (block) {
        ctx.save();
        ctx.translate(ins.position?.x || 0, ins.position?.y || 0);
        if (ins.rotation) ctx.rotate(ins.rotation * DEG);
        ctx.scale(ins.xScale || 1, ins.yScale || 1);
        for (const be of block.entities) {
          renderEntity(ctx, be, layers);
        }
        ctx.restore();
      }
      continue;
    }
    renderEntity(ctx, entity, layers);
  }

  // Render annotations in world space
  ctx.save();
  ctx.scale(1, -1); // un-flip Y for text
  for (const ann of annotations) {
    const fontSize = 3 / view.scale * view.scale; // fixed-ish size
    const worldFontSize = Math.max(2, 8 / view.scale);
    ctx.font = `bold ${worldFontSize}px sans-serif`;

    if (ann.type === 'text') {
      ctx.fillStyle = '#00ff88';
      ctx.fillText(ann.text, ann.x, -ann.y);
      // small marker
      ctx.beginPath();
      ctx.arc(ann.x, -ann.y, worldFontSize * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // dimension override
      ctx.fillStyle = '#ffaa00';
      ctx.fillText(ann.text, ann.x, -ann.y);
      // small diamond
      const d = worldFontSize * 0.3;
      ctx.beginPath();
      ctx.moveTo(ann.x - d, -ann.y);
      ctx.lineTo(ann.x, -ann.y - d);
      ctx.lineTo(ann.x + d, -ann.y);
      ctx.lineTo(ann.x, -ann.y + d);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.restore();
}

function renderEntity(
  ctx: CanvasRenderingContext2D,
  entity: IEntity,
  layers: Record<string, ILayer> | undefined
) {
  const color = getEntityColor(entity, layers);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 0.5;

  switch (entity.type) {
    case 'LINE':
      drawLine(ctx, entity as ILineEntity);
      break;
    case 'ARC':
      drawArc(ctx, entity as IArcEntity);
      break;
    case 'CIRCLE':
      drawCircle(ctx, entity as ICircleEntity);
      break;
    case 'LWPOLYLINE':
      drawLwPolyline(ctx, entity as ILwpolylineEntity);
      break;
    case 'POLYLINE':
      drawPolyline(ctx, entity as IPolylineEntity);
      break;
    case 'ELLIPSE':
      drawEllipse(ctx, entity as IEllipseEntity);
      break;
    case 'SPLINE':
      drawSpline(ctx, entity as ISplineEntity);
      break;
    case 'MTEXT':
      drawMtext(ctx, entity as IMtextEntity);
      break;
    case 'TEXT':
      drawText(ctx, entity as ITextEntity);
      break;
    case 'POINT':
      drawPoint(ctx, entity as IPointEntity);
      break;
    case 'SOLID':
      drawSolid(ctx, entity as ISolidEntity);
      break;
  }
}

function drawLine(ctx: CanvasRenderingContext2D, e: ILineEntity) {
  if (!e.vertices || e.vertices.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(e.vertices[0].x, e.vertices[0].y);
  ctx.lineTo(e.vertices[1].x, e.vertices[1].y);
  ctx.stroke();
}

function drawArc(ctx: CanvasRenderingContext2D, e: IArcEntity) {
  ctx.beginPath();
  const startAngle = (e.startAngle ?? 0) * DEG;
  const endAngle = (e.endAngle != null ? e.endAngle : 360) * DEG;
  ctx.arc(e.center.x, e.center.y, e.radius, startAngle, endAngle, true);
  ctx.stroke();
}

function drawCircle(ctx: CanvasRenderingContext2D, e: ICircleEntity) {
  ctx.beginPath();
  ctx.arc(e.center.x, e.center.y, e.radius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawLwPolyline(ctx: CanvasRenderingContext2D, e: ILwpolylineEntity) {
  if (!e.vertices || e.vertices.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(e.vertices[0].x, e.vertices[0].y);

  for (let i = 0; i < e.vertices.length; i++) {
    const curr = e.vertices[i];
    const next = e.vertices[(i + 1) % e.vertices.length];
    if (i === e.vertices.length - 1 && !e.shape) break;

    if (curr.bulge && curr.bulge !== 0) {
      // bulge arc
      drawBulgeArc(ctx, curr, next, curr.bulge);
    } else {
      ctx.lineTo(next.x, next.y);
    }
  }
  ctx.stroke();
}

function drawBulgeArc(ctx: CanvasRenderingContext2D, p1: IPoint, p2: IPoint, bulge: number) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1e-10) return;

  const sagitta = (bulge * dist) / 2;
  const radius = Math.abs(((dist / 2) ** 2 + sagitta ** 2) / (2 * sagitta));

  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;

  const angle = Math.atan2(dy, dx);
  const perpAngle = angle + (bulge > 0 ? -Math.PI / 2 : Math.PI / 2);

  const d = radius - Math.abs(sagitta);
  const sign = bulge > 0 ? 1 : -1;
  const cx = midX + d * Math.cos(perpAngle) * sign;
  const cy = midY + d * Math.sin(perpAngle) * sign;

  const startAngle = Math.atan2(p1.y - cy, p1.x - cx);
  const endAngle = Math.atan2(p2.y - cy, p2.x - cx);

  ctx.arc(cx, cy, radius, startAngle, endAngle, bulge > 0);
}

function drawPolyline(ctx: CanvasRenderingContext2D, e: IPolylineEntity) {
  if (!e.vertices || e.vertices.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(e.vertices[0].x, e.vertices[0].y);
  for (let i = 1; i < e.vertices.length; i++) {
    ctx.lineTo(e.vertices[i].x, e.vertices[i].y);
  }
  if (e.shape) {
    ctx.closePath();
  }
  ctx.stroke();
}

function drawEllipse(ctx: CanvasRenderingContext2D, e: IEllipseEntity) {
  const majorLen = Math.sqrt(
    e.majorAxisEndPoint.x ** 2 + e.majorAxisEndPoint.y ** 2
  );
  const minorLen = majorLen * e.axisRatio;
  const rotation = Math.atan2(e.majorAxisEndPoint.y, e.majorAxisEndPoint.x);

  ctx.beginPath();
  ctx.ellipse(
    e.center.x,
    e.center.y,
    majorLen,
    minorLen,
    rotation,
    e.startAngle || 0,
    e.endAngle || Math.PI * 2
  );
  ctx.stroke();
}

function deBoor(degree: number, knots: number[], ctrlPts: IPoint[], t: number): { x: number; y: number } {
  // Find knot span index k such that knots[k] <= t < knots[k+1]
  const n = ctrlPts.length - 1;
  let k = degree;
  for (let i = degree; i <= n; i++) {
    if (t >= knots[i] && t < knots[i + 1]) { k = i; break; }
  }
  // Handle t at the very end
  if (t >= knots[n + 1]) k = n;

  // Copy the relevant control points
  const d: { x: number; y: number }[] = [];
  for (let j = 0; j <= degree; j++) {
    const idx = Math.max(0, Math.min(n, k - degree + j));
    d.push({ x: ctrlPts[idx].x, y: ctrlPts[idx].y });
  }

  for (let r = 1; r <= degree; r++) {
    for (let j = degree; j >= r; j--) {
      const i = k - degree + j;
      const denom = knots[i + degree - r + 1] - knots[i];
      if (Math.abs(denom) < 1e-10) continue;
      const alpha = (t - knots[i]) / denom;
      d[j].x = (1 - alpha) * d[j - 1].x + alpha * d[j].x;
      d[j].y = (1 - alpha) * d[j - 1].y + alpha * d[j].y;
    }
  }
  return d[degree];
}

function drawSpline(ctx: CanvasRenderingContext2D, e: ISplineEntity) {
  // If we have control points and knot values, use proper B-spline evaluation
  if (e.controlPoints && e.controlPoints.length >= 2 && e.knotValues && e.knotValues.length > 0) {
    const degree = e.degreeOfSplineCurve || 3;
    const knots = e.knotValues;
    const ctrlPts = e.controlPoints;

    const tMin = knots[degree];
    const tMax = knots[knots.length - 1 - degree];
    if (tMax <= tMin) {
      drawSplineFallback(ctx, e);
      return;
    }

    const segments = Math.max(ctrlPts.length * 8, 64);
    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const t = tMin + (tMax - tMin) * (i / segments);
      const pt = deBoor(degree, knots, ctrlPts, t);
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
    return;
  }

  drawSplineFallback(ctx, e);
}

function drawSplineFallback(ctx: CanvasRenderingContext2D, e: ISplineEntity) {
  const pts = e.fitPoints || e.controlPoints;
  if (!pts || pts.length < 2) return;

  if (pts.length === 2) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.stroke();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);

  if (pts.length === 3) {
    ctx.quadraticCurveTo(pts[1].x, pts[1].y, pts[2].x, pts[2].y);
  } else {
    for (let i = 1; i < pts.length - 2; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2;
      const yc = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
    }
    const n = pts.length - 1;
    ctx.quadraticCurveTo(pts[n - 1].x, pts[n - 1].y, pts[n].x, pts[n].y);
  }
  ctx.stroke();
}

function drawMtext(ctx: CanvasRenderingContext2D, e: IMtextEntity) {
  if (!e.text) return;
  ctx.save();
  const h = e.height || 2;
  ctx.translate(e.position.x, e.position.y);
  ctx.scale(1, -1); // un-flip for text
  if (e.rotation) ctx.rotate(-e.rotation * DEG);
  ctx.font = `${h}px sans-serif`;
  // Strip MText formatting codes
  const clean = e.text.replace(/\\[A-Za-z][^;]*;/g, '').replace(/\{|\}/g, '');
  ctx.fillText(clean, 0, 0);
  ctx.restore();
}

function drawText(ctx: CanvasRenderingContext2D, e: ITextEntity) {
  if (!e.text) return;
  ctx.save();
  const h = e.textHeight || 2;
  const pos = e.startPoint || e.endPoint;
  ctx.translate(pos.x, pos.y);
  ctx.scale(1, -1);
  if (e.rotation) ctx.rotate(-e.rotation * DEG);
  ctx.font = `${h}px sans-serif`;
  ctx.fillText(e.text, 0, 0);
  ctx.restore();
}

function drawPoint(ctx: CanvasRenderingContext2D, e: IPointEntity) {
  const size = 1;
  const x = e.position.x;
  const y = e.position.y;
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);
  ctx.stroke();
}

function drawSolid(ctx: CanvasRenderingContext2D, e: ISolidEntity) {
  if (!e.points || e.points.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(e.points[0].x, e.points[0].y);
  ctx.lineTo(e.points[1].x, e.points[1].y);
  // DXF SOLID vertex order: 0, 1, 3, 2 (swapped 2 and 3)
  if (e.points.length >= 4) {
    ctx.lineTo(e.points[3].x, e.points[3].y);
    ctx.lineTo(e.points[2].x, e.points[2].y);
  } else {
    ctx.lineTo(e.points[2].x, e.points[2].y);
  }
  ctx.closePath();
  ctx.globalAlpha = 0.3;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.stroke();
}
