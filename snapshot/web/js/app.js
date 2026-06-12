const API_BASE = "http://127.0.0.1:8000/api";
let path = []; // 存储结构: [ { state: 'LFO', move: null } ]

// 初始化
document.addEventListener("DOMContentLoaded", () => {
    initChoreography();
});

// 1. 初始化或重置编排
function initChoreography() {
    const startState = document.getElementById("start-state-select").value;
    path = [{ state: startState, move: null }];
    updateCurrStateUI(startState);
    fetchNextTransitions();
    updateStats();
}

function resetChoreography() {
    initChoreography();
}

// 状态转弯（滑行轨迹弯曲方向）计算公式
function getCurvature(stateStr) {
    let isL = stateStr[0] === 'L';
    let isF = stateStr[1] === 'F';
    let isO = stateStr[2] === 'O';
    let isCW = false;
    if (isL) {
        isCW = isF ? (!isO) : isO;
    } else {
        isCW = isF ? isO : (!isO);
    }
    return isCW ? "CW" : "CCW";
}

// 更新状态 UI 显示
function updateCurrStateUI(stateStr) {
    document.getElementById("curr-state-badge").innerText = stateStr;
    const descMap = {
        'LFO': '左脚 (L) | 向前 (F) | 外刃 (O)',
        'LFI': '左脚 (L) | 向前 (F) | 内刃 (I)',
        'LBO': '左脚 (L) | 向后 (B) | 外刃 (O)',
        'LBI': '左脚 (L) | 向后 (B) | 内刃 (I)',
        'RFO': '右脚 (R) | 向前 (F) | 外刃 (O)',
        'RFI': '右脚 (R) | 向前 (F) | 内刃 (I)',
        'RBO': '右脚 (R) | 向后 (B) | 外刃 (O)',
        'RBI': '右脚 (R) | 向后 (B) | 内刃 (I)',
    };
    document.getElementById("curr-state-desc").innerText = descMap[stateStr] || "";

    const curve = getCurvature(stateStr);
    const isCW = curve === "CW";
    const curveDesc = isCW ? "CW 顺时针 ↻" : "CCW 逆时针 ↺";
    document.getElementById("curr-curve-desc").innerText = curveDesc;
    document.getElementById("curr-curve-desc").className = isCW ? "ml-1 font-semibold text-sky-300" : "ml-1 font-semibold text-teal-300";
}

// 2. 动态拉取下一次的可用变换
async function fetchNextTransitions() {
    const currState = path[path.length - 1].state;
    const maxDiff = document.getElementById("max-difficulty-select").value;
    const container = document.getElementById("transition-options");
    
    container.innerHTML = '<p class="text-xs text-slate-500 animate-pulse">正在调配 FSM 编排逻辑推荐...</p>';

    try {
        const res = await fetch(`${API_BASE}/transitions/${currState}?max_difficulty=${maxDiff}`);
        if (!res.ok) throw new Error("获取转移失败");
        const options = await res.json();

        if (options.length === 0) {
            container.innerHTML = '<p class="text-xs text-rose-400/80 p-2 border border-rose-950 bg-rose-950/20 rounded-lg">⚠️ 当前状态下没有符合最大难度限制的有效滑行变体！请宽限难度限制。</p>';
            return;
        }

        container.innerHTML = "";
        options.forEach((opt) => {
            const next = opt.target_state;
            const move = opt.move;
            const rotDir = move.rotation_dir;
            let rotBadge = "";
            if (rotDir === "CW") {
                rotBadge = '<span class="text-[10px] bg-sky-950 text-sky-300 border border-sky-800 px-1.5 py-0.5 rounded-md ml-2">↻ 顺旋转</span>';
            } else if (rotDir === "CCW") {
                rotBadge = '<span class="text-[10px] bg-teal-950 text-teal-300 border border-teal-800 px-1.5 py-0.5 rounded-md ml-2">↺ 逆旋转</span>';
            }

            const item = document.createElement("button");
            item.className = "w-full text-left bg-slate-800/40 hover:bg-slate-700/60 border border-slate-700/60 rounded-xl p-3 flex justify-between items-center transition group";
            item.onclick = () => chooseNextMove(next, move);
            item.innerHTML = `
                <div>
                    <span class="font-bold text-slate-200 group-hover:text-sky-300 transition tracking-wider mr-2">${currState} ──▶ ${next.foot}${next.direction}${next.edge}</span>
                    ${rotBadge}
                    <div class="text-xs text-slate-400 mt-1">${move.name}</div>
                </div>
                <div class="text-right">
                    <span class="text-xs font-semibold px-2 py-1 rounded bg-slate-900 border border-slate-700/80 text-sky-400">难度: ${move.difficulty}</span>
                </div>
            `;
            container.appendChild(item);
        });
    } catch (err) {
        container.innerHTML = `<p class="text-xs text-rose-400">加载推荐分支时出现网络故障。请确认后端服务已运行。</p>`;
    }
}

