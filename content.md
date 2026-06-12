这是一个非常棒的交互增强建议！为了实现“轨迹追踪小球”以及“实时动作看板”，我们需要对 Web 前端的样式、结构和逻辑进行一次协同更新。

我将为你实现以下功能：
1.  **动画引擎**：在 `app.js` 中引入基于 `requestAnimationFrame` 的时间轴管理。
2.  **物理追踪**：计算小球在复合圆弧路径上的瞬时坐标、切向速度和当前所属动作。
3.  **UI 增强**：在画布上方添加“播放/暂停”控制栏，并在画布中心添加一个半透明的“动态看板”，显示当前的用刃（如 LFO）和动作名称。
4.  **视觉反馈**：小球将根据左/右脚变换颜色，并带有微光拖尾效果。

### [WIP] feat(web): 实现轨迹追踪动画与实时动作看板

### 用户需求
在主画布中添加一个小球，跟随编排的滑行轨迹运动。需要提供开始/暂停控制，并在播放过程中实时显示当前的动作名称和滑行用刃状态。

### 评论
这个功能将“冰面物理”沙盒从静态的轨迹图提升到了动态模拟器。它不仅让编排结果更直观，也帮助使用者理解不同步法（如转三步 vs 括弧步）在时间轴上的物理表现。

### 目标
1.  在 `index.html` 中添加播放控制 UI 和画布信息层。
2.  在 `style.css` 中增加动画相关的遮罩层样式。
3.  在 `canvasRenderer.js` 中增加 `drawTracker` 方法，用于绘制动态小球。
4.  在 `app.js` 中实现主循环逻辑，管理播放状态和进度计算。

### 基本原理
1.  **路径参数化**：将编排的 `arcs`（圆弧数组）看作一条连续的参数曲线 $S(t)$，其中 $t \in [0, 1]$。
2.  **匀速投影**：假设滑行是匀速的，通过各段圆弧的弧长占总长度的比例，定位 $t$ 时刻对应的具体圆弧及圆弧内的局部偏转角。
3.  **Canvas 双重渲染**：每一帧先绘制静态背景轨迹，再根据当前进度计算小球坐标并叠加绘制。

### 标签
#intent/build #flow/ready #priority/high #comp/docs #concept/ui #concept/executor #scope/ux #ai/instruct #task/domain/ui #task/object/animation-tracker #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 更新 CSS 样式
添加动画按钮和画布叠加层的视觉样式。

~~~~~act
patch_file
web/css/style.css
~~~~~
~~~~~css.old
#canvas-container:fullscreen canvas {
    width: 100vw !important;
    height: 100vh !important;
}
~~~~~
~~~~~css.new
#canvas-container:fullscreen canvas {
    width: 100vw !important;
    height: 100vh !important;
}

/* 动画控制叠加层 */
.anim-overlay {
    pointer-events: none;
    text-shadow: 0 0 10px rgba(0,0,0,0.8);
}

