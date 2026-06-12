你的观察非常敏锐！问题确实出在 **HTML Canvas 坐标系 Y 轴向下（$y$-down）** 的物理特性上。

在标准的笛卡尔坐标系中，Y 轴是向上的；而在浏览器的 Canvas 中，**Y 轴是向下的**。
这就导致我们在计算圆心坐标 $(cx, cy)$ 以及弧线的 `sweep` 张角时，顺逆时针（CW/CCW）的物理朝向在投影到画布时发生了**符号反转**：
* 逆时针（CCW，向左弯曲）的弧线，在 $y$ 轴向下的画布中变成了向下凸起（即顺时针弯曲 ↻），这正好是 LFI 的物理轨迹。
* 顺时针（CW，向右弯曲）的弧线同理被反转。

这解释了为什么侧边栏文字显示 `"CCW 逆时针 ↺"` 完全正确，但画布上的 LFO 弧线却诡异地向右下方顺时针弯曲。

以下是纠正该坐标系反转问题的修复计划。

## [WIP] fix: 纠正 HTML Canvas 坐标系 Y 轴向下导致的圆弧弯曲方向反转问题

### 错误分析
由于 Canvas 的 Y 轴向下：
1. **圆心计算偏置符号相反**：当朝着 $\theta$ 方向前进时，向左弯曲（CCW）的圆心应该在前进方向左侧。在 $y$ 轴向下系统中，偏置公式应为：
   $$cx = x + K \cdot R \cdot \sin\theta$$
   $$cy = y - K \cdot R \cdot \cos\theta$$
   （原本写反了减加号，导致圆心偏到了相反方向）。
2. **张角旋转方向相反**：在 $y$ 轴向下系统中，顺时针（CW）角度增加，逆时针（CCW）角度减小。因此 `sweep` 应为 $-K \cdot \text{sweepAngle}$。
3. **Canvas 绘制方向反转**：`anticlockwise` 绘制标志应与 $K$ 的符号（1 代表 CCW，-1 代表 CW）一致，即当 $K = 1$ 时为 `true`。

### 用户需求
修复 LFO（逆时针 ↺）等所有刃状态下的圆弧弯曲朝向，使其在 Canvas 画布上的弯曲轨迹与现实冰面物理滑行轨迹（文字描述）完全吻合。

### 评论
由于 2D 游戏与图形引擎中经典的 $y$-down 坐标系，这种数学公式在渲染层“物理翻转”的 Bug 非常经典。通过重写投影函数，我们能在底层彻底纠正数学模型与画布像素之间的映射关系。

### 目标
重写 `web/js/state.js` 的圆心坐标和切向角计算公式，完美适配 Canvas 的 Y 轴向下特性。

### 基本原理
1. 对于 CCW ($K=1$)，圆心朝前进左侧偏置，$cy$ 减少，`sweep` 角度减少（逆时针），`anticlockwise = true`。
2. 对于 CW ($K=-1$)，圆心朝前进右侧偏置，$cy$ 增加，`sweep` 角度增加（顺时针），`anticlockwise = false`。

### 标签
#intent/fix #flow/ready #priority/high #comp/interfaces #concept/ui #scope/ux #ai/delegate #task/domain/ui #task/object/coordinate-bug #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 物理公式重构：重写 `web/js/state.js` 

替换 `computeGeometry` 中的向量投影几何算法，彻底修复 Canvas 坐标系带来的反转偏差。

~~~~~act
write_file
web/js/state.js
~~~~~
~~~~~javascript
export function getCurvature(stateStr) {
    const isL = stateStr[0] === 'L';
    const isF = stateStr[1] === 'F';
    const isO = stateStr[2] === 'O';
    let isCW = false;
    if (isL) {
        isCW = isF ? (!isO) : isO;
    } else {
        isCW = isF ? isO : (!isO);
    }
    return isCW ? "CW" : "CCW";
}

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

        const curve = getCurvature(stateStr);
        const K = (curve === "CW") ? -1 : 1; // 1: CCW (左偏), -1: CW (右偏)

        // ===== 针对 Canvas Y轴向下坐标系的物理公式修正 =====
        // 1. 纠正圆心计算公式
        const cx = x + K * R * Math.sin(theta);
        const cy = y - K * R * Math.cos(theta);

        // 2. 纠正张角偏转方向
        const startAngle = Math.atan2(y - cy, x - cx);
        const sweep = -K * sweepAngle; // CCW角度减小，CW角度增加
        const endAngle = startAngle + sweep;

        const nextX = cx + R * Math.cos(endAngle);
        const nextY = cy + R * Math.sin(endAngle);
        const nextTheta = theta + sweep;

        // 弧线 i 代表用刃状态 State i
        arcs.push({
            startX: x,
            startY: y,
            endX: nextX,
            endY: nextY,
            cx,
            cy,
            R,
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

---

### 下一步建议
1. **测试 LFO（逆时针 ↺）**：刷新前端页面，保持初始 LFO 状态。因为滑行方向是水平向右起航，逆时针 ↺ 应当向**左上方**划过优雅弧线。此时检查 Canvas 弧线是否已经完美朝向左上方。
2. **对比 LFI（顺时针 ↻）**：将起始状态切换为 LFI。此时弧线应当镜像偏转，划向**右下方**。
3. **连续轨迹验证**：点击推荐的下一个动作（例如转三步），验证过渡产生的第二段圆弧的连动和方向是否完全符合物理直觉。