// 选择新状态
function chooseNextMove(nextStateObj, moveObj) {
    path[path.length - 1].move = moveObj;
    const nextStateStr = `${nextStateObj.foot}${nextStateObj.direction}${nextStateObj.edge}`;
    path.push({ state: nextStateStr, move: null });

    updateCurrStateUI(nextStateStr);
    fetchNextTransitions();
    updateStats();
}

// 撤销上一步
function undoMove() {
    if (path.length <= 1) return;
    path.pop();
    path[path.length - 1].move = null;
    const prevState = path[path.length - 1].state;
    updateCurrStateUI(prevState);
    fetchNextTransitions();
    updateStats();
}

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

    // 1. 向量数学推演各控制节点坐标
    let points = [];
    let x = 0;
    let y = 0;
    let theta = 0; // 冰滑前行切向角（弧度）
    const R = 50;  // 设定基础滑行半径
    const sweepAngle = Math.PI * 0.65; // 每个物理动作在弧线上转过的张角 (117度)

    points.push({ x, y, state: pathData[0].state, move: null });

    for (let i = 0; i < pathData.length - 1; i++) {
        const step = pathData[i];
        const nextStep = pathData[i+1];
        const stateStr = step.state;
        
        const curve = getCurvature(stateStr);
        const K = (curve === "CW") ? -1 : 1; // 1代表CCW（向左划圆弧），-1代表CW（向右划圆弧）

        // 计算该动作弧段的几何切线圆心
        const cx = x - K * R * Math.sin(theta);
        const cy = y + K * R * Math.cos(theta);

        // 圆心至起点的偏角
        const startAngle = Math.atan2(y - cy, x - cx);
        const sweep = K * sweepAngle;
        const endAngle = startAngle + sweep;

        // 计算终点状态在 2D 平面中的投影位置
        const nextX = cx + R * Math.cos(endAngle);
        const nextY = cy + R * Math.sin(endAngle);
        const nextTheta = theta + sweep; // 继承速度切向

        points.push({
            x: nextX,
            y: nextY,
            cx,
            cy,
            R,
            startAngle,
            endAngle,
            anticlockwise: (K === -1), // 确定 Canvas 绘制方向
            state: nextStep.state,
            move: step.move
        });

        // 迭代坐标与前行切角
        x = nextX;
        y = nextY;
        theta = nextTheta;
    }

    // 2. 计算极值并实现物理包围盒居中自适应缩放 (Auto-scale)
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    points.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    });

    const pad = 35;
    const w = maxX - minX || 1;
    const h = maxY - minY || 1;
    // 自适应缩放比例上限为 1.5 倍，防止少量点时无限放大
    const scale = Math.min((canvas.width - 2 * pad) / w, (canvas.height - 2 * pad) / h, 1.5);

    // 视口平移补偿
    const offsetX = (canvas.width - w * scale) / 2 - minX * scale;
    const offsetY = (canvas.height - h * scale) / 2 - minY * scale;

    // 映射投影函数
    const transform = (px, py) => ({
        x: px * scale + offsetX,
        y: py * scale + offsetY
    });

    // 3. 绘制微光网格冰面 scratch pattern 质感
    ctx.strokeStyle = "rgba(148, 163, 184, 0.04)";
    ctx.lineWidth = 1;
    for (let i = 20; i < canvas.width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let j = 20; j < canvas.height; j += 30) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(canvas.width, j);
        ctx.stroke();
    }

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

        // 绘制高亮文字
        ctx.fillStyle = isLast ? "#ffffff" : "#94a3b8";
        ctx.font = isLast ? "bold 11px monospace" : "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(p.state, pt.x, pt.y - (isLast ? 11 : 9));
    });
}

