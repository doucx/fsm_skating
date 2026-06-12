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
    window.verifyMovesSequence = verifyMovesSequence;
    window.handleVerify = handleVerify;
    window.switchVerifyMode = switchVerifyMode;
    window.loadVerifiedPathToCanvas = loadVerifiedPathToCanvas;
    window.exportPathToClipboard = exportPathToClipboard;
    window.importPathFromClipboard = importPathFromClipboard;
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

let verifyMode = 'state';

function switchVerifyMode(mode) {
    verifyMode = mode;
    const btnState = document.getElementById("btn-verify-mode-state");
    const btnMove = document.getElementById("btn-verify-mode-move");
    const startStateContainer = document.getElementById("verify-start-state-container");
    const input = document.getElementById("verify-input");
    const desc = document.getElementById("verify-desc");
    const output = document.getElementById("verify-result");

    output.classList.add("hidden");

    if (mode === 'state') {
        btnState.className = "flex-1 py-1.5 text-xs font-semibold rounded bg-emerald-600 text-white border border-emerald-500 transition";
        btnMove.className = "flex-1 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 border border-slate-700/60 hover:bg-slate-700/60 transition";
        startStateContainer.classList.add("hidden");
        input.placeholder = "例: LFO -> LFI -> RFI -> RBO";
        desc.innerText = "支持对任意输入的边缘状态转移序列进行分析翻译。";
    } else {
        btnState.className = "flex-1 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 border border-slate-700/60 hover:bg-slate-700/60 transition";
        btnMove.className = "flex-1 py-1.5 text-xs font-semibold rounded bg-emerald-600 text-white border border-emerald-500 transition";
        startStateContainer.classList.remove("hidden");
        input.placeholder = "例: stroke -> forward_inside_three_turn";
        desc.innerText = "输入一组纯步法动作 ID（逗号或空格、英文箭头隔开），自动推导演化轨迹。";
    }
}

async function handleVerify() {
    if (verifyMode === 'state') {
        await verifySequence();
    } else {
        await verifyMovesSequence();
    }
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
                let candidateHTML = "";
                if (t.candidate_moves.length > 1) {
                    const others = t.candidate_moves.slice(1).map(c => c.name).join(", ");
                    candidateHTML = `<div class="text-[10px] text-amber-400/80 mt-1"><i class="fa-solid fa-circle-nodes mr-1"></i>存在歧义（多重路径候选: ${others}）</div>`;
                }
                listHTML += `
                    <div class="text-xs pl-3 border-l border-emerald-800">
                        <span class="font-bold text-slate-200">${t.from_state} ──▶ ${t.to_state}</span><br/>
                        <span class="text-emerald-400">${t.selected_move.name}${rot}</span> (难度: ${t.selected_move.difficulty})
                        ${candidateHTML}
                    </div>
                `;
            });

            // 允许一键渲染 verifiedPath
            window.verifiedPathData = data.transitions.map(t => ({
                state: `${t.to_state.foot}${t.to_state.direction}${t.to_state.edge}`,
                move: t.selected_move
            }));
            window.verifiedInitialState = `${data.states[0].foot}${data.states[0].direction}${data.states[0].edge}`;

            const loadBtnHTML = `
                <button onclick="loadVerifiedPathToCanvas()" class="mt-2 w-full py-1 bg-sky-950 hover:bg-sky-900 border border-sky-800 rounded-md text-xs text-sky-300 transition flex items-center justify-center">
                    <i class="fa-solid fa-chart-line mr-1"></i> 将此验证轨迹载入主画布预览
                </button>
            `;

            output.innerHTML = `
                <p class="text-emerald-400 font-bold flex items-center"><i class="fa-solid fa-circle-check mr-1"></i> 验证通过！完全符合动力学规范！</p>
                <p class="text-xs text-slate-400">总设计难度积分: <strong class="text-slate-200 text-sm">${data.total_difficulty}</strong></p>
                <div class="space-y-2 mt-2">${listHTML}</div>
                ${loadBtnHTML}
            `;
        }
    } catch (err) {
        output.innerHTML = `<p class="text-xs text-rose-400">通信网络故障: ${err.message}</p>`;
    }
}

