这是一个非常卓越的建议。引入国际滑联（ISU）标准的步法图形规范，能够将这个 2D 轨迹渲染器提升到真正的专业级滑冰教学与评级水准。

我将修改 `web/js/app.js` 来完整引入这套专业视觉规范：
1.  **颜色编码 (Color Coding)**：通过解析轨迹段起滑状态（Foot），将左脚渲染为荧光蓝（Neon Blue），右脚渲染为荧光橙（Neon Orange）。
2.  **线条样式 (Line Style)**：通过解析起滑方向（Direction），前向（Forward）使用实线，后向（Backward）使用虚线（Dashed Line）。
3.  **ISU 图标渲染 (ISU Symbols)**：实现一个专门的 ISU 矢量符号渲染器 `drawISUSymbol`，在转体节点检测到 `three_turn`（转三）、`bracket`（括弧）或 `mohawk`（莫霍克）时，绘制标准尖角（3 字尖角 $\xi$、花括号尖角 $\{$）或交叉足迹。

## [WIP] feat(web): 引入 ISU 标准 2D 轨迹视觉规范（左右脚区分、虚实线、转体符号）

### 用户需求
遵循国际滑联（ISU）标准，升级 2D 轨迹图的图形表现力：
- 区分左右脚轨迹颜色：左脚蓝色，右脚橙色。
- 区分前后向线条样式：前向实线，后向虚线。
- 在对应的转体点渲染 ISU 官方标准的步法符号（转三、括弧、莫霍克步）。

### 评论
通过对滑行弧线的脚部和方向属性进行深度映射，该更改实现了真正的“所编排即所得”。ISU 专业图纸符号的引入不仅使视觉效果更加精致，更具有极高的高校专业教学与学术研究价值。

### 目标
1. 在 `web/js/app.js` 中新增矢量步法符号绘制器 `drawISUSymbol`。
2. 升级轨迹弧渲染逻辑，根据起滑状态动态设置 `ctx.strokeStyle` 和 `ctx.setLineDash`。
3. 升级箭头绘制逻辑，使其与轨迹段对应的脚部颜色完美匹配。
4. 升级节点球绘制逻辑，遇到专业转体时，用 ISU 标准符号替换默认的定位球。

### 基本原理
1.  **属性读取**：轨迹点 `points[i]` 的起始滑跑状态为 `points[i-1].state`。我们通过它的简写字符串（如 `"LFO"`）快速提取出脚部 `startState[0]`（L/R）与前行方向 `startState[1]`（F/B）。
2.  **虚线重置**：Canvas 绘制虚线使用 `ctx.setLineDash([dashWidth, gapWidth])`，在每次循环后必须调用 `ctx.setLineDash([])` 恢复，以避免污染其它几何线条的绘制。
3.  **矢量符号几何**：利用 Canvas 的 Path API（`arc`、`bezierCurveTo`、`ellipse` 等）手工还原经典的 ISU 制图符号。

### 标签
#intent/build #flow/ready #priority/high #comp/interfaces #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/isu-standards #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 新增 `drawISUSymbol` 制图器并升级轨迹线/符号渲染

我们将修改 `web/js/app.js`，加入专业矢量制图器，并让轨迹弧线支持双脚色彩体系、前后向虚实线以及箭头色彩同步。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
// 🚀 核心渲染引擎：2D 冰面圆弧物理轨迹图
function drawSkatePath(pathData) {
    const canvas = document.getElementById("skate-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (pathData.length === 0) return;
~~~~~
~~~~~javascript.new
// 🎨 ISU 标准专业步法图标渲染器
function drawISUSymbol(ctx, pt, category) {
    ctx.save();
    ctx.strokeStyle = "#ffffff";
    ctx.shadowBlur = 8;
    ctx.shadowColor = "rgba(56, 189, 248, 0.8)";
    ctx.lineWidth = 2;

    if (category === "three_turn") {
        // 绘制转三步：经典“3”字形尖角 (ξ)
        ctx.beginPath();
        ctx.arc(pt.x, pt.y - 12, 3, -Math.PI/2, Math.PI/2, false);
        ctx.lineTo(pt.x - 2, pt.y - 9);
        ctx.arc(pt.x, pt.y - 6, 3, -Math.PI/2, Math.PI/2, false);
        ctx.stroke();
    } else if (category === "bracket") {
        // 绘制括弧步：经典的向外括弧尖角 ({)
        ctx.beginPath();
        ctx.moveTo(pt.x + 3, pt.y - 15);
        ctx.quadraticCurveTo(pt.x - 1, pt.y - 15, pt.x - 1, pt.y - 11);
        ctx.lineTo(pt.x - 1, pt.y - 10);
        ctx.quadraticCurveTo(pt.x - 4, pt.y - 9, pt.x - 1, pt.y - 8);
        ctx.lineTo(pt.x - 1, pt.y - 7);
        ctx.quadraticCurveTo(pt.x - 1, pt.y - 3, pt.x + 3, pt.y - 3);
        ctx.stroke();
    } else if (category === "mohawk") {
        // 绘制莫霍克步：交叉双脚足迹 (Double Footprints)
        ctx.strokeStyle = "#fb923c"; 
        ctx.shadowColor = "rgba(249, 115, 22, 0.8)";
        // 左滑跑足迹线
        ctx.beginPath();
        ctx.ellipse(pt.x - 3, pt.y - 9, 1.8, 3.8, Math.PI / 6, 0, 2 * Math.PI);
        ctx.stroke();
        // 右滑跑足迹线
        ctx.beginPath();
        ctx.ellipse(pt.x + 3, pt.y - 9, 1.8, 3.8, -Math.PI / 6, 0, 2 * Math.PI);
        ctx.stroke();
    }
    ctx.restore();
}

// 🚀 核心渲染引擎：2D 冰面圆弧物理轨迹图
function drawSkatePath(pathData) {
    const canvas = document.getElementById("skate-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (pathData.length === 0) return;
~~~~~

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
    // 4. 渲染荧光划痕弧线
    for (let i = 1; i < points.length; i++) {
        const p = points[i];
        const centerTrans = transform(p.cx, p.cy);
        const scaledR = p.R * scale;

        ctx.beginPath();
        ctx.arc(centerTrans.x, centerTrans.y, scaledR, p.startAngle, p.endAngle, p.anticlockwise);
        
        // 根据步骤数产生炫目的渐变光痕效果
        const progressRatio = i / points.length;
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.45 + progressRatio * 0.55})`;
        ctx.lineWidth = 3.5;
        ctx.shadowBlur = 12;
        ctx.shadowColor = "rgba(56, 189, 248, 0.65)";
        ctx.stroke();
        ctx.shadowBlur = 0; // 重置发光防止污染文字

        // 绘制动作简写于弧线黄金中点 (Mid-angle)
        if (p.move) {
            const midAngle = p.startAngle + (p.endAngle - p.startAngle) * 0.5;
            const mx = centerTrans.x + scaledR * Math.cos(midAngle);
            const my = centerTrans.y + scaledR * Math.sin(midAngle);
            ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
            ctx.font = "9px sans-serif";
            ctx.textAlign = "center";
            // 只截取中文名称第一部分
            const miniName = p.move.name.split(" ")[0].substring(0, 4);
            ctx.fillText(miniName, mx, my - 5);

            // 绘制滑跑方向切线箭头
            const worldMx = p.cx + p.R * Math.cos(midAngle);
            const worldMy = p.cy + p.R * Math.sin(midAngle);
            const pMid = transform(worldMx, worldMy);

            const midK = p.anticlockwise ? -1 : 1;
            const arrowAngle = Math.atan2(midK * Math.cos(midAngle), -midK * Math.sin(midAngle));

            const arrowLength = 9;
            const arrowWidth = 5;
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
            ctx.fillStyle = "rgba(56, 189, 248, 0.85)";
            ctx.fill();
        }
    }

    // 5. 渲染边缘节点状态标志球与发光层
    points.forEach((p, idx) => {
        const pt = transform(p.x, p.y);
        const isLast = (idx === points.length - 1);

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isLast ? 6 : 4, 0, 2 * Math.PI);
        ctx.fillStyle = isLast ? "#38bdf8" : "#0f172a";
        ctx.strokeStyle = isLast ? "#ffffff" : "#0284c7";
        ctx.lineWidth = isLast ? 2.5 : 2;
        ctx.fill();
        ctx.stroke();
~~~~~
~~~~~javascript.new
    // 4. 渲染荧光划痕弧线
    for (let i = 1; i < points.length; i++) {
        const p = points[i];
        const centerTrans = transform(p.cx, p.cy);
        const scaledR = p.R * scale;

        ctx.beginPath();
        ctx.arc(centerTrans.x, centerTrans.y, scaledR, p.startAngle, p.endAngle, p.anticlockwise);
        
        const progressRatio = i / points.length;
        const startStateStr = points[i-1].state;
        const isLeft = startStateStr[0] === 'L';
        const isForward = startStateStr[1] === 'F';

        // 左右脚区分：左脚蓝色，右脚橙色
        const baseColor = isLeft ? "56, 189, 248" : "249, 115, 22";
        ctx.strokeStyle = `rgba(${baseColor}, ${0.5 + progressRatio * 0.5})`;
        ctx.shadowColor = `rgba(${baseColor}, 0.65)`;
        ctx.lineWidth = 3.5;
        ctx.shadowBlur = 12;

        // 前后向区分：前滑实线，后滑虚线 (ISU标准)
        if (isForward) {
            ctx.setLineDash([]);
        } else {
            ctx.setLineDash([6, 4]);
        }

        ctx.stroke();
        ctx.shadowBlur = 0; // 重置发光防止污染文字
        ctx.setLineDash([]); // 立即恢复实线

        // 绘制动作简写于弧线黄金中点 (Mid-angle)
        if (p.move) {
            const midAngle = p.startAngle + (p.endAngle - p.startAngle) * 0.5;
            const mx = centerTrans.x + scaledR * Math.cos(midAngle);
            const my = centerTrans.y + scaledR * Math.sin(midAngle);
            ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
            ctx.font = "9px sans-serif";
            ctx.textAlign = "center";
            // 只截取中文名称第一部分
            const miniName = p.move.name.split(" ")[0].substring(0, 4);
            ctx.fillText(miniName, mx, my - 5);

            // 绘制滑跑方向切线箭头（同步双脚颜色）
            const worldMx = p.cx + p.R * Math.cos(midAngle);
            const worldMy = p.cy + p.R * Math.sin(midAngle);
            const pMid = transform(worldMx, worldMy);

            const midK = p.anticlockwise ? -1 : 1;
            const arrowAngle = Math.atan2(midK * Math.cos(midAngle), -midK * Math.sin(midAngle));

            const arrowLength = 9;
            const arrowWidth = 5;
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
    }

    // 5. 渲染边缘节点状态标志球与发光层
    points.forEach((p, idx) => {
        const pt = transform(p.x, p.y);
        const isLast = (idx === points.length - 1);

        // 如果是特殊转体/步法，在转体点绘制 ISU 标准符号
        if (p.move && ["three_turn", "bracket", "mohawk"].includes(p.move.category)) {
            drawISUSymbol(ctx, pt, p.move.category);
        } else {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, isLast ? 6 : 4, 0, 2 * Math.PI);
            ctx.fillStyle = isLast ? "#38bdf8" : "#0f172a";
            ctx.strokeStyle = isLast ? "#ffffff" : "#0284c7";
            ctx.lineWidth = isLast ? 2.5 : 2;
            ctx.fill();
            ctx.stroke();
        }
~~~~~

### 下一步建议
- **真机调试**：目前莫霍克步（Mohawk）使用双脚交叉绘制，而转三和括弧步的尖角朝向是基于中轴线设定的。如果滑冰专家对尖角具体的物理弯曲方向（朝内/朝外弧）有更精确的几何朝向诉求，可以后续通过切向夹角（`arrowAngle`）来精确调节符号的角度。
