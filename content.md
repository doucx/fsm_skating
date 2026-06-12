你的直觉极其精准，这正是问题的根源所在！

在上一轮全屏视口交互的实现中：
1. 我们更新了弧线各特征点的中心投影坐标 `transform(p.cx, p.cy)`（它会随着 `zoomFactor` 的改变向四周延展/收缩）。
2. 但**弧线本身的绘制半径 `scaledR`（`p.R * scale`）、线宽、虚线间距、文本字号以及 ISU 矢量符号的大小却被锁定在了静态的 baseline 比例上**。

这导致当滑冰轨迹由于 Zoom 放大而散开时，弧线的中心点确实向四周发生了扩散，但弧线段半径和尺寸依然停留在常规视口的初始大小，导致原本契合的圆弧连接处断裂、脱靶，且标注文字在视野变大时显得极小、未做同步缩放。

我将生成一个修复计划，为所有的圆弧半径、线宽、虚线尺寸、标量偏置、文字大小和 ISU 矢量路径比例全面挂接动态比例系数（`fFactor`）。

## [WIP] fix(web): 修复 2D 轨迹在缩放时圆弧连接断裂与标注不缩放的 Bug

### 用户需求
修复在使用鼠标滚轮缩放时，冰面轨迹线连接出现错位、断裂，且标注字体、步法图标未同步进行等比例缩放的问题。

### 评论
这是一个经典且致命的图形学投影缩放同步问题。解决该 Bug 能够让 2D 冰面视图在任意滚轮比例下都保持完美的曲线连续性与清晰度。

### 目标
1. 在 `drawSkatePath` 入口提取动态比例乘法系数 `fFactor`。
2. 升级 `scaledR`，使其在常规模式下为 `1.0`，在全屏模式下随着 `zoomFactor` 同步拉伸。
3. 升级 `ctx.lineWidth`、`ctx.shadowBlur` 和虚线分布 `setLineDash`。
4. 将 `fFactor` 传递至 `drawISUSymbol`，实现莫霍克双足印、转三/括弧尖角曲线在不同缩放下的高保真矢量重构。
5. 使标注文字的大小（`font`）与垂直偏置量（`offset`）自适应。

### 基本原理
我们引入一个自适应系数 `fFactor = document.fullscreenElement ? zoomFactor : 1.0`。
所有涉及“绝对像素尺寸”的几何变量，在渲染时都必须乘以此系数。
例如圆弧绘制：
$$Radius_{draw} = R_{world} \times scale_{auto} \times fFactor$$
由于中心坐标与半径按相同比例放大，根据极坐标变换，弧段起终点的几何拼合位置将始终严丝合缝、完全闭合。

### 标签
#intent/fix #flow/ready #priority/high #comp/interfaces #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/visual-scaling-fix #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 升级 ISU 步法图标制图器以支持无级缩放

修改 `drawISUSymbol` 声明，增加比例系数参数 `fFactor`，并将所有的圆弧半径、二次曲线控制点、足印椭圆尺寸、阴影扩散与线宽比例化。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
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
~~~~~
~~~~~javascript.new
// 🎨 ISU 标准专业步法图标渲染器
function drawISUSymbol(ctx, pt, category, fFactor = 1.0) {
    ctx.save();
    ctx.strokeStyle = "#ffffff";
    ctx.shadowBlur = 8 * fFactor;
    ctx.shadowColor = "rgba(56, 189, 248, 0.8)";
    ctx.lineWidth = 2 * fFactor;

    if (category === "three_turn") {
        // 绘制转三步：经典“3”字形尖角 (ξ)
        ctx.beginPath();
        ctx.arc(pt.x, pt.y - 12 * fFactor, 3 * fFactor, -Math.PI/2, Math.PI/2, false);
        ctx.lineTo(pt.x - 2 * fFactor, pt.y - 9 * fFactor);
        ctx.arc(pt.x, pt.y - 6 * fFactor, 3 * fFactor, -Math.PI/2, Math.PI/2, false);
        ctx.stroke();
    } else if (category === "bracket") {
        // 绘制括弧步：经典的向外括弧尖角 ({)
        ctx.beginPath();
        ctx.moveTo(pt.x + 3 * fFactor, pt.y - 15 * fFactor);
        ctx.quadraticCurveTo(pt.x - 1 * fFactor, pt.y - 15 * fFactor, pt.x - 1 * fFactor, pt.y - 11 * fFactor);
        ctx.lineTo(pt.x - 1 * fFactor, pt.y - 10 * fFactor);
        ctx.quadraticCurveTo(pt.x - 4 * fFactor, pt.y - 9 * fFactor, pt.x - 1 * fFactor, pt.y - 8 * fFactor);
        ctx.lineTo(pt.x - 1 * fFactor, pt.y - 7 * fFactor);
        ctx.quadraticCurveTo(pt.x - 1 * fFactor, pt.y - 3 * fFactor, pt.x + 3 * fFactor, pt.y - 3 * fFactor);
        ctx.stroke();
    } else if (category === "mohawk") {
        // 绘制莫霍克步：交叉双脚足迹 (Double Footprints)
        ctx.strokeStyle = "#fb923c"; 
        ctx.shadowColor = "rgba(249, 115, 22, 0.8)";
        // 左滑跑足迹线
        ctx.beginPath();
        ctx.ellipse(pt.x - 3 * fFactor, pt.y - 9 * fFactor, 1.8 * fFactor, 3.8 * fFactor, Math.PI / 6, 0, 2 * Math.PI);
        ctx.stroke();
        // 右滑跑足迹线
        ctx.beginPath();
        ctx.ellipse(pt.x + 3 * fFactor, pt.y - 9 * fFactor, 1.8 * fFactor, 3.8 * fFactor, -Math.PI / 6, 0, 2 * Math.PI);
        ctx.stroke();
    }
    ctx.restore();
}
~~~~~

