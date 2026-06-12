import * as api from './api.js';
import { computeGeometry } from './state.js';
import { CanvasRenderer } from './canvasRenderer.js';
import * as ui from './uiController.js';

let path = [];
let renderer;

// 动画状态
let isAnimating = false;
let isDraggingProgress = false;
let animProgress = 0; // 0.0 to 1.0
let lastAnimTime = 0;
let playbackSpeed = 1.0;
const BASE_ANIM_DURATION = 1500; // 每步滑行基准 1.5 秒

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
    window.generateSequence = generateSequence;
    window.toggleFullscreen = toggleFullscreen;
    window.toggleAnimation = toggleAnimation;
    window.setPlaybackSpeed = setPlaybackSpeed;
    window.chooseNextMove = chooseNextMove;
    window.copyTrajectorySource = copyTrajectorySource;
    window.importTrajectorySource = importTrajectorySource;
});

function initChoreography() {
    const startState = document.getElementById("start-state-select").value;
    path = [{ state: startState, move: null }];
    ui.updateCurrStateUI(startState);
    fetchNextTransitions();
    ui.updateStats(path, undoMove);
    drawPath(true); // 保证起始滑跑状态建立时，第一段滑行弧线就被立即绘制出来，并强制初始化 DOM 时间轴
    updateTrajectorySourceUI();
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
        container.innerHTML = `<p class="text-xs text-rose-400">加载推荐分支时出现 network 故障。请确认后端服务已运行。</p>`;
    }
}

function chooseNextMove(nextStateObj, moveObj) {
    path[path.length - 1].move = moveObj;
    const nextStateStr = `${nextStateObj.foot}${nextStateObj.direction}${nextStateObj.edge}`;
    path.push({ state: nextStateStr, move: null });

    ui.updateCurrStateUI(nextStateStr);
    fetchNextTransitions();
    ui.updateStats(path, undoMove);
    drawPath(true);
    updateTrajectorySourceUI();
}

function undoMove() {
    if (path.length <= 1) return;
    path.pop();
    path[path.length - 1].move = null;
    const prevState = path[path.length - 1].state;
    ui.updateCurrStateUI(prevState);
    fetchNextTransitions();
    ui.updateStats(path, undoMove);
    drawPath(true);
    updateTrajectorySourceUI();
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
    drawPath(true);
    updateTrajectorySourceUI();
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
        drawPath(true);
        updateTrajectorySourceUI();
    } catch (err) {
        alert(`[-] 生成失败: ${err.message}`);
    }
}

function drawPath(updateTimeline = false) {
    const geometry = computeGeometry(path);
    renderer.draw(geometry);
    
    if (updateTimeline) {
        updateLinearTimelineUI(geometry);
    }
    
    if (isAnimating || animProgress > 0 || isDraggingProgress) {
        renderAnimationStep(geometry);
    }
}

/**
 * 将 2D 轨迹投影到 1D 进度条上
 */
function updateLinearTimelineUI(geometry) {
    const { arcs } = geometry;
    const container = document.getElementById("timeline-segments");
    if (!arcs || arcs.length === 0) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML = "";
    const totalLength = arcs.reduce((acc, arc) => acc + (arc.R * Math.abs(arc.endAngle - arc.startAngle)), 0);

    arcs.forEach((arc, idx) => {
        const arcLen = arc.R * Math.abs(arc.endAngle - arc.startAngle);
        const widthPercent = (arcLen / totalLength) * 100;
        
        const seg = document.createElement("div");
        seg.className = "timeline-segment";
        seg.style.width = `${widthPercent}%`;
        
        const isLeft = arc.state[0] === 'L';
        seg.style.backgroundColor = isLeft ? "#0ea5e9" : "#f97316"; // sky-500 : orange-500
        
        // 记录元数据用于 Tooltip
        seg.dataset.state = arc.state;
        seg.dataset.move = arc.move ? arc.move.name : "滑行";
        
        container.appendChild(seg);

        // 如果不是最后一段，添加一个物理分隔线（动作节点）
        if (idx < arcs.length - 1) {
            const marker = document.createElement("div");
            marker.className = "timeline-marker";
            // 计算当前累积的百分比位置
            let accumulatedLen = 0;
            for(let j=0; j<=idx; j++) accumulatedLen += arcs[j].R * Math.abs(arcs[j].endAngle - arcs[j].startAngle);
            marker.style.left = `${(accumulatedLen / totalLength) * 100}%`;
            container.appendChild(marker);
        }
    });
}

