这是非常出色的产品级建议！将步法模拟器“播放器化”能极大提升教学和分析的效率。

我将为你实现以下核心功能：
1.  **倍速控制系统**：引入 `animSpeed` 因子，支持 $0.5x$ 慢动作观察。
2.  **交互式进度条**：支持在进度条上点击或拖拽以实时跳转到指定的轨迹位置。
3.  **键盘中控系统**：全局监听 `Space` 和 `F` 键。
4.  **UI 细节增强**：进度条增加悬浮预览（Tooltip），显示预览位置的动作为何。

### [WIP] feat(web): 实现播放器级别的交互增强（进度拖动、倍速切换、快捷键）

### 用户需求
增强动画控制能力：支持点击进度条跳转、慢动作回放（0.5x）以及键盘快捷键（空格播放、F全屏）。

### 评论
这些改进将原本单一的“播放”功能转变为一个可交互的“分析工具”。对于复杂步法（如括弧步、计数步），慢动作和手动进度跳转是观察冰刀边缘变化的关键。

### 目标
1.  在 `app.js` 中引入 `animSpeed` 和进度跳转逻辑。
2.  在 HTML 中添加倍速切换 UI。
3.  实现进度条的鼠标事件处理（Click/Drag）。
4.  添加全局键盘监听器。

### 标签
#intent/build #flow/ready #priority/high #comp/docs #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/video-player-controls #task/action/implementation #task/state/continue

---

### Script

#### Acts 1: 更新样式
添加倍速按钮样式和进度条的交互感知样式。

~~~~~act
patch_file
web/css/style.css
~~~~~
~~~~~css.old
/* 轨道进度指示球 */
#anim-progress-bar::after {
    content: '';
    position: absolute;
    right: -4px;
    top: -3px;
    width: 8px;
    height: 8px;
    background: #fff;
    border-radius: 50%;
    box-shadow: 0 0 10px #38bdf8;
}
~~~~~
~~~~~css.new
/* 轨道进度指示球 */
#anim-progress-bar::after {
    content: '';
    position: absolute;
    right: -4px;
    top: -3px;
    width: 8px;
    height: 8px;
    background: #fff;
    border-radius: 50%;
    box-shadow: 0 0 10px #38bdf8;
}

.progress-container {
    cursor: pointer;
    transition: height 0.2s;
}
.progress-container:hover {
    height: 6px;
}
.progress-container:hover #anim-progress-bar::after {
    transform: scale(1.5);
}

/* 进度预览 Tooltip */
#progress-tooltip {
    pointer-events: none;
    transform: translateX(-50%);
    transition: opacity 0.2s;
}

.speed-btn.active {
    background-color: rgba(56, 189, 248, 0.25);
    color: #38bdf8;
    border-color: rgba(56, 189, 248, 0.5);
}
~~~~~

#### Acts 2: 更新 HTML 结构
增加倍速切换按钮和进度条容器。

~~~~~act
patch_file
web/index.html
~~~~~
~~~~~html.old
                            <!-- 进度条 -->
                            <div class="absolute bottom-0 left-0 w-full h-1 bg-slate-800/50 z-20">
                                <div id="anim-progress-bar" class="h-full bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.6)]" style="width: 0%"></div>
                            </div>

                            <!-- 全屏/悬浮控制条 -->
                            <div id="fullscreen-controls" class="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                                <div class="bg-slate-900/90 backdrop-blur-xl border border-sky-500/20 rounded-full px-6 py-2.5 flex items-center space-x-6 shadow-2xl pointer-events-auto">
                                    <button onclick="toggleAnimation()" class="text-sky-400 hover:text-sky-300 transition-colors flex items-center space-x-2">
                                        <i id="fs-play-icon" class="fa-solid fa-play text-lg"></i>
                                        <span id="fs-play-text" class="text-xs font-bold uppercase tracking-widest">播放</span>
                                    </button>
                                    <div class="h-4 w-[1px] bg-slate-700"></div>
                                    <button onclick="toggleFullscreen()" class="text-slate-400 hover:text-white transition-colors">
                                        <i class="fa-solid fa-compress"></i>
                                    </button>
                                </div>
                            </div>
