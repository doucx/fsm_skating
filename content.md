这是一个非常深刻的物理仿真改进。在实际滑冰中，随着动能的消耗和压刃深度的增加，滑行弧线确实会呈现出一种向内收敛的趋势，这在几何学上可以用**欧拉螺线（Clothoid）**或**变半径弧线**来模拟。

我将按以下方案进行重构：
1.  **核心几何算法升级 (`web/js/state.js`)**：将原本生成单一“正圆弧”的逻辑改为生成“多段线段近似的螺线”。引入 `radiusDecay` 因子。
2.  **渲染器适配 (`web/js/canvasRenderer.js`)**：由于 `ctx.arc()` 只能绘制固定半径圆弧，我们将改为通过 `ctx.lineTo()` 绘制高密度折线。
3.  **物理参数注入**：在生成过程中模拟由于摩擦力和向心力引起的半径线性衰减。

## [WIP] refactor: 引入轨迹半径衰减算法模拟欧拉螺线 (Clothoid Spiral) 效果

### 用户需求
目前的正圆弧轨迹过于机械化。需要引入半径衰减机制，使滑行轨迹向终点方向逐渐收敛，从而模拟滑冰中因速度衰减和压刃增加产生的欧拉螺线（Clothoid）视觉效果。

### 评论
从纯几何模型向物理仿真模型跨越的关键一步。这不仅提升了视觉上的“有机感”，更能真实地反映出滑冰者在完成一个冲刺或转体动作时的力学特征（即弧线越滑越紧）。

### 目标
- 在 `computeGeometry` 中引入衰减系数 `DECAY_FACTOR`（默认为 15%）。
- 将原本的 `arcs` 结构升级为包含 `points` 数组的螺线段结构。
- 重构渲染逻辑，使用 `ctx.beginPath()` + `ctx.lineTo()` 序列绘制平滑的收敛曲线。
- 确保 `drawTracker`（动画追踪器）仍能基于累积长度精确插值。

### 基本原理
我们将每个状态的滑行弧线拆分为 16 个微小段。在每一段中，半径 $R$ 会根据当前进度线性减小。
公式推导：$R(t) = R_{start} \times (1 - t \times \text{Decay})$，其中 $t \in [0, 1]$。
通过这种方式，我们可以在不引入复杂微积分计算的情况下，在 Canvas 上实现极具真实感的收敛轨迹。

### 标签
#intent/refine #flow/ready #priority/high #comp/docs #concept/executor #scope/ux #ai/brainstorm #task/domain/physics-engine #task/object/clothoid-spiral #task/action/geometry-refactor #task/state/begin

---

### Script

#### Acts 1: 重构几何生成算法实现螺线化

修改 `state.js`，将原本的圆弧计算逻辑改为分段采样，引入半径衰减。

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
~~~~~
~~~~~javascript.new
/**
 * 核心几何变换：把 path 路径转换为可独立渲染的物理数据
 * 已引入半径衰减算法以模拟欧拉螺线（Clothoid）的真实滑行收敛感
 */
