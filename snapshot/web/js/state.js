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
 */
export function computeGeometry(pathData, R = 50, sweepAngle = Math.PI * 0.65) {
    if (!pathData || pathData.length === 0) return { nodes: [], arcs: [] };

    const nodes = [];
    const arcs = [];
    let x = 0;
    let y = 0;
    let theta = 0;

    // Node 0: 首个节点，标记为 START
    nodes.push({
        x,
        y,
        label: "START",
        category: "start",
        state: pathData[0].state
    });

    for (let i = 0; i < pathData.length - 1; i++) {
        const step = pathData[i];
        const nextStep = pathData[i + 1];
        const stateStr = step.state;

        const curve = getCurvature(stateStr);
        const K = (curve === "CW") ? -1 : 1;

        const cx = x - K * R * Math.sin(theta);
        const cy = y + K * R * Math.cos(theta);

        const startAngle = Math.atan2(y - cy, x - cx);
        const sweep = K * sweepAngle;
        const endAngle = startAngle + sweep;

        const nextX = cx + R * Math.cos(endAngle);
        const nextY = cy + R * Math.sin(endAngle);
        const nextTheta = theta + sweep;

        // Arc i: 从当前点滑行到下一个动作点，代表用刃状态 State i
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
            anticlockwise: (K === -1),
            state: stateStr,
            move: step.move
        });

        x = nextX;
        y = nextY;
        theta = nextTheta;

        // Node i+1: 代表在滑行 Arc i 结束处发生的步法动作 Move i
        nodes.push({
            x,
            y,
            label: step.move ? step.move.name : "",
            category: step.move ? step.move.category : "point",
            state: nextStep.state,
            move: step.move
        });
    }

    return { nodes, arcs };
}