// 渲染编排统计与流向链路
function updateStats() {
    const stepsCount = path.length - 1;
    document.getElementById("stat-steps").innerText = `${stepsCount} 步`;

    let totalDiff = 0;
    let cwCount = 0;
    let ccwCount = 0;

    path.forEach((step) => {
        if (step.move) {
            totalDiff += step.move.difficulty;
            if (step.move.rotation_dir === "CW") cwCount++;
            if (step.move.rotation_dir === "CCW") ccwCount++;
        }
    });

    document.getElementById("stat-total-diff").innerText = totalDiff;
    document.getElementById("stat-cw").innerText = cwCount;
    document.getElementById("stat-ccw").innerText = ccwCount;

    // 比例条
    const totalRots = cwCount + ccwCount;
    if (totalRots > 0) {
        const cwWidth = (cwCount / totalRots) * 100;
        document.getElementById("cw-bar").style.width = `${cwWidth}%`;
        document.getElementById("ccw-bar").style.width = `${100 - cwWidth}%`;

        if (cwCount > 0 && ccwCount > 0) {
            document.getElementById("stat-balance-p").innerHTML = '<i class="fa-solid fa-circle-check text-emerald-400 mr-1"></i> <span class="text-emerald-400 font-semibold">双向平衡良好！符合 ISU 高级别评级要求。</span>';
        } else {
            document.getElementById("stat-balance-p").innerHTML = '<i class="fa-solid fa-triangle-exclamation text-amber-400 mr-1"></i> <span class="text-amber-400">目前仅包含单一转弯。建议增加交替方向。</span>';
        }
    } else {
        document.getElementById("cw-bar").style.width = `50%`;
        document.getElementById("ccw-bar").style.width = `50%`;
        document.getElementById("stat-balance-p").innerHTML = '<i class="fa-solid fa-info-circle text-sky-400 mr-1"></i> 暂不包含显著转体类步法。';
    }

    // 更新已完成轨迹流向图
    const trail = document.getElementById("choreography-trail");
    trail.innerHTML = "";
    path.forEach((step, idx) => {
        const stateNode = document.createElement("span");
        stateNode.className = "px-2.5 py-1 text-xs font-bold font-mono tracking-wider bg-sky-950 text-sky-300 rounded-md border border-sky-800 glow-ice";
        stateNode.innerText = step.state;
        trail.appendChild(stateNode);

        if (step.move) {
            const arrow = document.createElement("span");
            arrow.className = "text-[10px] text-slate-500 flex flex-col items-center px-1";
            // 显示步法名称（截取前段）和难度
            const miniName = step.move.name.split(" ")[0];
            arrow.innerHTML = `
                <i class="fa-solid fa-chevron-right"></i>
                <span class="text-[8px] text-slate-400 scale-90 text-center leading-tight">
                    ${miniName}<br/>${step.move.difficulty}级
                </span>`;
            trail.appendChild(arrow);
        }
    });

    if (stepsCount > 0) {
        const undoBtn = document.createElement("button");
        undoBtn.className = "ml-auto px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-xs text-rose-400 transition";
        undoBtn.onclick = undoMove;
        undoBtn.innerHTML = '<i class="fa-solid fa-arrow-rotate-left mr-1"></i> 回撤';
        trail.appendChild(undoBtn);
    }

    // 🚀 重绘冰面轨迹画布
    drawSkatePath(path);
}

