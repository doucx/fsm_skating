import {
  ComputedGeometry,
  ArcSegment,
  Point2D,
  parseState,
  getArcProgressInfo,
} from './geometry';

export interface TrackerInfo {
  state: string;
  prevMove: string;
  nextMove: string;
}

export class CanvasRenderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  zoomFactor: number = 1.0;
  panX: number = 0;
  panY: number = 0;

  constructor(canvas: HTMLCanvasElement | string) {
    if (typeof canvas === 'string') {
      const el = document.getElementById(canvas) as HTMLCanvasElement;
      if (!el) throw new Error(`Canvas element #${canvas} not found`);
      this.canvas = el;
    } else {
      this.canvas = canvas;
    }
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Failed to get 2d context');
    this.ctx = context;
  }

  private getBoundsAndScale(nodes: ComputedGeometry['nodes'], pad = 35) {
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;
    nodes.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const w = maxX - minX || 1;
    const h = maxY - minY || 1;
    const scale = Math.min(
      (this.canvas.width - 2 * pad) / w,
      (this.canvas.height - 2 * pad) / h,
      1.5
    );

    return { minX, minY, w, h, scale };
  }

  getTransform(nodes: ComputedGeometry['nodes']) {
    const { minX, minY, w, h, scale } = this.getBoundsAndScale(nodes);

    const offsetX = (this.canvas.width - w * scale) / 2 - minX * scale;
    const offsetY = (this.canvas.height - h * scale) / 2 - minY * scale;

    return (px: number, py: number) => {
      const ax = px * scale + offsetX;
      const ay = py * scale + offsetY;

      if (!document.fullscreenElement) {
        return { x: ax, y: ay };
      }

      const cx = this.canvas.width / 2;
      const cy = this.canvas.height / 2;
      return {
        x: (ax - cx) * this.zoomFactor + cx + this.panX,
        y: (ay - cy) * this.zoomFactor + cy + this.panY,
      };
    };
  }

  resetViewport() {
    this.zoomFactor = 1.0;
    this.panX = 0;
    this.panY = 0;
  }

  draw(geometry: ComputedGeometry) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const { nodes, arcs } = geometry;
    if (nodes.length === 0) return;

    const transform = this.getTransform(nodes);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 20; i < this.canvas.width; i += 30) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, this.canvas.height);
      ctx.stroke();
    }
    for (let j = 20; j < this.canvas.height; j += 30) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(this.canvas.width, j);
      ctx.stroke();
    }

    const fFactor = document.fullscreenElement ? this.zoomFactor : 1.0;

    arcs.forEach((arc, idx) => {
      ctx.save();
      ctx.beginPath();

      arc.points.forEach((pt, pIdx) => {
        const trans = transform(pt.x, pt.y);
        if (pIdx === 0) ctx.moveTo(trans.x, trans.y);
        else ctx.lineTo(trans.x, trans.y);
      });

      const progressRatio = (idx + 1) / arcs.length;
      const stateInfo = parseState(arc.state);
      const isLeft = stateInfo.isLeft;
      const isForward = stateInfo.isForward;

      const baseColor = isLeft ? '56, 189, 248' : '249, 115, 22';
      ctx.strokeStyle = `rgba(${baseColor}, ${0.5 + progressRatio * 0.5})`;
      ctx.shadowColor = `rgba(${baseColor}, 0.65)`;
      ctx.lineWidth = 3.5 * fFactor;
      ctx.shadowBlur = 12 * fFactor;

      if (isForward) {
        ctx.setLineDash([]);
      } else {
        ctx.setLineDash([6 * fFactor, 4 * fFactor]);
      }

      ctx.stroke();
      ctx.restore();

      const midInfo = getArcProgressInfo(arc, 0.5);
      const midTrans = transform(midInfo.x, midInfo.y);

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(11 * fFactor)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(arc.state, midTrans.x, midTrans.y - 10 * fFactor);

      this.drawArrow(transform, arc, midInfo, isLeft, fFactor);
    });

    nodes.forEach((node, idx) => {
      const pt = transform(node.x, node.y);
      const isLast = idx === nodes.length - 1;

      ctx.save();
      if (idx === 0) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6 * fFactor, 0, 2 * Math.PI);
        ctx.fillStyle = '#10b981';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 * fFactor;
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.font = `bold ${Math.round(10 * fFactor)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('START', pt.x, pt.y + 16 * fFactor);
      } else if (
        node.move &&
        ['three_turn', 'bracket', 'mohawk'].includes(node.move.category)
      ) {
        this.drawISUSymbol(pt, node.move.category, fFactor);

        ctx.fillStyle = '#94a3b8';
        ctx.font = `${Math.round(10 * fFactor)}px sans-serif`;
        ctx.textAlign = 'center';
        const miniName = node.move.name.split(' ')[0].substring(0, 4);
        ctx.fillText(miniName, pt.x, pt.y - 12 * fFactor);
      } else {
        ctx.beginPath();
        const markerR = (isLast ? 6 : 4) * fFactor;
        ctx.arc(pt.x, pt.y, markerR, 0, 2 * Math.PI);
        ctx.fillStyle = isLast ? '#38bdf8' : '#0f172a';
        ctx.strokeStyle = isLast ? '#ffffff' : '#0284c7';
        ctx.lineWidth = (isLast ? 2.5 : 2) * fFactor;
        ctx.fill();
        ctx.stroke();

        if (node.move) {
          ctx.fillStyle = '#94a3b8';
          ctx.font = `${Math.round(10 * fFactor)}px sans-serif`;
          ctx.textAlign = 'center';
          const miniName = node.move.name.split(' ')[0].substring(0, 4);
          ctx.fillText(miniName, pt.x, pt.y - 12 * fFactor);
        }
      }
      ctx.restore();
    });
  }

  private drawArrow(
    transform: (x: number, y: number) => { x: number; y: number },
    _arc: ArcSegment,
    midInfo: Point2D,
    isLeft: boolean,
    fFactor: number
  ) {
    const ctx = this.ctx;
    const pMid = transform(midInfo.x, midInfo.y);
    const arrowAngle = midInfo.theta;

    const arrowLength = 9 * fFactor;
    const arrowWidth = 5 * fFactor;
    const backX = pMid.x - arrowLength * Math.cos(arrowAngle);
    const backY = pMid.y - arrowLength * Math.sin(arrowAngle);

    const leftX = backX + arrowWidth * Math.cos(arrowAngle + Math.PI / 2);
    const leftY = backY + arrowWidth * Math.sin(arrowAngle + Math.PI / 2);
    const rightX = backX + arrowWidth * Math.cos(arrowAngle - Math.PI / 2);
    const rightY = backY + arrowWidth * Math.sin(arrowAngle - Math.PI / 2);

    ctx.beginPath();
    ctx.moveTo(pMid.x, pMid.y);
    ctx.lineTo(leftX, leftY);
    ctx.lineTo(rightX, rightY);
    ctx.closePath();
    ctx.fillStyle = isLeft
      ? 'rgba(56, 189, 248, 0.85)'
      : 'rgba(249, 115, 22, 0.85)';
    ctx.fill();
  }

  drawTracker(
    geometry: ComputedGeometry,
    progress: number,
    fFactor: number
  ): TrackerInfo | null {
    const { arcs, nodes } = geometry;
    if (!arcs || arcs.length === 0) return null;

    const transform = this.getTransform(nodes);

    const totalLength = arcs.reduce((acc, arc) => acc + arc.length, 0);
    const targetLen = totalLength * progress;
    let currentLen = 0;
    let targetArc = arcs[arcs.length - 1];
    let localProgress = 1.0;

    let targetIdx = arcs.length - 1;
    for (let i = 0; i < arcs.length; i++) {
      const arc = arcs[i];
      if (currentLen + arc.length >= targetLen) {
        targetArc = arc;
        targetIdx = i;
        localProgress = (targetLen - currentLen) / arc.length;
        break;
      }
      currentLen += arc.length;
    }

    const posInfo = getArcProgressInfo(targetArc, localProgress);
    const pos = transform(posInfo.x, posInfo.y);

    const ctx = this.ctx;
    const isLeft = parseState(targetArc.state).isLeft;
    const ballColor = isLeft ? '56, 189, 248' : '249, 115, 22';

    ctx.save();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 8 * fFactor, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${ballColor}, 0.9)`;
    ctx.shadowBlur = 15 * fFactor;
    ctx.shadowColor = `rgba(${ballColor}, 0.8)`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 3 * fFactor, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();

    const prevMoveName =
      targetIdx > 0 && arcs[targetIdx - 1].move
        ? arcs[targetIdx - 1].move!.name
        : '无';

    const nextMoveName = targetArc.move ? targetArc.move.name : '无';

    return {
      state: targetArc.state,
      prevMove: prevMoveName,
      nextMove: nextMoveName,
    };
  }

  private drawISUSymbol(
    pt: { x: number; y: number },
    category: string,
    fFactor = 1.0
  ) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.shadowBlur = 8 * fFactor;
    ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
    ctx.lineWidth = 2 * fFactor;

    if (category === 'three_turn') {
      ctx.beginPath();
      ctx.arc(
        pt.x,
        pt.y - 12 * fFactor,
        3 * fFactor,
        -Math.PI / 2,
        Math.PI / 2,
        false
      );
      ctx.lineTo(pt.x - 2 * fFactor, pt.y - 9 * fFactor);
      ctx.arc(
        pt.x,
        pt.y - 6 * fFactor,
        3 * fFactor,
        -Math.PI / 2,
        Math.PI / 2,
        false
      );
      ctx.stroke();
    } else if (category === 'bracket') {
      ctx.beginPath();
      ctx.moveTo(pt.x + 3 * fFactor, pt.y - 15 * fFactor);
      ctx.quadraticCurveTo(
        pt.x - 1 * fFactor,
        pt.y - 15 * fFactor,
        pt.x - 1 * fFactor,
        pt.y - 11 * fFactor
      );
      ctx.lineTo(pt.x - 1 * fFactor, pt.y - 10 * fFactor);
      ctx.quadraticCurveTo(
        pt.x - 4 * fFactor,
        pt.y - 9 * fFactor,
        pt.x - 1 * fFactor,
        pt.y - 8 * fFactor
      );
      ctx.lineTo(pt.x - 1 * fFactor, pt.y - 7 * fFactor);
      ctx.quadraticCurveTo(
        pt.x - 1 * fFactor,
        pt.y - 3 * fFactor,
        pt.x + 3 * fFactor,
        pt.y - 3 * fFactor
      );
      ctx.stroke();
    } else if (category === 'mohawk') {
      ctx.strokeStyle = '#fb923c';
      ctx.shadowColor = 'rgba(249, 115, 22, 0.8)';
      ctx.beginPath();
      ctx.ellipse(
        pt.x - 3 * fFactor,
        pt.y - 9 * fFactor,
        1.8 * fFactor,
        3.8 * fFactor,
        Math.PI / 6,
        0,
        2 * Math.PI
      );
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(
        pt.x + 3 * fFactor,
        pt.y - 9 * fFactor,
        1.8 * fFactor,
        3.8 * fFactor,
        -Math.PI / 6,
        0,
        2 * Math.PI
      );
      ctx.stroke();
    }
    ctx.restore();
  }
}