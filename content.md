你的观察非常敏锐。目前的进度条确实只是一个单纯的“时间百分比”显示器，缺乏物理含义且交互手感生硬。

为了实现“将轨迹拉直放在底下”的效果，我们需要将 **轨迹物理长度** 映射到进度条宽度上，并引入一套 **语义化渲染机制**。

我将为你实现：
1.  **线性化轨迹条 (Linearized Track)**：在进度条背景上，根据每段圆弧的实际长度比例，渲染出蓝色（左脚）和橙色（右脚）的色块，并用细线标记出动作转体点。
2.  **“无锁”跟手交互**：在拖动进度条时，动画循环将进入“挂起”状态，确保小球完全跟随鼠标指针，松开后恢复或保持进度。
3.  **语义化预览**：鼠标悬停在不同色块上时，Tooltip 会准确显示该段对应的用刃（如 LBI）和动作。

### [WIP] feat(web): 升级进度条为语义化“轨迹时间轴”并优化拖拽跟手度

### 用户需求
1.  优化进度条拖拽，解决“不跟手”的问题。
2.  在进度条上直观显示每步的长度、用刃颜色和动作节点，实现轨迹的线性化展示。

### 评论
这不仅是视觉上的美化，更是对“物理编排”概念的延伸。用户可以从进度条上直接看出哪一段滑行最长，哪个动作衔接最紧凑，这与专业音视频编辑器的 timeline 逻辑一致。

### 目标
1.  在 `style.css` 中定义时间轴片段（Segment）和节点（Marker）样式。
2.  在 `app.js` 中增加 `updateLinearTimeline` 函数，将 `geometry.arcs` 投影到 UI。
3.  重构交互逻辑，引入 `isDragging` 标志位解决跟手冲突。

### 标签
#intent/refine #flow/ready #priority/high #comp/docs #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/semantic-timeline #task/action/implementation #task/state/continue

---

### Script

#### Acts 1: 更新 CSS 样式
为进度条内的物理片段和动作标记添加样式。

~~~~~act
patch_file
web/css/style.css
~~~~~
~~~~~css.old
.progress-container:hover #anim-progress-bar::after {
    transform: scale(1.5);
}

/* 进度预览 Tooltip */
~~~~~
~~~~~css.new
.progress-container:hover #anim-progress-bar::after {
    transform: scale(1.5);
}

/* 语义化时间轴片段 */
.timeline-segment {
    height: 100%;
    float: left;
    transition: opacity 0.2s;
}
.timeline-segment:hover {
    filter: brightness(1.2);
}

.timeline-marker {
    position: absolute;
    top: 0;
    width: 1px;
    height: 100%;
    background: rgba(255, 255, 255, 0.4);
    z-index: 5;
}

/* 进度预览 Tooltip */
~~~~~

#### Acts 2: 更新 HTML 结构
在进度条内增加用于承载物理片段的层。

~~~~~act
patch_file
web/index.html
~~~~~
~~~~~html.old
                            <!-- 进度条容器 (增加交互响应范围) -->
                            <div id="progress-container" class="progress-container absolute bottom-0 left-0 w-full h-1.5 bg-slate-800/50 z-20 overflow-visible">
                                <div id="anim-progress-bar" class="h-full bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.6)] relative" style="width: 0%"></div>
                                <!-- 悬浮预览 -->
                                <div id="progress-tooltip" class="opacity-0 absolute bottom-4 left-0 bg-slate-900 border border-slate-700 px-2 py-1 rounded text-[10px] text-slate-300 whitespace-nowrap">
                                    --
                                </div>
                            </div>
