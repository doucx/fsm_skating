你的建议非常具有物理洞察力。在真实的花样滑冰中，冰刀在冰面上滑行时，由于摩擦阻力的存在，滑冰者的速度会逐渐衰减。为了在速度降低时维持身体的倾角和刃的稳定性，冰刀的滑行半径必须逐渐减小。这一过程在数学上完全符合**欧拉螺线（Clothoid Spiral，也称回旋线）**的特征——其曲率与弧长成正比增加，半径逐渐收敛。

通过在几何生成器中使用**数值积分（Numerical Integration）**，我们可以完美模拟这一收敛过程，而不需要诉诸复杂的解析螺线公式。这不仅可以保证滑跑轨迹的视觉真实度，还能自然地保持转换点处的 **$G^1$（切线方向）连续性**。

我将生成一个计划来重构轨迹生成和 Canvas 渲染逻辑。

## [WIP] feat: 引入基于数值积分与半径衰减的欧拉螺线滑行轨迹模拟

### 用户需求
目前系统采用正圆弧模拟滑行轨迹。需要优化几何生成算法，引入向心力与摩擦力导致的半径衰减，使圆弧向终点方向逐渐收敛（模拟欧拉螺线），提升轨迹的真实感。

### 评论
这是一项极具科学性的图形学改进。使用离散数值积分代替 Canvas 原生的 `arc` 方法，能够支持任意物理衰减曲线（如线性半径收敛），同时彻底统一了轨迹追踪（Tracker）、行进箭头（Arrows）和 1D 时间轴的几何计算模型，提高了代码的可维护性和健壮性。

### 目标
1.  **重构 `state.js` 的 `computeGeometry`**：使用 40 步数值积分（Euler Integration）替代原有的单次弧度推导。
2.  **引入半径衰减**：在积分步骤中引入 `DECAY_COEFF` 衰减系数（默认每步滑行半径收敛 18%）。
3.  **重构 `canvasRenderer.js` 的绘制逻辑**：由 `ctx.arc` 绘制改为根据积分生成的 `points` 数组进行 `ctx.lineTo` 平滑连线。
4.  **重构时序插值与箭头绘制**：通过新导出的 `getArcProgressInfo` 辅助函数，完美获取任意进度下的切向角与坐标，简化箭头与追踪球的计算。
5.  **更新 timeline 进度条**：使用精确计算的积分弧长 `arc.length` 替代圆弧公式。

### 基本原理
我们在 `computeGeometry` 中，沿着瞬时前进切向角 `theta`，以极小的步长 $d\phi$ 进行积分。在积分的每一步，根据当前局部进度逐渐减小滑行半径 $R$，从而自然绘制出优美的收敛螺线。由于我们精确地将每一步终点的坐标和切向角传递给下一个动作，动作交接处的切线方向保持了完美的连续性。

### 标签
#intent/build #flow/ready #priority/high #comp/interfaces #concept/executor #scope/ux #ai/brainstorm #task/domain/physics-simulation #task/object/clothoid-spiral #task/action/numerical-integration #task/state/begin

---

### Script

#### Acts 1: 重构 `state.js` 几何生成算法

重构轨迹生成器，改用数值积分生成带有半径衰减的欧拉螺线点集。

~~~~~act
patch_file
web/js/state.js
~~~~~
~~~~~javascript.old
/**
 * 核心几何变换：把 path 路径转换为可独立渲染的物理数据
 * 已针对 HTML Canvas Y轴向下（y-down）坐标系进行了数学投影纠正
 */
