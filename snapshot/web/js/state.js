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