export function computeGeometry(pathData, R = 50, sweepAngle = Math.PI * 0.65) {
    if (!pathData || pathData.length === 0) return { nodes: [], arcs: [] };

    const nodes = [];
    const arcs = [];
    let x = 0;
    let y = 0;
    let theta = 0;

    // 物理仿真参数：每一步滑行半径末端衰减 15% (模拟摩擦力与惯性损失)
    const RADIUS_DECAY = 0.15;
    const SEGMENTS_PER_ARC = 16;

    nodes.push({ x, y, label: "START", category: "start", state: pathData[0].state });

    for (let i = 0; i < pathData.length; i++) {
        const step = pathData[i];
        const stateStr = step.state;

        const geomConfig = step.move?.geometry_config || {};
        const radiusFactor = geomConfig.radius_factor !== undefined ? geomConfig.radius_factor : 1.0;
        const sweepAngleFactor = geomConfig.sweep_angle_factor !== undefined ? geomConfig.sweep_angle_factor : 1.0;

        const baseR = R * radiusFactor;
        const totalSweep = sweepAngle * sweepAngleFactor;
        const curve = getCurvature(stateStr);
        const K = (curve === "CW") ? -1 : 1;

        const polyline = [];
        let currentX = x;
        let currentY = y;
        let currentTheta = theta;
        let totalLength = 0;

        // 分段迭代计算螺线点阵
        for (let s = 0; s <= SEGMENTS_PER_ARC; s++) {
            const t = s / SEGMENTS_PER_ARC;
            // 半径随进度线性衰减
            const localR = baseR * (1 - t * RADIUS_DECAY);
            const dSweep = (totalSweep / SEGMENTS_PER_ARC) * -K;

            if (s === 0) {
                polyline.push({ x: currentX, y: currentY, t: 0, length: 0 });
            } else {
                // 计算当前段的瞬时圆心
                const icx = currentX + K * localR * Math.sin(currentTheta);
                const icy = currentY - K * localR * Math.cos(currentTheta);
                
                const startA = Math.atan2(currentY - icy, currentX - icx);
                const endA = startA + dSweep;
                
                const nextX = icx + localR * Math.cos(endA);
                const nextY = icy + localR * Math.sin(endA);
                
                const dist = Math.sqrt((nextX - currentX)**2 + (nextY - currentY)**2);
                totalLength += dist;
                
                currentX = nextX;
                currentY = nextY;
                currentTheta += dSweep;
                
                polyline.push({ x: currentX, y: currentY, t, length: totalLength });
            }
        }

        arcs.push({
            polyline,
            totalLength,
            state: stateStr,
            move: step.move,
            // 兼容性保留部分参数用于辅助计算
            midAngle: theta - (K * totalSweep / 2) 
        });

        x = currentX;
        y = currentY;
        theta = currentTheta;

        const isLast = (i === pathData.length - 1);
        nodes.push({
            x, y,
            label: isLast ? "END" : (step.move ? step.move.name : ""),
            category: isLast ? "end" : (step.move ? step.move.category : "point"),
            state: isLast ? "" : (pathData[i+1] ? pathData[i+1].state : ""),
            move: step.move
        });
    }

    return { nodes, arcs };
}
~~~~~

#### Acts 2: 适配螺线渲染逻辑与追踪逻辑

修改 `canvasRenderer.js`，将原本的 `ctx.arc()` 替换为基于 `polyline` 的绘制，并优化追踪球的插值算法。

~~~~~act
patch_file
web/js/canvasRenderer.js
~~~~~
~~~~~javascript.old
    draw(geometry) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const { nodes, arcs } = geometry;
        if (nodes.length === 0) return;

        const transform = this.getTransform(nodes);
        const { scale } = this._getBoundsAndScale(nodes);
