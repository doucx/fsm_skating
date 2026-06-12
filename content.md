我们将为前端应用实施 **方案 A：原生 ES6 模块化拆分（ES Modules）**。这不需要任何构建系统（如 Vite 或 Webpack），直接利用浏览器的原生 ESM 加载机制，极大降低文件的维护复杂度。

同时，我们将在拆分中实现全新的轨迹物理映射：
* **弧线（Arc）**：承载 `State`（刃状态，如 LFO / LBI）作为主要文本。
* **节点（Node）**：承载 `Move`（动作转体点，如前外转三），第一个节点标注为 `START` 起点。
* 由于模块作用域隔离，我们将把所有 HTML inline click 事件绑定的函数显式挂载到 `window` 上，确保 HTML 兼容性。

以下是完整的重构执行计划。

## [WIP] refactor: 拆分前端 app.js 为 ES6 模块并重构轨迹渲染模型

### 用户需求
用户需要将前端 `web/js/app.js` 重构为模块化的 ES6 脚本，并将滑冰轨迹渲染模型修改为“弧线代表用刃状态、节点代表步法动作（点是动作）”的直观动力学模型。

### 评论
该重构具有极高的工程价值与专业表现力：
1. **工程解耦**：彻底消除 300 多行单体脚本中网络请求、几何计算、DOM 更新与画布渲染的紧密耦合，将每个职责隔离为单一文件。
2. **力学直观**：在物理世界中，滑冰者在长距离弧线上保持“用刃状态（State）”，而在极短的交折点进行“转体动作（Move）”。此模型完美匹配了现实物理过程，对专业滑冰教学与编排具有真正的学术意义。

### 目标
1. 新增 `web/js/api.js`、`web/js/state.js`、`web/js/canvasRenderer.js`、`web/js/uiController.js`。
2. 重写 `web/js/app.js` 作为核心调度中心。
3. 修改 `web/index.html` 以 `type="module"` 引入入口模块。

### 基本原理
我们利用浏览器的原生 `import` 和 `export` 语法来实现模块加载。
* `state.js` 负责纯粹的物理几何计算，将 path 数据转换成 `nodes` 与 `arcs` 集合。
* `canvasRenderer.js` 专门负责 2D Canvas 的路径绘制、全屏手势处理以及 ISU 标准图标渲染。
* `uiController.js` 隔离 DOM 选择和 UI 填充动作。
* `api.js` 专门处理网络 fetch 请求。
* 入口 `app.js` 负责桥接状态和事件流。由于 HTML 中有 inline onclick 属性，我们必须在 `app.js` 中将对外交互的方法显式赋值到 `window` 上。

### 标签
#intent/refine #flow/ready #priority/high #comp/interfaces #concept/ui #scope/dx #scope/ux #ai/delegate #task/domain/ui #task/object/module-refactor #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 新建 API 模块 `web/js/api.js`

封装所有与 FastAPI 后端交互的网络通信请求。

~~~~~act
write_file
web/js/api.js
~~~~~
~~~~~javascript
export const API_BASE = "http://127.0.0.1:8000/api";

export async function fetchTransitions(state, maxDifficulty) {
    const res = await fetch(`${API_BASE}/transitions/${state}?max_difficulty=${maxDifficulty}`);
    if (!res.ok) throw new Error("获取可行转移失败");
    return await res.json();
}