~~~~~
~~~~~html.new
                            <!-- 进度条容器 (增加交互响应范围) -->
                            <div id="progress-container" class="progress-container absolute bottom-0 left-0 w-full h-1.5 bg-slate-800/50 z-20 overflow-visible">
                                <div id="anim-progress-bar" class="h-full bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.6)] relative" style="width: 0%"></div>
                                <!-- 悬浮预览 -->
                                <div id="progress-tooltip" class="opacity-0 absolute bottom-4 left-0 bg-slate-900 border border-slate-700 px-2 py-1 rounded text-[10px] text-slate-300 whitespace-nowrap">
                                    --
                                </div>
                            </div>

                            <!-- 全屏/悬浮控制条 -->
                            <div id="fullscreen-controls" class="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                                <div class="bg-slate-900/90 backdrop-blur-xl border border-sky-500/20 rounded-full px-6 py-2.5 flex items-center space-x-6 shadow-2xl pointer-events-auto">
                                    <button onclick="toggleAnimation()" class="text-sky-400 hover:text-sky-300 transition-colors flex items-center space-x-2">
                                        <i id="fs-play-icon" class="fa-solid fa-play text-lg"></i>
                                        <span id="fs-play-text" class="text-xs font-bold uppercase tracking-widest">播放</span>
                                    </button>
                                    <div class="h-4 w-[1px] bg-slate-700"></div>
                                    <div class="flex items-center space-x-1">
                                        <button onclick="setPlaybackSpeed(0.5)" id="speed-05" class="speed-btn px-2 py-0.5 rounded text-[10px] border border-transparent text-slate-500 hover:text-slate-300 transition-all">0.5x</button>
                                        <button onclick="setPlaybackSpeed(1.0)" id="speed-10" class="speed-btn active px-2 py-0.5 rounded text-[10px] border border-transparent text-slate-500 hover:text-slate-300 transition-all">1.0x</button>
                                    </div>
                                    <div class="h-4 w-[1px] bg-slate-700"></div>
                                    <button onclick="toggleFullscreen()" class="text-slate-400 hover:text-white transition-colors">
                                        <i class="fa-solid fa-compress"></i>
                                    </button>
                                </div>
                            </div>
~~~~~

#### Acts 3: 实现核心交互逻辑
在 `app.js` 中增加倍速管理、进度跳转和键盘监听。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
let isAnimating = false;
let animProgress = 0; // 0.0 to 1.0
let lastAnimTime = 0;
const ANIM_DURATION_PER_STEP = 1500; // 每步滑行 1.5 秒

document.addEventListener("DOMContentLoaded", () => {
~~~~~
~~~~~javascript.new
let isAnimating = false;
let animProgress = 0; // 0.0 to 1.0
let lastAnimTime = 0;
let playbackSpeed = 1.0;
const BASE_ANIM_DURATION = 1500; // 每步滑行基准 1.5 秒

document.addEventListener("DOMContentLoaded", () => {
~~~~~
~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
    window.toggleFullscreen = toggleFullscreen;
    window.toggleAnimation = toggleAnimation;
    window.chooseNextMove = chooseNextMove;
~~~~~
~~~~~javascript.new
    window.toggleFullscreen = toggleFullscreen;
    window.toggleAnimation = toggleAnimation;
    window.setPlaybackSpeed = setPlaybackSpeed;
    window.chooseNextMove = chooseNextMove;
~~~~~
~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
function animationLoop(timestamp) {
    if (!isAnimating) return;

    const deltaTime = timestamp - lastAnimTime;
    lastAnimTime = timestamp;

    const totalSteps = Math.max(1, path.length - 1);
    const totalDuration = totalSteps * ANIM_DURATION_PER_STEP;
    
    animProgress += deltaTime / totalDuration;
~~~~~
~~~~~javascript.new
function animationLoop(timestamp) {
    if (!isAnimating) return;

    const deltaTime = timestamp - lastAnimTime;
    lastAnimTime = timestamp;

    const totalSteps = Math.max(1, path.length - 1);
    // 倍速影响总时长计算
    const totalDuration = (totalSteps * BASE_ANIM_DURATION) / playbackSpeed;
    
    animProgress += deltaTime / totalDuration;
~~~~~
~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
function initInteraction() {
    const canvas = renderer.canvas;

    canvas.addEventListener("wheel", (e) => {
~~~~~
~~~~~javascript.new
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
~~~~~

### 下一步建议
- **轨迹对比功能**：允许在画布上同时存在两条轨迹（比如参考轨迹 vs 练习轨迹），通过小球的“幽灵回放”来对比节奏差异。
- **导出 GIF/视频**：目前只能看到实时模拟。增加一个导出功能，可以将编排生成的轨迹动画直接分享给教练或队友。
- **自动视角调整**：对于超长路径，小球可能会跑出初始屏幕。可以增加一个“相机跟随”功能，让视野中心始终对准小球。
