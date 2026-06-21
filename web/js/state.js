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