function toggleAnimation() {
    if (path.length <= 1) return;
    
    isAnimating = !isAnimating;
    
    const icon = document.getElementById("play-icon");
    const text = document.getElementById("play-text");
    const fsIcon = document.getElementById("fs-play-icon");
    const fsText = document.getElementById("fs-play-text");
    const overlay = document.getElementById("playback-overlay");

    if (isAnimating) {
        const pauseIcon = "fa-solid fa-pause";
        icon.className = pauseIcon + " mr-1.5";
        fsIcon.className = pauseIcon;
        text.innerText = "暂停回放";
        fsText.innerText = "暂停";
        
        overlay.classList.remove("hidden");
        if (animProgress >= 1.0) animProgress = 0;
        lastAnimTime = performance.now();
        requestAnimationFrame(animationLoop);
    } else {
        const playIcon = "fa-solid fa-play";
        icon.className = playIcon + " mr-1.5";
        fsIcon.className = playIcon;
        text.innerText = "继续回放";
        fsText.innerText = "播放";
    }
}

function animationLoop(timestamp) {
    // 如果正在拖拽，跳过自动进度增加，但保持循环以响应外部可能的重绘
    if (!isAnimating || isDraggingProgress) {
        if (isAnimating) requestAnimationFrame(animationLoop);
        return;
    }

    const deltaTime = timestamp - lastAnimTime;
    lastAnimTime = timestamp;

    const totalSteps = Math.max(1, path.length - 1);
    // 倍速影响总时长计算
    const totalDuration = (totalSteps * BASE_ANIM_DURATION) / playbackSpeed;
    
    animProgress += deltaTime / totalDuration;

    if (animProgress >= 1.0) {
        animProgress = 1.0;
        isAnimating = false;
        const resetIcon = "fa-solid fa-rotate-right";
        document.getElementById("play-icon").className = resetIcon + " mr-1.5";
        document.getElementById("fs-play-icon").className = resetIcon;
        document.getElementById("play-text").innerText = "再次播放";
        document.getElementById("fs-play-text").innerText = "重播";
    }

    drawPath();

    if (isAnimating) {
        requestAnimationFrame(animationLoop);
    }
}

function renderAnimationStep(geometry) {
    // 这里的 transform 逻辑需要与 renderer.draw 内部一致，故我们可以重构 renderer 以暴露获取 transform 的方法
    // 但为简化实现，我们直接让 renderer.draw 返回其内部闭包计算出的坐标转换函数，或者由 renderer 托管。
    // 在本实现中，我们直接在 draw 函数结束后调用 drawTracker。
    
    const pad = 35;
    const canvas = renderer.canvas;
    const { nodes } = geometry;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(p => {
        if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    });
    const w = maxX - minX || 1; const h = maxY - minY || 1;
    const scale = Math.min((canvas.width - 2 * pad) / w, (canvas.height - 2 * pad) / h, 1.5);
    const offsetX = (canvas.width - w * scale) / 2 - minX * scale;
    const offsetY = (canvas.height - h * scale) / 2 - minY * scale;

    const transform = (px, py) => {
        const ax = px * scale + offsetX; const ay = py * scale + offsetY;
        if (!document.fullscreenElement) return { x: ax, y: ay };
        const cx = canvas.width / 2; const cy = canvas.height / 2;
        return {
            x: (ax - cx) * renderer.zoomFactor + cx + renderer.panX,
            y: (ay - cy) * renderer.zoomFactor + cy + renderer.panY
        };
    };

    const fFactor = document.fullscreenElement ? renderer.zoomFactor : 1.0;
    
    // 执行绘制并获取当前位置的状态信息
    const info = renderer.drawTracker(geometry, animProgress, transform, fFactor);
    
    if (info) {
        // 1. 刚刚的动作
        document.getElementById("overlay-prev-move").innerText = info.prevMove;

        // 2. 当前滑行状态
        document.getElementById("overlay-state").innerText = info.state;

        // 3. 下一个动作
        document.getElementById("overlay-next-move").innerText = info.nextMove;

        document.getElementById("anim-progress-bar").style.width = `${animProgress * 100}%`;
    }
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

function setPlaybackSpeed(speed) {
    playbackSpeed = speed;
    document.getElementById("speed-05").classList.toggle("active", speed === 0.5);
    document.getElementById("speed-10").classList.toggle("active", speed === 1.0);
}

function initInteraction() {
    const canvas = renderer.canvas;

    // --- 进度条交互逻辑 ---
    const progressContainer = document.getElementById("progress-container");
    const tooltip = document.getElementById("progress-tooltip");

    const handleProgressJump = (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const progress = Math.max(0, Math.min(1, x / rect.width));
        animProgress = progress;
        // 核心：直接强制触发重绘，不等待下一帧，保证极速跟手
        drawPath();
    };

    progressContainer.addEventListener("mousedown", (e) => {
        isDraggingProgress = true;
        handleProgressJump(e);
        
        const onMouseMove = (moveEvent) => {
            if (isDraggingProgress) handleProgressJump(moveEvent);
        };
        
        const onMouseUp = () => {
            isDraggingProgress = false;
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            // 如果是在播放状态下松开，重置最后时间戳防止进度跳变
            if (isAnimating) lastAnimTime = performance.now();
        };
        
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
    });

    progressContainer.addEventListener("mousemove", (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const hoverProgress = Math.max(0, Math.min(1, x / rect.width));
        
        tooltip.style.opacity = "1";
        tooltip.style.left = `${x}px`;
        
        // 基于 DOM 查找实现更精准的 Tooltip
        const targetSeg = document.elementFromPoint(e.clientX, rect.top + rect.height/2);
        if (targetSeg && targetSeg.classList.contains('timeline-segment')) {
            const isLeft = targetSeg.dataset.state[0] === 'L';
            const footText = isLeft ? "左脚" : "右脚";
            const footColor = isLeft ? "text-sky-400" : "text-orange-400";

            tooltip.innerHTML = `
                <div class="flex flex-col space-y-1 text-[11px] font-sans">
                    <div class="flex items-center justify-between space-x-4 border-b border-slate-800 pb-1">
                        <span class="${footColor} font-black font-mono text-xs">${targetSeg.dataset.state}</span>
                        <span class="text-slate-400 scale-90">${footText}滑行</span>
                    </div>
                    <div class="flex items-center justify-between space-x-4">
                        <span class="text-slate-500">即将执行:</span>
                        <span class="text-slate-200 font-semibold truncate max-w-[100px]">${targetSeg.dataset.move}</span>
                    </div>
                </div>
            `;
        } else {
            tooltip.innerHTML = `<span class="text-sky-300 font-mono font-bold">${Math.round(hoverProgress * 100)}%</span>`;
        }
    });

    progressContainer.addEventListener("mouseleave", () => {
        tooltip.style.opacity = "0";
    });

    // --- 键盘快捷键逻辑 ---
    window.addEventListener("keydown", (e) => {
        // 排除在输入框内的情况
        if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;

        if (e.code === "Space") {
            e.preventDefault();
            toggleAnimation();
        } else if (e.code === "KeyF") {
            e.preventDefault();
            toggleFullscreen();
        }
    });

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

function updateTrajectorySourceUI() {
    const sourceData = path.map(step => ({
        state: step.state,
        move_id: step.move ? step.move.id : null
    }));
    document.getElementById("trajectory-source").value = JSON.stringify(sourceData);
}

async function copyTrajectorySource() {
    const text = document.getElementById("trajectory-source").value;
    if (!text) return;
    try {
        await navigator.clipboard.writeText(text);
        const btn = document.getElementById("btn-copy-source");
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check text-emerald-400"></i><span class="text-emerald-400">已复制</span>';
        btn.classList.add("border-emerald-500", "bg-emerald-950/20");
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.classList.remove("border-emerald-500", "bg-emerald-950/20");
        }, 1500);
    } catch (err) {
        console.error("复制失败: ", err);
    }
}

