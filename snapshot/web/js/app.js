import * as api from './api.js';
import { computeGeometry, parseState } from './state.js';
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
    
    // 优先尝试从 LocalStorage 恢复，失败则调用 initChoreography 重新初始化
    const loaded = loadFromLocalStorage();
    if (!loaded) {
        initChoreography();
    }
    
    initInteraction();

    // 动态同步当前 API 实际访问端点
    const apiBadge = document.getElementById("api-endpoint-badge");
    if (apiBadge) {
        apiBadge.innerHTML = `<i class="fa-solid fa-server mr-1"></i> API: ${window.location.host}`;
    }

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
    window.searchPaths = searchPaths;
    window.loadSearchedPathToCanvas = loadSearchedPathToCanvas;
});

function initChoreography() {
    const startState = document.getElementById("start-state-select").value;
    path = [{ state: startState, move: null }];
    ui.updateCurrStateUI(startState);
    fetchNextTransitions();
    syncChoreographyUI();
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
    const nextStateStr = typeof nextStateObj === 'string' ? nextStateObj : `${nextStateObj.foot}${nextStateObj.direction}${nextStateObj.edge}`;
    path.push({ state: nextStateStr, move: null });

    ui.updateCurrStateUI(nextStateStr);
    fetchNextTransitions();
    syncChoreographyUI();
}

function undoMove() {
    if (path.length <= 1) return;
    path.pop();
    path[path.length - 1].move = null;
    const prevState = path[path.length - 1].state;
    ui.updateCurrStateUI(prevState);
    fetchNextTransitions();
    syncChoreographyUI();
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
            output.className = "mt-4 space-y-3";
            
            // 构造路径数组用于渲染
            const pathForRender = [];
            data.transitions.forEach((t, idx) => {
                if (idx === 0) pathForRender.push({ state: t.from_state, move: t.selected_move });
                else pathForRender[pathForRender.length - 1].move = t.selected_move;
                pathForRender.push({ state: t.to_state, move: null });
            });

            const trailHTML = ui.renderPathTrailHTML(pathForRender, true);

            // 歧义检查
            let candidateHTML = "";
            const ambiguousSteps = data.transitions.filter(t => t.candidate_moves.length > 1);
            if (ambiguousSteps.length > 0) {
                const details = ambiguousSteps.map(t => t.selected_move.name).join(", ");
                candidateHTML = `<div class="text-[10px] text-amber-400/80 bg-amber-950/20 p-2 rounded border border-amber-900/50"><i class="fa-solid fa-circle-nodes mr-1"></i>存在物理歧义。其它候选：${details}</div>`;
            }

            // 允许一键渲染 verifiedPath
            window.verifiedPathData = data.transitions.map(t => ({
                state: typeof t.to_state === 'string' ? t.to_state : `${t.to_state.foot}${t.to_state.direction}${t.to_state.edge}`,
                move: t.selected_move
            }));
            window.verifiedInitialState = typeof data.states[0] === 'string' ? data.states[0] : `${data.states[0].foot}${data.states[0].direction}${data.states[0].edge}`;

            output.innerHTML = `
                <div class="px-4 py-2 bg-emerald-950/20 border border-emerald-900/50 rounded-lg flex items-center justify-between">
                    <p class="text-emerald-400 text-xs font-bold flex items-center"><i class="fa-solid fa-circle-check mr-2"></i> 验证成功</p>
                    <span class="text-[10px] text-slate-500 font-mono">Difficulty: ${data.total_difficulty}</span>
                </div>
                
                <button onclick="loadVerifiedPathToCanvas()" class="w-full text-left bg-slate-900/60 border border-slate-800 hover:border-sky-400/50 hover:bg-sky-400/5 hover:shadow-[0_0_20px_rgba(56,189,248,0.15)] p-4 rounded-xl flex flex-col space-y-2 transition-all duration-300 group outline-none">
                    <div class="flex flex-wrap items-center gap-1.5 overflow-hidden">${trailHTML}</div>
                    <div class="text-[9px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                        <i class="fa-solid fa-chart-line mr-1 text-sky-500/70"></i> 
                        点击载入此验证轨迹
                    </div>
                </button>
                ${candidateHTML}
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
            output.className = "mt-4 space-y-3";
            
            const pathForRender = [];
            data.trace.forEach((step, idx) => {
                if (idx === 0) pathForRender.push({ state: step.from_state, move: step.move });
                else pathForRender[pathForRender.length - 1].move = step.move;
                pathForRender.push({ state: step.to_state, move: null });
            });

            const trailHTML = ui.renderPathTrailHTML(pathForRender, true);

            // 准备载入数据
            window.verifiedPathData = data.trace.map(t => ({
                state: typeof t.to_state === 'string' ? t.to_state : `${t.to_state.foot}${t.to_state.direction}${t.to_state.edge}`,
                move: t.move
            }));
            const initial = typeof data.trace[0].from_state === 'string' ? data.trace[0].from_state : `${data.trace[0].from_state.foot}${data.trace[0].from_state.direction}${data.trace[0].from_state.edge}`;
            window.verifiedInitialState = initial;

            output.innerHTML = `
                <div class="px-4 py-2 bg-emerald-950/20 border border-emerald-900/50 rounded-lg flex items-center justify-between">
                    <p class="text-emerald-400 text-xs font-bold flex items-center"><i class="fa-solid fa-circle-check mr-2"></i> 演算与校验成功</p>
                    <span class="text-[10px] text-slate-500 font-mono">Total Difficulty: ${data.total_difficulty}</span>
                </div>
                
                <button onclick="loadVerifiedPathToCanvas()" class="w-full text-left bg-slate-900/60 border border-slate-800 hover:border-sky-400/50 hover:bg-sky-400/5 hover:shadow-[0_0_20px_rgba(56,189,248,0.15)] p-4 rounded-xl flex flex-col space-y-2 transition-all duration-300 group outline-none">
                    <div class="flex flex-wrap items-center gap-1.5 overflow-hidden">${trailHTML}</div>
                    <div class="text-[9px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                        <i class="fa-solid fa-chart-line mr-1 text-sky-500/70"></i> 
                        点击载入此演算轨迹
                    </div>
                </button>
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
    syncChoreographyUI();
}

