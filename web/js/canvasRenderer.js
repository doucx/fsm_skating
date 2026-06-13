import { getCurvature, parseState } from './state.js';

export class CanvasRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");
        this.zoomFactor = 1.0;
        this.panX = 0;
        this.panY = 0;
    }

    _getBoundsAndScale(nodes, pad = 35) {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        nodes.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        });

        const w = maxX - minX || 1;
        const h = maxY - minY || 1;
        const scale = Math.min((this.canvas.width - 2 * pad) / w, (this.canvas.height - 2 * pad) / h, 1.5);

        return { minX, minY, w, h, scale };
    }

    getTransform(nodes) {
        const { minX, minY, w, h, scale } = this._getBoundsAndScale(nodes);

        const offsetX = (this.canvas.width - w * scale) / 2 - minX * scale;
        const offsetY = (this.canvas.height - h * scale) / 2 - minY * scale;

        return (px, py) => {
            const ax = px * scale + offsetX;
            const ay = py * scale + offsetY;
            
            if (!document.fullscreenElement) {
                return { x: ax, y: ay };
            }
            
            const cx = this.canvas.width / 2;
            const cy = this.canvas.height / 2;
            return {
                x: (ax - cx) * this.zoomFactor + cx + this.panX,
                y: (ay - cy) * this.zoomFactor + cy + this.panY
            };
        };
    }

    resetViewport() {
        this.zoomFactor = 1.0;
        this.panX = 0;
        this.panY = 0;
    }

    draw(geometry) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const { nodes, arcs } = geometry;
        if (nodes.length === 0) return;

        const transform = this.getTransform(nodes);
        const { scale } = this._getBoundsAndScale(nodes);

        // 绘制微光网格冰面质感
        ctx.strokeStyle = "rgba(148, 163, 184, 0.04)";
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

        // 绘制连续滑行圆弧段 (Arcs = States)
        arcs.forEach((arc, idx) => {
            const centerTrans = transform(arc.cx, arc.cy);
            const scaledR = arc.R * scale * fFactor;

            ctx.save();
            ctx.beginPath();
            ctx.arc(centerTrans.x, centerTrans.y, scaledR, arc.startAngle, arc.endAngle, arc.anticlockwise);

            const progressRatio = (idx + 1) / arcs.length;
            const stateInfo = parseState(arc.state);
            const isLeft = stateInfo.isLeft;
            const isForward = stateInfo.isForward;

            // 区分双脚：左脚蓝色，右脚橙色
            const baseColor = isLeft ? "56, 189, 248" : "249, 115, 22";
            ctx.strokeStyle = `rgba(${baseColor}, ${0.5 + progressRatio * 0.5})`;
            ctx.shadowColor = `rgba(${baseColor}, 0.65)`;
            ctx.lineWidth = 3.5 * fFactor;
            ctx.shadowBlur = 12 * fFactor;

            // 前后向：前滑实线，后滑虚线 (ISU标准)
            if (isForward) {
                ctx.setLineDash([]);
            } else {
                ctx.setLineDash([6 * fFactor, 4 * fFactor]);
            }

            ctx.stroke();
            ctx.restore();

            // 绘制用刃状态名称 (如 LFO, LBI) 于弧线几何中点
            const midAngle = arc.startAngle + (arc.endAngle - arc.startAngle) * 0.5;
            const mx = centerTrans.x + scaledR * Math.cos(midAngle);
            const my = centerTrans.y + scaledR * Math.sin(midAngle);

            ctx.fillStyle = "#ffffff";
            ctx.font = `bold ${Math.round(11 * fFactor)}px monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(arc.state, mx, my - 10 * fFactor);

            // 绘制滑行轨迹行进切方向箭头
            this._drawArrow(ctx, transform, arc, midAngle, isLeft, fFactor);
        });

        // 绘制动作转换节点 (Nodes = Moves)
        nodes.forEach((node, idx) => {
            const pt = transform(node.x, node.y);
            const isLast = (idx === nodes.length - 1);

            ctx.save();
            if (idx === 0) {
                // START 节点绘制 (专属亮绿色微光球)
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 6 * fFactor, 0, 2 * Math.PI);
                ctx.fillStyle = "#10b981";
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 2 * fFactor;
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = "#10b981";
                ctx.font = `bold ${Math.round(10 * fFactor)}px sans-serif`;
                ctx.textAlign = "center";
                ctx.fillText("START", pt.x, pt.y + 16 * fFactor);
            } else if (node.move && ["three_turn", "bracket", "mohawk"].includes(node.move.category)) {
                // 绘制特殊动作的 ISU 专业图标
                this._drawISUSymbol(ctx, pt, node.move.category, fFactor);
                
                // 动作名称标签
                ctx.fillStyle = "#94a3b8";
                ctx.font = `${Math.round(10 * fFactor)}px sans-serif`;
                ctx.textAlign = "center";
                const miniName = node.move.name.split(" ")[0].substring(0, 4);
                ctx.fillText(miniName, pt.x, pt.y - 12 * fFactor);
            } else {
                // 普通转移节点
                ctx.beginPath();
                const markerR = (isLast ? 6 : 4) * fFactor;
                ctx.arc(pt.x, pt.y, markerR, 0, 2 * Math.PI);
                ctx.fillStyle = isLast ? "#38bdf8" : "#0f172a";
                ctx.strokeStyle = isLast ? "#ffffff" : "#0284c7";
                ctx.lineWidth = (isLast ? 2.5 : 2) * fFactor;
                ctx.fill();
                ctx.stroke();

                if (node.move) {
                    ctx.fillStyle = "#94a3b8";
                    ctx.font = `${Math.round(10 * fFactor)}px sans-serif`;
                    ctx.textAlign = "center";
                    const miniName = node.move.name.split(" ")[0].substring(0, 4);
                    ctx.fillText(miniName, pt.x, pt.y - 12 * fFactor);
                }
            }
            ctx.restore();
        });
    }

    _drawArrow(ctx, transform, arc, midAngle, isLeft, fFactor) {
        const worldMx = arc.cx + arc.R * Math.cos(midAngle);
        const worldMy = arc.cy + arc.R * Math.sin(midAngle);
        const pMid = transform(worldMx, worldMy);

        const midK = arc.anticlockwise ? -1 : 1;
        const arrowAngle = Math.atan2(midK * Math.cos(midAngle), -midK * Math.sin(midAngle));

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
        ctx.fillStyle = isLeft ? "rgba(56, 189, 248, 0.85)" : "rgba(249, 115, 22, 0.85)";
        ctx.fill();
    }

    drawTracker(geometry, progress, fFactor) {
        const { arcs, nodes } = geometry;
        if (!arcs || arcs.length === 0) return null;

        const transform = this.getTransform(nodes);

        // 1. 根据总弧长计算当前 progress 落在哪个 arc 上
        const totalLength = arcs.reduce((acc, arc) => acc + (arc.R * Math.abs(arc.endAngle - arc.startAngle)), 0);
        let targetLen = totalLength * progress;
        let currentLen = 0;
        let targetArc = arcs[arcs.length - 1];
        let localProgress = 1.0;

        let targetIdx = arcs.length - 1;
        for (let i = 0; i < arcs.length; i++) {
            const arc = arcs[i];
            const arcLen = arc.R * Math.abs(arc.endAngle - arc.startAngle);
            if (currentLen + arcLen >= targetLen) {
                targetArc = arc;
                targetIdx = i;
                localProgress = (targetLen - currentLen) / arcLen;
                break;
            }
            currentLen += arcLen;
        }

        // 2. 计算插值坐标
        const currentAngle = targetArc.startAngle + (targetArc.endAngle - targetArc.startAngle) * localProgress;
        const worldX = targetArc.cx + targetArc.R * Math.cos(currentAngle);
        const worldY = targetArc.cy + targetArc.R * Math.sin(currentAngle);
        const pos = transform(worldX, worldY);

        // 3. 绘制追踪球 (冰晶小球)
        const ctx = this.ctx;
        const isLeft = parseState(targetArc.state).isLeft;
        const ballColor = isLeft ? "56, 189, 248" : "249, 115, 22";

        ctx.save();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 8 * fFactor, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${ballColor}, 0.9)`;
        ctx.shadowBlur = 15 * fFactor;
        ctx.shadowColor = `rgba(${ballColor}, 0.8)`;
        ctx.fill();
        
        // 内核白光
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3 * fFactor, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.restore();

        // 3.5 获取高精度语义上下文
        // 刚刚的动作：也就是如何转移到 targetArc 的，对应的正是前一个 arc 结尾处所带的 move
        const prevMoveName = (targetIdx > 0 && arcs[targetIdx - 1].move) ? arcs[targetIdx - 1].move.name : "无";
        
        // 下一个动作：即在 targetArc 滑行终点即将执行的 move
        const nextMoveName = targetArc.move ? targetArc.move.name : "无";

        return {
            state: targetArc.state,
            prevMove: prevMoveName,
            nextMove: nextMoveName
        };
    }

    _drawISUSymbol(ctx, pt, category, fFactor = 1.0) {
        ctx.save();
        ctx.strokeStyle = "#ffffff";
        ctx.shadowBlur = 8 * fFactor;
        ctx.shadowColor = "rgba(56, 189, 248, 0.8)";
        ctx.lineWidth = 2 * fFactor;

        if (category === "three_turn") {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y - 12 * fFactor, 3 * fFactor, -Math.PI/2, Math.PI/2, false);
            ctx.lineTo(pt.x - 2 * fFactor, pt.y - 9 * fFactor);
            ctx.arc(pt.x, pt.y - 6 * fFactor, 3 * fFactor, -Math.PI/2, Math.PI/2, false);
            ctx.stroke();
        } else if (category === "bracket") {
            ctx.beginPath();
            ctx.moveTo(pt.x + 3 * fFactor, pt.y - 15 * fFactor);
            ctx.quadraticCurveTo(pt.x - 1 * fFactor, pt.y - 15 * fFactor, pt.x - 1 * fFactor, pt.y - 11 * fFactor);
            ctx.lineTo(pt.x - 1 * fFactor, pt.y - 10 * fFactor);
            ctx.quadraticCurveTo(pt.x - 4 * fFactor, pt.y - 9 * fFactor, pt.x - 1 * fFactor, pt.y - 8 * fFactor);
            ctx.lineTo(pt.x - 1 * fFactor, pt.y - 7 * fFactor);
            ctx.quadraticCurveTo(pt.x - 1 * fFactor, pt.y - 3 * fFactor, pt.x + 3 * fFactor, pt.y - 3 * fFactor);
            ctx.stroke();
        } else if (category === "mohawk") {
            ctx.strokeStyle = "#fb923c"; 
            ctx.shadowColor = "rgba(249, 115, 22, 0.8)";
            ctx.beginPath();
            ctx.ellipse(pt.x - 3 * fFactor, pt.y - 9 * fFactor, 1.8 * fFactor, 3.8 * fFactor, Math.PI / 6, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(pt.x + 3 * fFactor, pt.y - 9 * fFactor, 1.8 * fFactor, 3.8 * fFactor, -Math.PI / 6, 0, 2 * Math.PI);
            ctx.stroke();
        }
        ctx.restore();
    }
}