.play-btn {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.play-btn:hover {
    transform: scale(1.05);
    background-color: rgba(56, 189, 248, 0.2);
}
~~~~~

#### Acts 2: 更新 HTML 结构
在画布容器内增加控制按钮和状态看板。

~~~~~act
patch_file
web/index.html
~~~~~
~~~~~html.old
                        <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex justify-between items-center">
                            <span>❄️ 实时冰面滑痕轨迹（2D 向量拼接）</span>
                            <button onclick="toggleFullscreen()" class="text-[10px] text-sky-400 hover:text-sky-300 transition normal-case flex items-center">
                                <i class="fa-solid fa-expand mr-1"></i> 点击全屏/放大
                            </button>
                        </h3>
                        <div id="canvas-container" class="bg-slate-950/80 rounded-xl overflow-hidden border border-slate-800 glow-ice relative group">
                            <canvas id="skate-canvas" width="600" height="200" class="w-full h-[200px] block"></canvas>
                        </div>
~~~~~
~~~~~html.new
                        <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex justify-between items-center">
                            <span class="flex items-center">
                                <i class="fa-solid fa-person-skating mr-2 text-sky-400"></i>
                                ❄️ 轨迹动态模拟
                            </span>
                            <div class="flex items-center space-x-4">
                                <button onclick="toggleAnimation()" class="play-btn px-3 py-1 rounded-md border border-sky-500/50 bg-sky-500/10 text-sky-400 text-[10px] flex items-center">
                                    <i id="play-icon" class="fa-solid fa-play mr-1.5"></i>
                                    <span id="play-text">开始回放</span>
                                </button>
                                <button onclick="toggleFullscreen()" class="text-[10px] text-slate-400 hover:text-sky-300 transition normal-case flex items-center">
                                    <i class="fa-solid fa-expand mr-1"></i> 全屏
                                </button>
                            </div>
                        </h3>
                        <div id="canvas-container" class="bg-slate-950/80 rounded-xl overflow-hidden border border-slate-800 glow-ice relative group">
                            <!-- 动态看板 -->
                            <div id="playback-overlay" class="anim-overlay absolute top-4 left-4 z-10 hidden">
                                <div class="bg-slate-900/80 backdrop-blur-md border border-sky-500/30 rounded-lg p-3 min-w-[140px]">
                                    <div class="text-[10px] text-sky-400 uppercase tracking-widest font-bold mb-1">当前动态</div>
                                    <div id="overlay-move" class="text-sm font-bold text-white truncate">--</div>
                                    <div id="overlay-state" class="text-xl font-black text-sky-300 font-mono mt-1 tracking-tighter">LFO</div>
                                </div>
                            </div>
                            <!-- 进度条 -->
                            <div class="absolute bottom-0 left-0 w-full h-1 bg-slate-800/50 z-20">
                                <div id="anim-progress-bar" class="h-full bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.6)]" style="width: 0%"></div>
                            </div>
                            <canvas id="skate-canvas" width="600" height="200" class="w-full h-[200px] block"></canvas>
                        </div>
~~~~~

#### Acts 3: 扩展 Canvas 渲染逻辑
增加绘制追踪小球的方法。

~~~~~act
patch_file
web/js/canvasRenderer.js
~~~~~
~~~~~javascript.old
    _drawISUSymbol(ctx, pt, category, fFactor = 1.0) {
        ctx.save();
~~~~~
~~~~~javascript.new
    drawTracker(geometry, progress, transform, fFactor) {
        const { arcs } = geometry;
        if (!arcs || arcs.length === 0) return null;

        // 1. 根据总弧长计算当前 progress 落在哪个 arc 上
        const totalLength = arcs.reduce((acc, arc) => acc + (arc.R * Math.abs(arc.endAngle - arc.startAngle)), 0);
        let targetLen = totalLength * progress;
        let currentLen = 0;
        let targetArc = arcs[arcs.length - 1];
        let localProgress = 1.0;

        for (const arc of arcs) {
            const arcLen = arc.R * Math.abs(arc.endAngle - arc.startAngle);
            if (currentLen + arcLen >= targetLen) {
                targetArc = arc;
                localProgress = (targetLen - currentLen) / arcLen;
                break;
            }
            currentLen += arcLen;
        }

        // 2. 计算插值坐标
        const currentAngle = targetArc.startAngle + (targetArc.endAngle - targetArc.startAngle) * localProgress;
        const worldX = targetArc.cx + targetArc.R * Math.cos(currentAngle);
        const worldY = targetArc.cy + targetArc.R * Math.sin(currentAngle);
        const pos = transform(worldX, worldY);

        // 3. 绘制追踪球 (冰晶小球)
        const ctx = this.ctx;
        const isLeft = targetArc.state[0] === 'L';
        const ballColor = isLeft ? "56, 189, 248" : "249, 115, 22";

        ctx.save();
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 8 * fFactor, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${ballColor}, 0.9)`;
        ctx.shadowBlur = 15 * fFactor;
        ctx.shadowColor = `rgba(${ballColor}, 0.8)`;
        ctx.fill();
        
        // 内核白光
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3 * fFactor, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.restore();

        return {
            state: targetArc.state,
            moveName: targetArc.move ? targetArc.move.name : "滑行/蹬冰"
        };
    }

    _drawISUSymbol(ctx, pt, category, fFactor = 1.0) {
        ctx.save();
~~~~~

#### Acts 4: 实现动画控制逻辑
在 `app.js` 中接入 `requestAnimationFrame` 循环。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
let path = [];
let renderer;

document.addEventListener("DOMContentLoaded", () => {
~~~~~
~~~~~javascript.new
let path = [];
let renderer;

// 动画状态
let isAnimating = false;
let animProgress = 0; // 0.0 to 1.0
let lastAnimTime = 0;
const ANIM_DURATION_PER_STEP = 1500; // 每步滑行 1.5 秒

document.addEventListener("DOMContentLoaded", () => {
~~~~~
~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
    window.generateSequence = generateSequence;
    window.toggleFullscreen = toggleFullscreen;
~~~~~
~~~~~javascript.new
    window.generateSequence = generateSequence;
    window.toggleFullscreen = toggleFullscreen;
    window.toggleAnimation = toggleAnimation;
~~~~~
~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
function drawPath() {
    const geometry = computeGeometry(path);
    renderer.draw(geometry);
}
~~~~~
~~~~~javascript.new
function drawPath() {
    const geometry = computeGeometry(path);
    renderer.draw(geometry);
    
    if (isAnimating || animProgress > 0) {
        renderAnimationStep(geometry);
    }
}

function toggleAnimation() {
    if (path.length <= 1) return;
    
    isAnimating = !isAnimating;
    
    const icon = document.getElementById("play-icon");
    const text = document.getElementById("play-text");
    const overlay = document.getElementById("playback-overlay");

    if (isAnimating) {
        icon.className = "fa-solid fa-pause mr-1.5";
        text.innerText = "暂停回放";
        overlay.classList.remove("hidden");
        if (animProgress >= 1.0) animProgress = 0;
        lastAnimTime = performance.now();
        requestAnimationFrame(animationLoop);
    } else {
        icon.className = "fa-solid fa-play mr-1.5";
        text.innerText = "继续回放";
    }
}

function animationLoop(timestamp) {
    if (!isAnimating) return;

    const deltaTime = timestamp - lastAnimTime;
    lastAnimTime = timestamp;

    const totalSteps = Math.max(1, path.length - 1);
    const totalDuration = totalSteps * ANIM_DURATION_PER_STEP;
    
    animProgress += deltaTime / totalDuration;

    if (animProgress >= 1.0) {
        animProgress = 1.0;
        isAnimating = false;
        document.getElementById("play-icon").className = "fa-solid fa-rotate-right mr-1.5";
        document.getElementById("play-text").innerText = "再次播放";
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
    const currentInfo = renderer.drawTracker(geometry, animProgress, transform, fFactor);
    
    if (currentInfo) {
        document.getElementById("overlay-move").innerText = currentInfo.moveName;
        document.getElementById("overlay-state").innerText = currentInfo.state;
        document.getElementById("anim-progress-bar").style.width = `${animProgress * 100}%`;
    }
}
~~~~~

### 下一步建议
1.  **物理优化**：目前回放是匀速的，但真实的滑冰动作在转体处通常会有角速度的变化。未来可以根据 `category`（如转三步）对 `ANIM_DURATION_PER_STEP` 进行加权，让动画更具动感。
2.  **多视角切换**：可以考虑增加一个“跟拍模式”，让视角中心始终跟随小球，适合在全屏模式下观察细节。
3.  **音效集成**：当小球划过冰面或执行转体动作时，加入细微的冰刀刻划声，将极大地提升沉浸感。