async function generateSequence() {
    const steps = document.getElementById("gen-steps").value;
    const maxDiff = document.getElementById("gen-diff").value;
    const selectState = document.getElementById("start-state-select").value;

    try {
        const data = await api.generateSequence(parseInt(steps), parseInt(maxDiff), selectState);
        path = [];
        data.forEach((step) => {
            const stateStr = typeof step.state === 'string' ? step.state : `${step.state.foot}${step.state.direction}${step.state.edge}`;
            path.push({
                state: stateStr,
                move: step.move
            });
        });

        const lastState = path[path.length - 1].state;
        ui.updateCurrStateUI(lastState);
        fetchNextTransitions();
        syncChoreographyUI();
    } catch (err) {
        alert(`[-] 生成失败: ${err.message}`);
    }
}

function drawPath(updateTimeline = false) {
    // 动态同步画布内部分辨率以匹配实际 CSS 渲染尺寸，彻底解决拉伸变形
    const canvas = renderer.canvas;
    const rect = canvas.getBoundingClientRect();
    const targetW = Math.floor(rect.width);
    const targetH = Math.floor(rect.height);
    
    if (targetW > 0 && targetH > 0 && (canvas.width !== targetW || canvas.height !== targetH)) {
        canvas.width = targetW;
        canvas.height = targetH;
    }

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
        
        const isLeft = parseState(arc.state).isLeft;
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
    const fFactor = document.fullscreenElement ? renderer.zoomFactor : 1.0;
    
    // 执行绘制并获取当前位置的状态信息
    const info = renderer.drawTracker(geometry, animProgress, fFactor);
    
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
            const isLeft = parseState(targetSeg.dataset.state).isLeft;
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

    // --- 移动端触控交互适配 ---
    let touchStartDist = 0;
    let touchStartZoom = 1.0;

    canvas.addEventListener("touchstart", (e) => {
        if (!document.fullscreenElement) return;
        if (e.touches.length === 1) {
            isDragging = true;
            startX = e.touches[0].clientX - renderer.panX;
            startY = e.touches[0].clientY - renderer.panY;
        } else if (e.touches.length === 2) {
            isDragging = false;
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            touchStartDist = Math.sqrt(dx * dx + dy * dy);
            touchStartZoom = renderer.zoomFactor;
        }
    }, { passive: false });

    canvas.addEventListener("touchmove", (e) => {
        if (!document.fullscreenElement) return;
        if (e.touches.length === 1 && isDragging) {
            renderer.panX = e.touches[0].clientX - startX;
            renderer.panY = e.touches[0].clientY - startY;
            drawPath();
            e.preventDefault();
        } else if (e.touches.length === 2 && touchStartDist > 0) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            const oldZoom = renderer.zoomFactor;
            renderer.zoomFactor = touchStartZoom * (dist / touchStartDist);
            renderer.zoomFactor = Math.max(0.1, renderer.zoomFactor);

            const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;

            const ratio = renderer.zoomFactor / oldZoom;
            renderer.panX = (centerX - cx) - (centerX - cx - renderer.panX) * ratio;
            renderer.panY = (centerY - cy) - (centerY - cy - renderer.panY) * ratio;

            drawPath();
            e.preventDefault();
        }
    }, { passive: false });

    canvas.addEventListener("touchend", (e) => {
        if (!document.fullscreenElement) return;
        if (e.touches.length === 1) {
            isDragging = true;
            startX = e.touches[0].clientX - renderer.panX;
            startY = e.touches[0].clientY - renderer.panY;
        } else {
            isDragging = false;
        }
        touchStartDist = 0;
    }, { passive: false });

    canvas.addEventListener("touchcancel", () => {
        isDragging = false;
        touchStartDist = 0;
    });

    document.addEventListener("fullscreenchange", () => {
        renderer.resetViewport();
        // 移除硬编码宽高设定，转交 ResizeObserver 和 drawPath 动态同步
        drawPath();
    });

    // 使用 ResizeObserver 监听画布 CSS 尺寸的实时变化（例如进入全屏过渡、窗口大小调整等）
    const resizeObserver = new ResizeObserver(() => {
        drawPath();
    });
    resizeObserver.observe(canvas);

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