export function computeGeometry(pathData, R = 50, sweepAngle = Math.PI * 0.65) {
    if (!pathData || pathData.length === 0) return { nodes: [], arcs: [] };

    const nodes = [];
    const arcs = [];
    let x = 0;
    let y = 0;
    let theta = 0; // 初始前进切向角：0 弧度（水平向右）

    // Node 0: START
    nodes.push({
        x,
        y,
        label: "START",
        category: "start",
        state: pathData[0].state
    });

    for (let i = 0; i < pathData.length; i++) {
        const step = pathData[i];
        const stateStr = step.state;

        // 动态读取动作特异物理参数因子，若无配置则降级使用标准系数 (1.0)
        const geomConfig = step.move?.geometry_config || {};
        const radiusFactor = geomConfig.radius_factor !== undefined ? geomConfig.radius_factor : 1.0;
        const sweepAngleFactor = geomConfig.sweep_angle_factor !== undefined ? geomConfig.sweep_angle_factor : 1.0;

        const currentR = R * radiusFactor;
        const currentSweepAngle = sweepAngle * sweepAngleFactor;

        const curve = getCurvature(stateStr);
        const K = (curve === "CW") ? -1 : 1; // 1: CCW (左偏), -1: CW (右偏)

        // ===== 针对 Canvas Y轴向下坐标系的物理公式修正 =====
        // 1. 纠正圆心计算公式
        const cx = x + K * currentR * Math.sin(theta);
        const cy = y - K * currentR * Math.cos(theta);

        // 2. 纠正张角偏转方向
        const startAngle = Math.atan2(y - cy, x - cx);
        const sweep = -K * currentSweepAngle; // CCW角度减小，CW角度增加
        const endAngle = startAngle + sweep;

        const nextX = cx + currentR * Math.cos(endAngle);
        const nextY = cy + currentR * Math.sin(endAngle);
        const nextTheta = theta + sweep;

        // 弧线 i 代表用刃状态 State i，传递计算得到的特异性 R 参数以实现动态画弧
        arcs.push({
            startX: x,
            startY: y,
            endX: nextX,
            endY: nextY,
            cx,
            cy,
            R: currentR,
            startAngle,
            endAngle,
            anticlockwise: (K === 1), // K === 1 (CCW) 对应 Canvas 逆时针绘制
            state: stateStr,
            move: step.move
        });

        x = nextX;
        y = nextY;
        theta = nextTheta;

        // Node i+1 代表动作转换
        const isLast = (i === pathData.length - 1);
        nodes.push({
            x,
            y,
            label: isLast ? "END" : (step.move ? step.move.name : ""),
            category: isLast ? "end" : (step.move ? step.move.category : "point"),
            state: isLast ? "" : (pathData[i+1] ? pathData[i+1].state : ""),
            move: step.move
        });
    }

    return { nodes, arcs };
}
~~~~~
~~~~~javascript.new
/**
 * 高级物理几何插值函数：根据局部进度 s (0-1) 获取欧拉螺线上的坐标与切向角
 */
export function getArcProgressInfo(arc, s) {
    const points = arc.points;
    const totalSegments = points.length - 1;
    const rawIdx = s * totalSegments;
    const idx = Math.floor(rawIdx);
    const frac = rawIdx - idx;

    if (idx >= totalSegments) {
        return points[totalSegments];
    }

    const p0 = points[idx];
    const p1 = points[idx + 1];

    const interpX = p0.x + (p1.x - p0.x) * frac;
    const interpY = p0.y + (p1.y - p0.y) * frac;
    
    // 角度积分过程中是连续的，直接线性插值
    const interpTheta = p0.theta + (p1.theta - p0.theta) * frac;

    return { x: interpX, y: interpY, theta: interpTheta };
}

/**
 * 核心几何变换：把 path 路径转换为可独立渲染的物理数据
 * 已升级为数值积分算法，模拟向心力与摩擦力导致的半径衰减收敛轨迹（欧拉螺线）
 */