async function importTrajectorySource() {
    const sourceText = document.getElementById("trajectory-source").value.trim();
    if (!sourceText) return;
    try {
        const jsonData = JSON.parse(sourceText);
        if (!Array.isArray(jsonData) || jsonData.length === 0) {
            alert("导入失败：请输入合法的 JSON 数组，例如: " + '[{"state": "LFO", "move_id": null}]');
            return;
        }

        const statesList = jsonData.map(item => item.state).filter(Boolean);
        if (statesList.length < 1) {
            alert("导入失败：数据中未包含有效状态。");
            return;
        }

        if (statesList.length === 1) {
            const startState = statesList[0];
            path = [{ state: startState, move: null }];
            ui.updateCurrStateUI(startState);
            fetchNextTransitions();
            ui.updateStats(path, undoMove);
            drawPath(true);
            updateTrajectorySourceUI();
            return;
        }

        const sequence = statesList.join(" -> ");
        const data = await api.verifySequence(sequence);
        if (!data.valid) {
            alert(`导入失败，动力学合规校验未通过：\n${data.error}`);
            return;
        }

        const newPath = [];
        for (let i = 0; i < data.transitions.length; i++) {
            const t = data.transitions[i];
            const expectedMoveId = jsonData[i] ? jsonData[i].move_id : null;
            
            let matchedMove = t.candidate_moves.find(m => m.id === expectedMoveId);
            if (!matchedMove) {
                matchedMove = t.selected_move;
            }

            const fromStateStr = `${t.from_state.foot}${t.from_state.direction}${t.from_state.edge}`;
            newPath.push({
                state: fromStateStr,
                move: matchedMove
            });
        }

        const lastT = data.transitions[data.transitions.length - 1];
        const lastStateStr = `${lastT.to_state.foot}${lastT.to_state.direction}${lastT.to_state.edge}`;
        newPath.push({
            state: lastStateStr,
            move: null
        });

        path = newPath;
        ui.updateCurrStateUI(path[path.length - 1].state);
        fetchNextTransitions();
        ui.updateStats(path, undoMove);
        drawPath(true);
        updateTrajectorySourceUI();

    } catch (err) {
        alert(`导入解析失败: ${err.message}`);
    }
}