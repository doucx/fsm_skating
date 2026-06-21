export function parseState(stateStr) {
    if (!stateStr || stateStr.length !== 3) {
        return { foot: null, direction: null, edge: null, isLeft: false, isForward: false, isOutside: false };
    }
    const foot = stateStr[0];
    const direction = stateStr[1];
    const edge = stateStr[2];
    return {
        foot,
        direction,
        edge,
        isLeft: foot === 'L',
        isForward: direction === 'F',
        isOutside: edge === 'O'
    };
}

export function getCurvature(stateStr) {
    const { isLeft, isForward, isOutside } = parseState(stateStr);
    let isCW = false;
    if (isLeft) {
        isCW = isForward ? (!isOutside) : isOutside;
    } else {
        isCW = isForward ? isOutside : (!isOutside);
    }
    return isCW ? "CW" : "CCW";
}

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