#### Acts 2: 动态比例化弧线半径、线宽、虚线步距、字体大小与箭头坐标

修改 `drawSkatePath` 里的弧线重绘循环。引入 `fFactor` 并让它全面控制半径 `scaledR`、线宽、虚线及箭头。

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
~~~~~
~~~~~javascript.new
    // 4. 渲染荧光划痕弧线
    const fFactor = document.fullscreenElement ? zoomFactor : 1.0;

    for (let i = 1; i < points.length; i++) {
        const p = points[i];
        const centerTrans = transform(p.cx, p.cy);
        const scaledR = p.R * scale * fFactor; // 圆弧绘制半径完美关联缩放比例

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
        ctx.lineWidth = 3.5 * fFactor; // 物理线粗细关联缩放
        ctx.shadowBlur = 12 * fFactor; // 荧光晕开半径关联缩放

        // 前后向区分：前滑实线，后滑虚线 (ISU标准)
        if (isForward) {
            ctx.setLineDash([]);
        } else {
            ctx.setLineDash([6 * fFactor, 4 * fFactor]); // 虚线分段尺寸关联缩放
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
            ctx.font = `${Math.round(9 * fFactor)}px sans-serif`; // 字体大小随缩放变化
            ctx.textAlign = "center";
            // 只截取中文名称第一部分
            const miniName = p.move.name.split(" ")[0].substring(0, 4);
            ctx.fillText(miniName, mx, my - 5 * fFactor); // 垂直距离自适应偏置

            // 绘制滑跑方向切线箭头（同步双脚颜色与缩放）
            const worldMx = p.cx + p.R * Math.cos(midAngle);
            const worldMy = p.cy + p.R * Math.sin(midAngle);
            const pMid = transform(worldMx, worldMy);

            const midK = p.anticlockwise ? -1 : 1;
            const arrowAngle = Math.atan2(midK * Math.cos(midAngle), -midK * Math.sin(midAngle));

            const arrowLength = 9 * fFactor; // 箭头尺寸自适应缩放
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
    }
~~~~~

#### Acts 3: 动态比例化标志球球体半径、描边粗细与节点文本

修改 `drawSkatePath` 末尾的边缘标志节点循环，使得 LFO 等状态球及标注字号也随着缩放进行动态适配，并向 `drawISUSymbol` 传入动态因子。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
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

        // 绘制高亮文字
        ctx.fillStyle = isLast ? "#ffffff" : "#94a3b8";
        ctx.font = isLast ? "bold 11px monospace" : "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(p.state, pt.x, pt.y - (isLast ? 11 : 9));
    });
}
~~~~~
~~~~~javascript.new
    // 5. 渲染边缘节点状态标志球与发光层
    points.forEach((p, idx) => {
        const pt = transform(p.x, p.y);
        const isLast = (idx === points.length - 1);

        // 如果是特殊转体/步法，在转体点绘制 ISU 标准符号（传入比例系数参数）
        if (p.move && ["three_turn", "bracket", "mohawk"].includes(p.move.category)) {
            drawISUSymbol(ctx, pt, p.move.category, fFactor);
        } else {
            ctx.beginPath();
            const markerR = (isLast ? 6 : 4) * fFactor; // 标志球半径关联缩放
            ctx.arc(pt.x, pt.y, markerR, 0, 2 * Math.PI);
            ctx.fillStyle = isLast ? "#38bdf8" : "#0f172a";
            ctx.strokeStyle = isLast ? "#ffffff" : "#0284c7";
            ctx.lineWidth = (isLast ? 2.5 : 2) * fFactor; // 描边粗细关联缩放
            ctx.fill();
            ctx.stroke();
        }

        // 绘制高亮文字
        ctx.fillStyle = isLast ? "#ffffff" : "#94a3b8";
        ctx.font = isLast ? `bold ${Math.round(11 * fFactor)}px monospace` : `${Math.round(10 * fFactor)}px monospace`; // 字体大小关联缩放
        ctx.textAlign = "center";
        ctx.fillText(p.state, pt.x, pt.y - (isLast ? 11 : 9) * fFactor); // 偏置距离自适应缩放
    });
}
~~~~~

### 下一步建议
- **运行并多层级缩放体验**：在浏览器中打开 FSM 冰面系统，双击或点击全屏按钮，然后尝试快速、慢速滑动鼠标滚轮，验证圆弧连接曲线、莫霍克交叉足迹在任意放大倍数下是否均天衣无缝、绝对贴合。
- **Git 暂存与归档建议**：在多轮手动视觉与交互方案修改之后，如果全部核心功能均验证成功，可以在终端准备提交记录以结束该功能点的开发。
