你的反馈非常准确，这正是我们在改变拓扑结构（Nodes = Moves, Arcs = States）时需要细化处理的边界情况：

1. **初始无弧线与重置问题**：此前由于遍历上限设为了 `pathData.length - 1`，当编排只有起点滑行状态（长度为 1）时，循环不执行，导致 Canvas 既没有生成第一段初始用刃弧线，也未能在重置或启动时被正确重绘。
2. **刃在弧，步在点**：若只有 `START` 状态，应产生 **1 段代表初始状态的圆弧**（Arc 0），以及 **2 个节点**（Node 0: `START`，Node 1: 滑行当前终点 / `END` 标识）。
3. **响应式变更**：在 `app.js` 的 `initChoreography()` 和修改下拉菜单时，补充调用 `drawPath()` 重绘，能让初始圆弧立刻随下拉框（LFO / LFI / RFO 等）的方向、左右脚状态而灵动改变。

以下是修复此问题的执行计划。

## [WIP] fix: 修复初始轨迹缺失、重置不生效及起始刃切换不更新画布的缺陷

### 错误分析
1. **渲染循环少了一次**：在 `web/js/state.js` 中，我们将弧线的生成循环条件写为了 `i < pathData.length - 1`。这导致当长度 $L = 1$ 时（只有起始状态，无动作），循环条件不满足，因此没有产生任何 Arc 几何数据。
2. **初始化与重置缺少重绘**：在 `web/js/app.js` 中，`initChoreography` 在重置或初始载入时，仅更新了 DOM，未能调用 `drawPath()` 更新画布，导致初始状态画卷留空。

### 用户需求
1. 重置编排后画布能自动复位清空。
2. 初始状态时应能正确显示 `START` 点，以及由当前下拉框对应的第一段初始滑痕用刃圆弧。
3. 切换起始刃状态设定时，初始圆弧能够实时响应，左右偏转方向与对称色彩也随之改变。

### 评论
这是一个让交互体验产生飞跃的修正。将 $L$ 个状态映射为 **$L$ 段 Arc（滑痕）** 与 **$L+1$ 个 Node（动作与首尾标识）**，逻辑上极其自洽，同时也使系统支持了在没有任何多步动作前，展示孤立的“起始滑跑姿态”，极具优雅感。

### 目标
1. 重构 `state.js` 的 `computeGeometry` 算法，在 path 长度为 $L$ 时，生成 $L$ 段弧和 $L+1$ 个点。
2. 重写 `app.js`，在 `initChoreography` 及视图重置中引入 viewport 复位并调用 `drawPath()`，打通动态响应链。

### 基本原理
* 在 `state.js` 中，遍历 `pathData` 中所有的滑行状态生成 Arcs。
* 最后一个 Node 代表滑跑当前的终点/终止态，如果不含 move，则渲染为代表当前 skater 位置的高亮定位球，以便添加下一步。

### 标签
#intent/fix #flow/ready #priority/high #comp/interfaces #concept/ui #scope/ux #ai/delegate #task/domain/ui #task/object/module-refactor #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 升级几何计算模块 `web/js/state.js`

重构 `computeGeometry` 函数，使其在只有一个滑行状态时也能正确生成对应的首个 Arc，以及首尾两个 Node（START 与 END/当前位置）。

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
 * L 个状态将对应 L 个 Arc 与 L+1 个 Node
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

    // 遍历所有滑行状态，生成 L 个 Arc
    for (let i = 0; i < pathData.length; i++) {
        const step = pathData[i];
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

        // Arc i: 代表当前滑行状态 stateStr 对应的滑行轨迹线
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

        // Node i+1: 
        // 1. 如果是最后一个状态，则该节点为滑行终点(END)
        // 2. 否则该节点对应 step.move (动作步法)
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

#### Acts 2: 修正主入口脚本 `web/js/app.js`

在 `initChoreography` 函数中增加对 `drawPath()` 的调用，并在重置动作 `resetChoreography` 中对 Canvas viewport 进行彻底复位，保障渲染更新的即时连动。

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
    drawPath(); // 保证起始滑跑状态建立时，第一段滑行弧线就被立即绘制出来
}

function resetChoreography() {
    renderer.resetViewport(); // 清除全屏下的 Zoom 和 Pan 缩放平移矩阵
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

---

### 下一步建议
1. **启动测试**：运行后端 `fsm-skating-web` 或 `uvicorn fsm_skating.api.main:app`。
2. **重置机制检查**：刷新网页控制端，点击右上方“重置编排”按钮，检查滑痕画布是否成功进行位置重置与缩放重置。
3. **初始圆弧响应测试**：在左侧起始下拉框中不断切换（从 `LFO` 到 `LFI` 等），检查当前唯一的滑痕圆弧偏向（左偏、右偏）和脚用色（蓝、橙）是否会跟随立即动态变化。