~~~~~
~~~~~javascript.new
    draw(geometry) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const { nodes, arcs } = geometry;
        if (nodes.length === 0) return;

        const transform = this.getTransform(nodes);

        // 绘制微光网格冰面质感
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
        // 绘制连续滑行螺线段 (Arcs = Clothoid Segments)
        arcs.forEach((arc, idx) => {
            ctx.save();
            ctx.beginPath();
            
            arc.polyline.forEach((p, pIdx) => {
                const pt = transform(p.x, p.y);
                if (pIdx === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            });

            const progressRatio = (idx + 1) / arcs.length;
            const stateInfo = parseState(arc.state);
            const isLeft = stateInfo.isLeft;
            const isForward = stateInfo.isForward;

            const baseColor = isLeft ? "56, 189, 248" : "249, 115, 22";
            ctx.strokeStyle = `rgba(${baseColor}, ${0.5 + progressRatio * 0.5})`;
            ctx.shadowColor = `rgba(${baseColor}, 0.65)`;
            ctx.lineWidth = 3.5 * fFactor;
            ctx.shadowBlur = 12 * fFactor;

            if (!isForward) ctx.setLineDash([6 * fFactor, 4 * fFactor]);

            ctx.stroke();
            ctx.restore();

            // 在螺线中点绘制用刃名称
            const midP = arc.polyline[Math.floor(arc.polyline.length / 2)];
            const midTrans = transform(midP.x, midP.y);

            ctx.fillStyle = "#ffffff";
            ctx.font = `bold ${Math.round(11 * fFactor)}px monospace`;
            ctx.textAlign = "center";
            ctx.fillText(arc.state, midTrans.x, midTrans.y - 12 * fFactor);

            // 绘制滑行方向箭头 (取螺线末端切向)
            this._drawSpiralArrow(ctx, transform, arc, isLeft, fFactor);
        });
~~~~~

#### Acts 3: 优化箭头绘制与追踪球逻辑

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
~~~~~
~~~~~javascript.new
    _drawSpiralArrow(ctx, transform, arc, isLeft, fFactor) {
        // 取螺线中段的两个点计算切向
        const p1 = arc.polyline[Math.floor(arc.polyline.length / 2)];
        const p2 = arc.polyline[Math.floor(arc.polyline.length / 2) + 1];
        const pMid = transform(p1.x, p1.y);

        const arrowAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

        const arrowLength = 9 * fFactor;
        const arrowWidth = 5 * fFactor;
~~~~~
~~~~~act
patch_file
web/js/canvasRenderer.js
~~~~~
~~~~~javascript.old
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
~~~~~
~~~~~javascript.new
    drawTracker(geometry, progress, fFactor) {
        const { arcs, nodes } = geometry;
        if (!arcs || arcs.length === 0) return null;

        const transform = this.getTransform(nodes);

        // 1. 根据总物理长度计算当前 progress 落在哪个螺线段上
        const totalLength = arcs.reduce((acc, arc) => acc + arc.totalLength, 0);
        let targetLen = totalLength * progress;
        let currentLen = 0;
        let targetArc = arcs[arcs.length - 1];
        let localProgress = 1.0;

        let targetIdx = arcs.length - 1;
        for (let i = 0; i < arcs.length; i++) {
            const arc = arcs[i];
            if (currentLen + arc.totalLength >= targetLen) {
                targetArc = arc;
                targetIdx = i;
                localProgress = (targetLen - currentLen) / arc.totalLength;
                break;
            }
            currentLen += arc.totalLength;
        }

        // 2. 在 polyline 中通过累积长度进行二次线性插值以获取坐标
        const arcTargetLen = targetArc.totalLength * localProgress;
        let p1 = targetArc.polyline[0];
        let p2 = targetArc.polyline[targetArc.polyline.length - 1];
        
        for(let j=0; j < targetArc.polyline.length - 1; j++) {
            if(targetArc.polyline[j+1].length >= arcTargetLen) {
                p1 = targetArc.polyline[j];
                p2 = targetArc.polyline[j+1];
                break;
            }
        }
        
        const segmentLen = p2.length - p1.length;
        const t = segmentLen > 0 ? (arcTargetLen - p1.length) / segmentLen : 0;
        const worldX = p1.x + (p2.x - p1.x) * t;
        const worldY = p1.y + (p2.y - p1.y) * t;
        const pos = transform(worldX, worldY);
~~~~~

### 下一步建议
- **动态衰减参数**: 既然用户可以调整 A* 权重，我们也可以考虑在“高级”面板中增加一个“冰面摩擦力”滑动条，用于动态控制 `RADIUS_DECAY` 系数，从而让用户观察不同冰面质量对弧线收敛的影响。
- **性能优化**: 如果 `SEGMENTS_PER_ARC` 设得非常高（例如 64 以上），对于长编排可能会有轻微性能抖动，目前的 16 应该是一个视觉与性能的平衡点。