export function computeGeometry(pathData, R = 50, sweepAngle = Math.PI * 0.65) {
    if (!pathData || pathData.length === 0) return { nodes: [], arcs: [] };

    const nodes = [];
    const arcs = [];
    let x = 0;
    let y = 0;
    let theta = 0; // 初始前进切向角：0 弧度（水平向右）

    // Node 0: START
    nodes.push({
        x,
        y,
        label: "START",
        category: "start",
        state: pathData[0].state
    });

    // 欧拉螺线物理参数
    const DECAY_COEFF = 0.18;       // 滑跑摩擦半径衰减系数 (18% 收敛)
    const INTEGRATION_STEPS = 40;   // 数值积分步数

    for (let i = 0; i < pathData.length; i++) {
        const step = pathData[i];
        const stateStr = step.state;

        // 动态读取动作特异物理参数因子，若无配置则降级使用标准系数 (1.0)
        const geomConfig = step.move?.geometry_config || {};
        const radiusFactor = geomConfig.radius_factor !== undefined ? geomConfig.radius_factor : 1.0;
        const sweepAngleFactor = geomConfig.sweep_angle_factor !== undefined ? geomConfig.sweep_angle_factor : 1.0;

        const currentR = R * radiusFactor;
        const currentSweepAngle = sweepAngle * sweepAngleFactor;

        const curve = getCurvature(stateStr);
        const K = (curve === "CW") ? -1 : 1; // 1: CCW (左偏), -1: CW (右偏)

        // ===== 采用数值积分演化欧拉螺线轨迹 (确保 G1 连续性) =====
        const points = [];
        points.push({ x, y, theta });

        const dPhi = currentSweepAngle / INTEGRATION_STEPS;
        let arcLength = 0;

        for (let j = 0; j < INTEGRATION_STEPS; j++) {
            const s = (j + 0.5) / INTEGRATION_STEPS; // 局部中点进度
            // 局部向心力与速度衰减对应的瞬时半径
            const R_inst = currentR * (1 - DECAY_COEFF * s);

            const dTheta = -K * dPhi;
            const ds = R_inst * dPhi;
            arcLength += ds;

            const thetaMid = theta + dTheta / 2;

            x += ds * Math.cos(thetaMid);
            y += ds * Math.sin(thetaMid);
            theta += dTheta;

            points.push({ x, y, theta });
        }

        arcs.push({
            points: points,
            length: arcLength,
            state: stateStr,
            move: step.move
        });

        // Node i+1 代表动作转换
        const isLast = (i === pathData.length - 1);
        nodes.push({
            x,
            y,
            label: isLast ? "END" : (step.move ? step.move.name : ""),
            category: isLast ? "end" : (step.move ? step.move.category : "point"),
            state: isLast ? "" : (pathData[i+1] ? pathData[i+1].state : ""),
            move: step.move
        });
    }

    return { nodes, arcs };
}
~~~~~

#### Acts 2: 重构 Canvas 渲染机制

重构 `canvasRenderer.js`，采用线段集平滑绘制曲线，并统一方向箭头与追踪球的时序计算。

~~~~~act
patch_file
web/js/canvasRenderer.js
~~~~~
~~~~~javascript.old
import { getCurvature, parseState } from './state.js';

export class CanvasRenderer {
~~~~~
~~~~~javascript.new
import { getCurvature, parseState, getArcProgressInfo } from './state.js';

export class CanvasRenderer {
~~~~~

~~~~~act
patch_file
web/js/canvasRenderer.js
~~~~~
~~~~~javascript.old
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
~~~~~
~~~~~javascript.new
        // 绘制连续滑行圆弧段 (Arcs = States)
        arcs.forEach((arc, idx) => {
            ctx.save();
            ctx.beginPath();
            
            // 采用离散折线平滑绘制欧拉螺线
            arc.points.forEach((pt, pIdx) => {
                const trans = transform(pt.x, pt.y);
                if (pIdx === 0) ctx.moveTo(trans.x, trans.y);
                else ctx.lineTo(trans.x, trans.y);
            });

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

            // 获取积分中点位置与切向
            const midInfo = getArcProgressInfo(arc, 0.5);
            const midTrans = transform(midInfo.x, midInfo.y);

            ctx.fillStyle = "#ffffff";
            ctx.font = `bold ${Math.round(11 * fFactor)}px monospace`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(arc.state, midTrans.x, midTrans.y - 10 * fFactor);

            // 绘制滑行轨迹行进切方向箭头
            this._drawArrow(ctx, transform, arc, midInfo, isLeft, fFactor);
        });
~~~~~

~~~~~act
patch_file
web/js/canvasRenderer.js
~~~~~
~~~~~javascript.old
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
~~~~~
~~~~~javascript.new
    _drawArrow(ctx, transform, arc, midInfo, isLeft, fFactor) {
        const pMid = transform(midInfo.x, midInfo.y);
        // 直接使用数值积分导出的行进方向 theta 作为箭头偏向角
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
        ctx.fillStyle = isLeft ? "rgba(56, 189, 248, 0.85)" : "rgba(249, 115, 22, 0.85)";
        ctx.fill();
    }