async function verifyMovesSequence() {
    const rawInput = document.getElementById("verify-input").value;
    const startState = document.getElementById("verify-start-state-select").value;
    const output = document.getElementById("verify-result");
    if (!rawInput.trim()) return;

    // 兼容空格、箭头、逗号分割
    const moveIds = rawInput.split(/->|,|\s+/).map(m => m.trim().toLowerCase()).filter(m => m.length > 0);
    if (moveIds.length === 0) return;

    output.classList.remove("hidden");
    output.className = "mt-4 p-4 rounded-xl text-sm border bg-slate-900/80";
    output.innerHTML = '<p class="text-slate-400 animate-pulse">正在进行步法动力学轨迹演化与起滑约束验证...</p>';

    try {
        const data = await api.verifyMovesSequence(moveIds, startState);
        if (!data.valid) {
            output.className = "mt-4 p-4 rounded-xl text-sm border border-rose-950 bg-rose-950/20";
            output.innerHTML = `<p class="text-rose-400 font-semibold"><i class="fa-solid fa-circle-xmark mr-1"></i> 校验失败</p><p class="text-xs text-slate-300 mt-2">${data.error}</p>`;
        } else {
            output.className = "mt-4 p-4 rounded-xl text-sm border border-emerald-950 bg-emerald-950/10 text-slate-300 space-y-3";
            let listHTML = "";
            data.trace.forEach((step) => {
                const rot = step.move.rotation_dir ? ` [${step.move.rotation_dir === 'CW' ? '顺时针' : '逆时针'}]` : "";
                listHTML += `
                    <div class="text-xs pl-3 border-l border-emerald-800">
                        <span class="font-bold text-slate-200">${step.from_state} ──▶ ${step.to_state}</span><br/>
                        <span class="text-emerald-400">${step.move.name}${rot}</span> (难度: ${step.move.difficulty})
                    </div>
                `;
            });

            // 渲染推导出的轨迹至主画布
            window.verifiedPathData = data.trace.map(t => ({
                state: `${t.to_state.foot}${t.to_state.direction}${t.to_state.edge}`,
                move: t.move
            }));
            const initial = `${data.trace[0].from_state.foot}${data.trace[0].from_state.direction}${data.trace[0].from_state.edge}`;
            window.verifiedInitialState = initial;

            const loadBtnHTML = `
                <button onclick="loadVerifiedPathToCanvas()" class="mt-2 w-full py-1 bg-sky-950 hover:bg-sky-900 border border-sky-800 rounded-md text-xs text-sky-300 transition flex items-center justify-center">
                    <i class="fa-solid fa-chart-line mr-1"></i> 将此演算轨迹载入主画布预览
                </button>
            `;

            output.innerHTML = `
                <p class="text-emerald-400 font-bold flex items-center"><i class="fa-solid fa-circle-check mr-1"></i> 验证并演算成功！</p>
                <p class="text-xs text-slate-400">推导总设计难度分: <strong class="text-slate-200 text-sm">${data.total_difficulty}</strong></p>
                <div class="space-y-2 mt-2">${listHTML}</div>
                ${loadBtnHTML}
            `;
        }
    } catch (err) {
        output.className = "mt-4 p-4 rounded-xl text-sm border border-rose-950 bg-rose-950/20";
        output.innerHTML = `<p class="text-xs text-rose-400">校验失败: ${err.message}</p>`;
    }
}

function loadVerifiedPathToCanvas() {
    if (!window.verifiedPathData || !window.verifiedInitialState) return;
    path = [{ state: window.verifiedInitialState, move: null }];
    window.verifiedPathData.forEach(step => {
        path[path.length - 1].move = step.move;
        path.push({ state: step.state, move: null });
    });
    ui.updateCurrStateUI(path[path.length - 1].state);
    fetchNextTransitions();
    ui.updateStats(path, undoMove);
    drawPath();
}

async function exportPathToClipboard() {
    if (path.length <= 1) {
        alert("⚠️ 当前沙盒为空，无可导出的轨迹。");
        return;
    }

    // 序列化为: LFO -> stroke -> RFI -> ...
    const sequence = path.map((step, i) => {
        let s = step.state;
        if (step.move) s += ` -> ${step.move.id}`;
        return s;
    }).join(" -> ");

    try {
        await navigator.clipboard.writeText(sequence);
        // 使用简单的提示，或者可以扩展为漂亮的 Toast
        const btn = document.querySelector('button[onclick="exportPathToClipboard()"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> 已复制';
        setTimeout(() => btn.innerHTML = originalText, 2000);
    } catch (err) {
        alert("无法访问剪贴板，请手动复制序列字符串。");
    }
}

async function importPathFromClipboard() {
    const input = prompt("请粘贴要导入的轨迹序列字符串\n(支持状态链如 'LFO -> RFI' 或步法链如 'stroke -> three_turn'):");
    if (!input || !input.trim()) return;

    const sequence = input.trim();
    
    // 自动判定模式：如果包含 LFO/RFI 等状态字样，尝试状态校验，否则尝试步法校验
    const hasState = /[LR][FB][OI]/.test(sequence.toUpperCase());
    
    try {
        if (hasState) {
            const data = await api.verifySequence(sequence);
            if (!data.valid) throw new Error(data.error);
            window.verifiedPathData = data.transitions.map(t => ({
                state: `${t.to_state.foot}${t.to_state.direction}${t.to_state.edge}`,
                move: t.selected_move
            }));
            window.verifiedInitialState = `${data.states[0].foot}${data.states[0].direction}${data.states[0].edge}`;
        } else {
            const moveIds = sequence.split(/->|,|\s+/).map(m => m.trim().toLowerCase()).filter(m => m.length > 0);
            const data = await api.verifyMovesSequence(moveIds, null);
            if (!data.valid) throw new Error(data.error);
            window.verifiedPathData = data.trace.map(t => ({
                state: `${t.to_state.foot}${t.to_state.direction}${t.to_state.edge}`,
                move: t.move
            }));
            window.verifiedInitialState = `${data.trace[0].from_state.foot}${data.trace[0].from_state.direction}${data.trace[0].from_state.edge}`;
        }
        
        loadVerifiedPathToCanvas();
    } catch (err) {
        alert(`[-] 导入失败：${err.message}`);
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