// 3. 校验解析
async function verifySequence() {
    const sequence = document.getElementById("verify-input").value;
    const output = document.getElementById("verify-result");
    if (!sequence.trim()) return;

    output.className = "mt-4 p-4 rounded-xl text-sm border bg-slate-900/80";
    output.innerHTML = '<p class="text-slate-400 animate-pulse">正在进行物理路径校验与动力学翻译...</p>';

    try {
        const res = await fetch(`${API_BASE}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sequence })
        });
        const data = await res.json();

        if (!data.valid) {
            output.className = "mt-4 p-4 rounded-xl text-sm border border-rose-950 bg-rose-950/20";
            output.innerHTML = `<p class="text-rose-400 font-semibold"><i class="fa-solid fa-circle-xmark mr-1"></i> 校验失败</p><p class="text-xs text-slate-300 mt-2">${data.error}</p>`;
        } else {
            output.className = "mt-4 p-4 rounded-xl text-sm border border-emerald-950 bg-emerald-950/10 text-slate-300 space-y-3";
            let listHTML = "";
            data.transitions.forEach((t, i) => {
                const rot = t.selected_move.rotation_dir ? ` [${t.selected_move.rotation_dir === 'CW' ? '顺时针' : '逆时针'}]` : "";
                listHTML += `
                    <div class="text-xs pl-3 border-l border-emerald-800">
                        <span class="font-bold text-slate-200">${t.from_state} ──▶ ${t.to_state}</span><br/>
                        <span class="text-emerald-400">${t.selected_move.name}${rot}</span> (难度: ${t.selected_move.difficulty})
                    </div>
                `;
            });

            output.innerHTML = `
                <p class="text-emerald-400 font-bold flex items-center"><i class="fa-solid fa-circle-check mr-1"></i> 验证通过！完全符合动力学规范！</p>
                <p class="text-xs text-slate-400">总设计难度积分: <strong class="text-slate-200 text-sm">${data.total_difficulty}</strong></p>
                <div class="space-y-2 mt-2">${listHTML}</div>
            `;
        }
    } catch (err) {
        output.innerHTML = `<p class="text-xs text-rose-400">通信网络故障。</p>`;
    }
}

// 4. 自动生成
async function generateSequence() {
    const steps = document.getElementById("gen-steps").value;
    const maxDiff = document.getElementById("gen-diff").value;
    const selectState = document.getElementById("start-state-select").value;

    try {
        const res = await fetch(`${API_BASE}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                steps: parseInt(steps),
                max_difficulty: parseInt(maxDiff),
                start_state: selectState
            })
        });

        if (!res.ok) {
            const detail = await res.json();
            alert(`[-] 生成失败: ${detail.detail || "不可抗力"}`);
            return;
        }

        const data = await res.json();
        
        path = [];
        data.forEach((step) => {
            const stateStr = `${step.state.foot}${step.state.direction}${step.state.edge}`;
            path.push({
                state: stateStr,
                move: step.move
            });
        });

        const lastState = path[path.length - 1].state;
        updateCurrStateUI(lastState);
        fetchNextTransitions();
        updateStats();

    } catch (err) {
        alert("通信异常，生成失败。");
    }
}

// 5. 全屏切换与动态分辨率适配
function toggleFullscreen() {
    const container = document.getElementById("canvas-container");
    if (!document.fullscreenElement) {
        container.requestFullscreen().catch((err) => {
            console.error(`无法进入全屏模式: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
}

document.addEventListener("fullscreenchange", () => {
    const canvas = document.getElementById("skate-canvas");
    if (document.fullscreenElement) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    } else {
        canvas.width = 600;
        canvas.height = 200;
    }
    drawSkatePath(path);
});