function syncChoreographyUI() {
    ui.updateStats(path, undoMove);
    drawPath(true);
    updateTrajectorySourceUI();
    saveToLocalStorage();
}

function saveToLocalStorage() {
    try {
        localStorage.setItem("fsm_skating_path", JSON.stringify(path));
    } catch (e) {
        console.error("Failed to save path to LocalStorage:", e);
    }
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem("fsm_skating_path");
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                path = parsed;
                // 将 start-state-select 同步为 path[0].state
                const startSelect = document.getElementById("start-state-select");
                if (startSelect && path[0]) {
                    startSelect.value = path[0].state;
                }
                const lastState = path[path.length - 1].state;
                ui.updateCurrStateUI(lastState);
                fetchNextTransitions();
                syncChoreographyUI();
                return true;
            }
        } catch (e) {
            console.error("Failed to restore path from LocalStorage:", e);
        }
    }
    return false;
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
            syncChoreographyUI();
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
        syncChoreographyUI();

    } catch (err) {
        alert(`[-] 导入解析失败: ${err.message}`);
    }
}

async function searchPaths() {
    const startState = document.getElementById("search-start-state").value;
    const endState = document.getElementById("search-end-state").value;
    const interCount = document.getElementById("search-inter-count").value;
    const maxDiff = document.getElementById("search-max-diff").value;
    const maxResults = document.getElementById("search-max-results").value;

    const container = document.getElementById("search-results-container");
    const resultsDiv = document.getElementById("search-results");

    container.classList.remove("hidden");
    resultsDiv.innerHTML = '<p class="text-xs text-slate-500 animate-pulse"><i class="fa-solid fa-spinner fa-spin mr-1.5"></i>正在利用 DFS 穷举物理路径...</p>';

    try {
        const paths = await api.searchPaths(startState, endState, interCount, maxDiff, maxResults);
        
        if (paths.length === 0) {
            resultsDiv.innerHTML = '<p class="text-xs text-rose-400/80 p-2 border border-rose-950 bg-rose-950/20 rounded-lg">⚠️ 未检索到任何合规路径！请尝试改变起止用刃、调整间隔数或放宽难度限制。</p>';
            return;
        }

        resultsDiv.innerHTML = "";
        window.searchedPathsCache = paths;

        paths.forEach((p, idx) => {
            const totalDiff = p.reduce((sum, step) => sum + (step.move ? step.move.difficulty : 0), 0);
            const trailHTML = ui.renderPathTrailHTML(p, true);

            const card = document.createElement("button");
            card.onclick = () => loadSearchedPathToCanvas(idx);
            // 将 card 设为 button 后，添加 text-left 和 w-full 确保布局正确
            card.className = "w-full text-left bg-slate-900/40 border border-slate-800 hover:border-sky-400/50 hover:bg-sky-400/5 hover:shadow-[0_0_20px_rgba(56,189,248,0.15)] p-4 rounded-xl flex flex-col space-y-2 transition-all duration-300 group outline-none";
            
            card.innerHTML = `
                <div class="flex justify-between items-center">
                    <div class="flex flex-wrap items-center gap-1.5 overflow-hidden">${trailHTML}</div>
                    <span class="text-[10px] font-semibold px-2 py-1 rounded bg-sky-950/60 text-sky-400 border border-sky-900 shrink-0 ml-2">难度: ${totalDiff}</span>
                </div>
                <div class="text-[9px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                    <i class="fa-solid fa-chart-line mr-1 text-sky-500/70"></i> 
                    点击以将此轨迹载入冰面预览
                </div>
            `;
            resultsDiv.appendChild(card);
        });

    } catch (err) {
        resultsDiv.innerHTML = `<p class="text-xs text-rose-400">检索发生异常: ${err.message}</p>`;
    }
}

function loadSearchedPathToCanvas(idx) {
    if (!window.searchedPathsCache || !window.searchedPathsCache[idx]) return;
    const selectedPath = window.searchedPathsCache[idx];
    
    path = selectedPath.map(step => ({
        state: typeof step.state === 'string' ? step.state : `${step.state.foot}${step.state.direction}${step.state.edge}`,
        move: step.move
    }));

    const startSelect = document.getElementById("start-state-select");
    if (startSelect && path[0]) {
        startSelect.value = path[0].state;
    }

    const lastState = path[path.length - 1].state;
    ui.updateCurrStateUI(lastState);
    fetchNextTransitions();
    syncChoreographyUI();
}