export async function verifySequence(sequence) {
    const res = await fetch(`${API_BASE}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence })
    });
    if (!res.ok) throw new Error("验证失败");
    return await res.json();
}

export async function generateSequence(steps, maxDifficulty, startState) {
    const res = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            steps,
            max_difficulty: maxDifficulty,
            start_state: startState
        })
    });
    if (!res.ok) {
        const detail = await res.json();
        throw new Error(detail.detail || "自动规划算法未给出有效方案");
    }
    return await res.json();
}
~~~~~

#### Acts 2: 新建物理状态模块 `web/js/state.js`

定义滑行轨迹曲线方向算法，并将编排路径数据精确映射为“弧线是状态，点是动作”的物理几何拓扑结构（Nodes 与 Arcs）。

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
~~~~~

#### Acts 3: 新建画布渲染器模块 `web/js/canvasRenderer.js`

封装 Canvas 的绘制细节，将 State 绘制到连续弧线、Move 绘制到交接节点，同时维护全屏手势变换（平移与缩放）及 ISU 图标绘制。

~~~~~act
write_file
web/js/canvasRenderer.js
~~~~~
~~~~~javascript
import { getCurvature } from './state.js';

export class CanvasRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");
        this.zoomFactor = 1.0;
        this.panX = 0;
        this.panY = 0;
    }

    resetViewport() {
        this.zoomFactor = 1.0;
        this.panX = 0;
        this.panY = 0;
    }

    draw(geometry) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const { nodes, arcs } = geometry;
        if (nodes.length === 0) return;

        // 自适应计算包围盒
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        nodes.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        });

        const pad = 35;
        const w = maxX - minX || 1;
        const h = maxY - minY || 1;
        const scale = Math.min((this.canvas.width - 2 * pad) / w, (this.canvas.height - 2 * pad) / h, 1.5);

        const offsetX = (this.canvas.width - w * scale) / 2 - minX * scale;
        const offsetY = (this.canvas.height - h * scale) / 2 - minY * scale;

        const transform = (px, py) => {
            const ax = px * scale + offsetX;
            const ay = py * scale + offsetY;
            
            if (!document.fullscreenElement) {
                return { x: ax, y: ay };
            }
            
            const cx = this.canvas.width / 2;
            const cy = this.canvas.height / 2;
            return {
                x: (ax - cx) * this.zoomFactor + cx + this.panX,
                y: (ay - cy) * this.zoomFactor + cy + this.panY
            };
        };

        // 绘制微光网格冰面质感
        ctx.strokeStyle = "rgba(148, 163, 184, 0.04)";
        ctx.lineWidth = 1;
        for (let i = 20; i < this.canvas.width; i += 30) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, this.canvas.height);
            ctx.stroke();
        }
        for (let j = 20; j < this.canvas.height; j += 30) {
            ctx.beginPath();
            ctx.moveTo(0, j);
            ctx.lineTo(this.canvas.width, j);
            ctx.stroke();
        }

        const fFactor = document.fullscreenElement ? this.zoomFactor : 1.0;

        // 绘制连续滑行圆弧段 (Arcs = States)
        arcs.forEach((arc, idx) => {
            const centerTrans = transform(arc.cx, arc.cy);
            const scaledR = arc.R * scale * fFactor;

            ctx.save();
            ctx.beginPath();
            ctx.arc(centerTrans.x, centerTrans.y, scaledR, arc.startAngle, arc.endAngle, arc.anticlockwise);

            const progressRatio = (idx + 1) / arcs.length;
            const isLeft = arc.state[0] === 'L';
            const isForward = arc.state[1] === 'F';

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

        // 绘制动作转换节点 (Nodes = Moves)
        nodes.forEach((node, idx) => {
            const pt = transform(node.x, node.y);
            const isLast = (idx === nodes.length - 1);

            ctx.save();
            if (idx === 0) {
                // START 节点绘制 (专属亮绿色微光球)
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 6 * fFactor, 0, 2 * Math.PI);
                ctx.fillStyle = "#10b981";
                ctx.strokeStyle = "#ffffff";
                ctx.lineWidth = 2 * fFactor;
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = "#10b981";
                ctx.font = `bold ${Math.round(10 * fFactor)}px sans-serif`;
                ctx.textAlign = "center";
                ctx.fillText("START", pt.x, pt.y + 16 * fFactor);
            } else if (node.move && ["three_turn", "bracket", "mohawk"].includes(node.move.category)) {
                // 绘制特殊动作的 ISU 专业图标
                this._drawISUSymbol(ctx, pt, node.move.category, fFactor);
                
                // 动作名称标签
                ctx.fillStyle = "#94a3b8";
                ctx.font = `${Math.round(10 * fFactor)}px sans-serif`;
                ctx.textAlign = "center";
                const miniName = node.move.name.split(" ")[0].substring(0, 4);
                ctx.fillText(miniName, pt.x, pt.y - 12 * fFactor);
            } else {
                // 普通转移节点
                ctx.beginPath();
                const markerR = (isLast ? 6 : 4) * fFactor;
                ctx.arc(pt.x, pt.y, markerR, 0, 2 * Math.PI);
                ctx.fillStyle = isLast ? "#38bdf8" : "#0f172a";
                ctx.strokeStyle = isLast ? "#ffffff" : "#0284c7";
                ctx.lineWidth = (isLast ? 2.5 : 2) * fFactor;
                ctx.fill();
                ctx.stroke();

                if (node.move) {
                    ctx.fillStyle = "#94a3b8";
                    ctx.font = `${Math.round(10 * fFactor)}px sans-serif`;
                    ctx.textAlign = "center";
                    const miniName = node.move.name.split(" ")[0].substring(0, 4);
                    ctx.fillText(miniName, pt.x, pt.y - 12 * fFactor);
                }
            }
            ctx.restore();
        });
    }

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

    _drawISUSymbol(ctx, pt, category, fFactor = 1.0) {
        ctx.save();
        ctx.strokeStyle = "#ffffff";
        ctx.shadowBlur = 8 * fFactor;
        ctx.shadowColor = "rgba(56, 189, 248, 0.8)";
        ctx.lineWidth = 2 * fFactor;

        if (category === "three_turn") {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y - 12 * fFactor, 3 * fFactor, -Math.PI/2, Math.PI/2, false);
            ctx.lineTo(pt.x - 2 * fFactor, pt.y - 9 * fFactor);
            ctx.arc(pt.x, pt.y - 6 * fFactor, 3 * fFactor, -Math.PI/2, Math.PI/2, false);
            ctx.stroke();
        } else if (category === "bracket") {
            ctx.beginPath();
            ctx.moveTo(pt.x + 3 * fFactor, pt.y - 15 * fFactor);
            ctx.quadraticCurveTo(pt.x - 1 * fFactor, pt.y - 15 * fFactor, pt.x - 1 * fFactor, pt.y - 11 * fFactor);
            ctx.lineTo(pt.x - 1 * fFactor, pt.y - 10 * fFactor);
            ctx.quadraticCurveTo(pt.x - 4 * fFactor, pt.y - 9 * fFactor, pt.x - 1 * fFactor, pt.y - 8 * fFactor);
            ctx.lineTo(pt.x - 1 * fFactor, pt.y - 7 * fFactor);
            ctx.quadraticCurveTo(pt.x - 1 * fFactor, pt.y - 3 * fFactor, pt.x + 3 * fFactor, pt.y - 3 * fFactor);
            ctx.stroke();
        } else if (category === "mohawk") {
            ctx.strokeStyle = "#fb923c"; 
            ctx.shadowColor = "rgba(249, 115, 22, 0.8)";
            ctx.beginPath();
            ctx.ellipse(pt.x - 3 * fFactor, pt.y - 9 * fFactor, 1.8 * fFactor, 3.8 * fFactor, Math.PI / 6, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(pt.x + 3 * fFactor, pt.y - 9 * fFactor, 1.8 * fFactor, 3.8 * fFactor, -Math.PI / 6, 0, 2 * Math.PI);
            ctx.stroke();
        }
        ctx.restore();
    }
}
~~~~~

#### Acts 4: 新建 UI 界面控制模块 `web/js/uiController.js`

隔离所有纯 DOM 渲染和 UI 控制，维护指标统计、当前状态 Badge 以及 FSM 可选过渡选项的动态渲染逻辑。

~~~~~act
write_file
web/js/uiController.js
~~~~~
~~~~~javascript
import { getCurvature } from './state.js';

export function updateStats(path, undoCallback) {
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

    const totalRots = cwCount + ccwCount;
    const cwBar = document.getElementById("cw-bar");
    const ccwBar = document.getElementById("ccw-bar");
    const balanceP = document.getElementById("stat-balance-p");

    if (totalRots > 0) {
        const cwWidth = (cwCount / totalRots) * 100;
        cwBar.style.width = `${cwWidth}%`;
        ccwBar.style.width = `${100 - cwWidth}%`;

        if (cwCount > 0 && ccwCount > 0) {
            balanceP.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-400 mr-1"></i> <span class="text-emerald-400 font-semibold">双向平衡良好！符合 ISU 高级别评级要求。</span>';
        } else {
            balanceP.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-amber-400 mr-1"></i> <span class="text-amber-400">目前仅包含单一转弯。建议增加交替方向。</span>';
        }
    } else {
        cwBar.style.width = `50%`;
        ccwBar.style.width = `50%`;
        balanceP.innerHTML = '<i class="fa-solid fa-info-circle text-sky-400 mr-1"></i> 暂不包含显著转体类步法。';
    }

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
        undoBtn.onclick = undoCallback;
        undoBtn.innerHTML = '<i class="fa-solid fa-arrow-rotate-left mr-1"></i> 回撤';
        trail.appendChild(undoBtn);
    }
}

export function updateCurrStateUI(stateStr) {
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
    const curveDescEl = document.getElementById("curr-curve-desc");
    curveDescEl.innerText = curveDesc;
    curveDescEl.className = isCW ? "ml-1 font-semibold text-sky-300" : "ml-1 font-semibold text-teal-300";
}

export function renderTransitionOptions(currState, options, onChoose) {
    const container = document.getElementById("transition-options");
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
        item.onclick = () => onChoose(next, move);
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
}
~~~~~

#### Acts 5: 重写主入口脚本 `web/js/app.js`

作为整个应用的事件及控制编排中心，将网络数据、物理模型计算和 UI 渲染打通。同时显式挂载所需方法至 `window` 以兼容 HTML 中的 inline 点击/改变事件。

~~~~~act
write_file
web/js/app.js
~~~~~
~~~~~javascript
import * as api from './api.js';
import { computeGeometry } from './state.js';
import { CanvasRenderer } from './canvasRenderer.js';
import * as ui from './uiController.js';

let path = [];
let renderer;

document.addEventListener("DOMContentLoaded", () => {
    renderer = new CanvasRenderer("skate-canvas");
    initChoreography();
    initInteraction();

    // 显式挂载动作方法至 window 作用域，确保完美支持 HTML 原生 inline onClick / onChange
    window.initChoreography = initChoreography;
    window.resetChoreography = resetChoreography;
    window.fetchNextTransitions = fetchNextTransitions;
    window.undoMove = undoMove;
    window.verifySequence = verifySequence;
    window.generateSequence = generateSequence;
    window.toggleFullscreen = toggleFullscreen;
    window.chooseNextMove = chooseNextMove;
});

function initChoreography() {
    const startState = document.getElementById("start-state-select").value;
    path = [{ state: startState, move: null }];
    ui.updateCurrStateUI(startState);
    fetchNextTransitions();
    ui.updateStats(path, undoMove);
}

function resetChoreography() {
    initChoreography();
}

async function fetchNextTransitions() {
    const currState = path[path.length - 1].state;
    const maxDiff = document.getElementById("max-difficulty-select").value;
    const container = document.getElementById("transition-options");
    container.innerHTML = '<p class="text-xs text-slate-500 animate-pulse">正在调配 FSM 编排逻辑推荐...</p>';

    try {
        const options = await api.fetchTransitions(currState, maxDiff);
        if (options.length === 0) {
            container.innerHTML = '<p class="text-xs text-rose-400/80 p-2 border border-rose-950 bg-rose-950/20 rounded-lg">⚠️ 当前状态下没有符合最大难度限制的有效滑行变体！请宽限难度限制。</p>';
            return;
        }
        ui.renderTransitionOptions(currState, options, chooseNextMove);
    } catch (err) {
        container.innerHTML = `<p class="text-xs text-rose-400">加载推荐分支时出现网络故障。请确认后端服务已运行。</p>`;
    }
}

function chooseNextMove(nextStateObj, moveObj) {
    path[path.length - 1].move = moveObj;
    const nextStateStr = `${nextStateObj.foot}${nextStateObj.direction}${nextStateObj.edge}`;
    path.push({ state: nextStateStr, move: null });

    ui.updateCurrStateUI(nextStateStr);
    fetchNextTransitions();
    ui.updateStats(path, undoMove);
    drawPath();
}

function undoMove() {
    if (path.length <= 1) return;
    path.pop();
    path[path.length - 1].move = null;
    const prevState = path[path.length - 1].state;
    ui.updateCurrStateUI(prevState);
    fetchNextTransitions();
    ui.updateStats(path, undoMove);
    drawPath();
}

async function verifySequence() {
    const sequence = document.getElementById("verify-input").value;
    const output = document.getElementById("verify-result");
    if (!sequence.trim()) return;

    output.classList.remove("hidden");
    output.className = "mt-4 p-4 rounded-xl text-sm border bg-slate-900/80";
    output.innerHTML = '<p class="text-slate-400 animate-pulse">正在进行物理路径校验与动力学翻译...</p>';

    try {
        const data = await api.verifySequence(sequence);
        if (!data.valid) {
            output.className = "mt-4 p-4 rounded-xl text-sm border border-rose-950 bg-rose-950/20";
            output.innerHTML = `<p class="text-rose-400 font-semibold"><i class="fa-solid fa-circle-xmark mr-1"></i> 校验失败</p><p class="text-xs text-slate-300 mt-2">${data.error}</p>`;
        } else {
            output.className = "mt-4 p-4 rounded-xl text-sm border border-emerald-950 bg-emerald-950/10 text-slate-300 space-y-3";
            let listHTML = "";
            data.transitions.forEach((t) => {
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
        output.innerHTML = `<p class="text-xs text-rose-400">通信网络故障: ${err.message}</p>`;
    }
}

async function generateSequence() {
    const steps = document.getElementById("gen-steps").value;
    const maxDiff = document.getElementById("gen-diff").value;
    const selectState = document.getElementById("start-state-select").value;

    try {
        const data = await api.generateSequence(parseInt(steps), parseInt(maxDiff), selectState);
        path = [];
        data.forEach((step) => {
            const stateStr = `${step.state.foot}${step.state.direction}${step.state.edge}`;
            path.push({
                state: stateStr,
                move: step.move
            });
        });

        const lastState = path[path.length - 1].state;
        ui.updateCurrStateUI(lastState);
        fetchNextTransitions();
        ui.updateStats(path, undoMove);
        drawPath();
    } catch (err) {
        alert(`[-] 生成失败: ${err.message}`);
    }
}

function drawPath() {
    const geometry = computeGeometry(path);
    renderer.draw(geometry);
}

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

function initInteraction() {
    const canvas = renderer.canvas;

    canvas.addEventListener("wheel", (e) => {
        if (!document.fullscreenElement) return;
        e.preventDefault();

        const mx = e.clientX;
        const my = e.clientY;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        const oldZoom = renderer.zoomFactor;
        const zoomSpeed = 0.12;
        
        if (e.deltaY < 0) {
            renderer.zoomFactor *= (1 + zoomSpeed);
        } else {
            renderer.zoomFactor /= (1 + zoomSpeed);
            renderer.zoomFactor = Math.max(0.1, renderer.zoomFactor);
        }

        const ratio = renderer.zoomFactor / oldZoom;
        renderer.panX = (mx - cx) - (mx - cx - renderer.panX) * ratio;
        renderer.panY = (my - cy) - (my - cy - renderer.panY) * ratio;

        drawPath();
    }, { passive: false });

    let isDragging = false;
    let startX = 0;
    let startY = 0;

    canvas.addEventListener("mousedown", (e) => {
        if (!document.fullscreenElement) return;
        isDragging = true;
        startX = e.clientX - renderer.panX;
        startY = e.clientY - renderer.panY;
    });

    canvas.addEventListener("mousemove", (e) => {
        if (!document.fullscreenElement || !isDragging) return;
        renderer.panX = e.clientX - startX;
        renderer.panY = e.clientY - startY;
        drawPath();
    });

    window.addEventListener("mouseup", () => {
        isDragging = false;
    });

    document.addEventListener("fullscreenchange", () => {
        renderer.resetViewport();
        if (document.fullscreenElement) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        } else {
            canvas.width = 600;
            canvas.height = 200;
        }
        drawPath();
    });

    // 延时首帧绘制，确保 DOM 完全就绪、加载完毕
    setTimeout(() => {
        drawPath();
    }, 100);
}
~~~~~

#### Acts 6: 修改 `web/index.html` 模块引入声明

将 index.html 中的 `app.js` 引用改为原生 ES 模块（`type="module"`）。

~~~~~act
patch_file
web/index.html
~~~~~
~~~~~html.old
    <script src="js/app.js"></script>
</body>
</html>
~~~~~
~~~~~html.new
    <script type="module" src="js/app.js"></script>
</body>
</html>
~~~~~

---

### 下一步建议
1. **启动后端服务**：在项目主目录下通过 `uv run fsm-skating-web` 脚本，或者直接执行 `uvicorn fsm_skating.api.main:app --reload` 启动 FastAPI 后端。
2. **打开前端页面**：在浏览器中访问网页控制端，检查前端模块加载是否有由于同源策略带来的控制台报错。
3. **功能性联动测试**：
    * 改变起始滑行状态，确认画布左侧起点 Node 输出 `START` 微光标，并接续出第一段对应的冰上滑行圆弧。
    * 点击推荐动作后，查看轨迹圆弧段是否显示滑行状态字样（如 `LFO` 等），且在圆弧交接节点处展示对应步法的简称。