~~~~~
~~~~~html.new
                            <!-- 进度条容器 (增加交互响应范围) -->
                            <div id="progress-container" class="progress-container absolute bottom-0 left-0 w-full h-1.5 bg-slate-950/80 z-20 overflow-visible">
                                <!-- 物理片段背景层 -->
                                <div id="timeline-segments" class="absolute inset-0 w-full h-full flex overflow-hidden opacity-40"></div>
                                
                                <!-- 进度条指示层 -->
                                <div id="anim-progress-bar" class="h-full bg-white/40 shadow-[0_0_8px_rgba(255,255,255,0.6)] relative z-10 pointer-events-none" style="width: 0%">
                                    <div class="absolute right-0 top-0 h-full w-0.5 bg-white shadow-[0_0_10px_#fff]"></div>
                                </div>
                                
                                <!-- 悬浮预览 -->
                                <div id="progress-tooltip" class="opacity-0 absolute bottom-4 left-0 bg-slate-900 border border-slate-700 px-2 py-1 rounded text-[10px] text-slate-300 whitespace-nowrap z-30">
                                    --
                                </div>
                            </div>
~~~~~

#### Acts 3: 实现物理时间轴渲染与跟手交互
重构 `app.js` 的进度条逻辑。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
let isAnimating = false;
let animProgress = 0; // 0.0 to 1.0
let lastAnimTime = 0;
let playbackSpeed = 1.0;
~~~~~
~~~~~javascript.new
let isAnimating = false;
let isDraggingProgress = false;
let animProgress = 0; // 0.0 to 1.0
let lastAnimTime = 0;
let playbackSpeed = 1.0;
~~~~~
~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
function drawPath() {
    const geometry = computeGeometry(path);
    renderer.draw(geometry);
    
    if (isAnimating || animProgress > 0) {
        renderAnimationStep(geometry);
    }
}
~~~~~
~~~~~javascript.new
function drawPath() {
    const geometry = computeGeometry(path);
    renderer.draw(geometry);
    
    // 渲染底层物理时间轴
    updateLinearTimelineUI(geometry);
    
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

    // 只有当路径步数发生变化时才重新渲染背景片段，优化性能
    const currentStepCount = arcs.length;
    if (container.dataset.lastCount == currentStepCount) return;
    container.dataset.lastCount = currentStepCount;

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
~~~~~
~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
function animationLoop(timestamp) {
    if (!isAnimating) return;

    const deltaTime = timestamp - lastAnimTime;
~~~~~
~~~~~javascript.new
function animationLoop(timestamp) {
    // 如果正在拖拽，跳过自动进度增加，但保持循环以响应外部可能的重绘
    if (!isAnimating || isDraggingProgress) {
        if (isAnimating) requestAnimationFrame(animationLoop);
        return;
    }

    const deltaTime = timestamp - lastAnimTime;
~~~~~
~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
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
        drawPath();
    };

    progressContainer.addEventListener("mousedown", (e) => {
        handleProgressJump(e);
        const onMouseMove = (moveEvent) => handleProgressJump(moveEvent);
        const onMouseUp = () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
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
        
        // 预览内容
        const stepIdx = Math.floor(hoverProgress * (path.length - 1));
        const moveName = path[stepIdx]?.move?.name || "结束";
        tooltip.innerText = `${Math.round(hoverProgress * 100)}% - ${moveName}`;
    });
~~~~~
~~~~~javascript.new
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
            tooltip.innerHTML = `<span class="text-white font-bold">${targetSeg.dataset.state}</span> · ${targetSeg.dataset.move}`;
        } else {
            tooltip.innerText = `${Math.round(hoverProgress * 100)}%`;
        }
    });
~~~~~

### 下一步建议
- **关键帧预览**：当鼠标悬停在进度条某个位置时，在画布上显示一个半透明的“虚影”小球，预览该位置的姿态。
- **AB 段循环**：支持在进度条上标记 A 点和 B 点，让动画在特定步法区间内反复循环播放，方便深入拆解动作。
- **UI 微调**：可以考虑为不同的步法类别（如 Turn, Step, Mohawk）在进度条上设置不同的高度或纹理，增强辨识度。