    drawTracker(geometry, progress, fFactor) {
        const { arcs, nodes } = geometry;
        if (!arcs || arcs.length === 0) return null;

        const transform = this.getTransform(nodes);

        // 1. 根据总积分长度计算当前 progress 落在哪个 arc 上
        const totalLength = arcs.reduce((acc, arc) => acc + arc.length, 0);
        let targetLen = totalLength * progress;
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

        // 2. 利用数值积分辅助函数计算精确插值坐标
        const posInfo = getArcProgressInfo(targetArc, localProgress);
        const pos = transform(posInfo.x, posInfo.y);

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
~~~~~

#### Acts 3: 同步更新 Timeline 与动画进度

修改 `app.js` 中的 timeline 组件，使其使用数值积分的 `arc.length` 以保证界面进度与实际轨迹同步。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
/**
 * 将 2D 轨迹投影到 1D 进度条上
 */
function updateLinearTimelineUI(geometry) {
    const { arcs } = geometry;
    const container = document.getElementById("timeline-segments");
    if (!arcs || arcs.length === 0) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML = "";
    const totalLength = arcs.reduce((acc, arc) => acc + (arc.R * Math.abs(arc.endAngle - arc.startAngle)), 0);

    arcs.forEach((arc, idx) => {
        const arcLen = arc.R * Math.abs(arc.endAngle - arc.startAngle);
        const widthPercent = (arcLen / totalLength) * 100;
        
        const seg = document.createElement("div");
        seg.className = "timeline-segment";
        seg.style.width = `${widthPercent}%`;
        
        const isLeft = parseState(arc.state).isLeft;
        seg.style.backgroundColor = isLeft ? "#0ea5e9" : "#f97316"; // sky-500 : orange-500
        
        // 记录元数据用于 Tooltip
        seg.dataset.state = arc.state;
        seg.dataset.move = arc.move ? arc.move.name : "滑行";
        
        container.appendChild(seg);

        // 如果不是最后一段，添加一个物理分隔线（动作节点）
        if (idx < arcs.length - 1) {
            const marker = document.createElement("div");
            marker.className = "timeline-marker";
            // 计算当前累积的百分比位置
            let accumulatedLen = 0;
            for(let j=0; j<=idx; j++) accumulatedLen += arcs[j].R * Math.abs(arcs[j].endAngle - arcs[j].startAngle);
            marker.style.left = `${(accumulatedLen / totalLength) * 100}%`;
            container.appendChild(marker);
        }
    });
}
~~~~~
~~~~~javascript.new
/**
 * 将 2D 轨迹投影到 1D 进度条上
 */
function updateLinearTimelineUI(geometry) {
    const { arcs } = geometry;
    const container = document.getElementById("timeline-segments");
    if (!arcs || arcs.length === 0) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML = "";
    const totalLength = arcs.reduce((acc, arc) => acc + arc.length, 0);

    arcs.forEach((arc, idx) => {
        const arcLen = arc.length;
        const widthPercent = (arcLen / totalLength) * 100;
        
        const seg = document.createElement("div");
        seg.className = "timeline-segment";
        seg.style.width = `${widthPercent}%`;
        
        const isLeft = parseState(arc.state).isLeft;
        seg.style.backgroundColor = isLeft ? "#0ea5e9" : "#f97316"; // sky-500 : orange-500
        
        // 记录元数据用于 Tooltip
        seg.dataset.state = arc.state;
        seg.dataset.move = arc.move ? arc.move.name : "滑行";
        
        container.appendChild(seg);

        // 如果不是最后一段，添加一个物理分隔线（动作节点）
        if (idx < arcs.length - 1) {
            const marker = document.createElement("div");
            marker.className = "timeline-marker";
            // 计算当前累积的百分比位置
            let accumulatedLen = 0;
            for(let j=0; j<=idx; j++) accumulatedLen += arcs[j].length;
            marker.style.left = `${(accumulatedLen / totalLength) * 100}%`;
            container.appendChild(marker);
        }
    });
}
~~~~~

### 下一步建议
- **动态衰减权重**：虽然目前 18% 的衰减是非常好的平衡值，但我们未来可以为不同的动作类别定制不同的衰减（例如，滑行阻力较小的“标准滑行”衰减 10%，而摩擦力极大的“括弧步”衰减 25%），这在数值积分的框架下极其容易扩展。
- **摩擦阻力公式**：可进一步将速度（通过滑行距离）和冰面摩擦因数相结合，从而使曲线在低速下收敛速度加剧，达到极致的动力学仿真。
