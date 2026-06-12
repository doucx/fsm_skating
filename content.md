这是一个非常实用的交互改进。在全屏沉浸式观察时，确实需要能够直接在冰面上控制回放，而不需要退出全屏。

我将为你实现一个**智能控制条**：它平时会隐藏以保证视角的纯净，但当鼠标移动到画布下方或在全屏模式下时，它会优雅地浮现。

### [WIP] feat(web): 为全屏模式添加底部悬浮播放控制条

### 用户需求
在全屏播放模式下，需要一个可见的播放/暂停按钮，最好位于屏幕底部，以便在不退出全屏的情况下控制动画。

### 评论
在全屏模式下，用户的注意力集中在轨迹细节上。增加一个悬浮的 HUD（平视显示器）风格的控制条，不仅满足了功能需求，也增强了应用的可操纵感和专业性。

### 目标
1.  在 `#canvas-container` 内部添加一个绝对定位的 `fs-controls` 容器。
2.  实现全屏状态下控制条的自动显示/隐藏逻辑（鼠标悬停）。
3.  确保全屏控制按钮的状态（播放/暂停/重播）与主界面同步。

### 标签
#intent/build #flow/ready #priority/high #comp/docs #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/fullscreen-controls #task/action/implementation #task/state/continue

---

### Script

#### Acts 1: 更新 HTML 结构
在画布容器内增加底部的悬浮控制条。

~~~~~act
patch_file
web/index.html
~~~~~
~~~~~html.old
                            <!-- 进度条 -->
                            <div class="absolute bottom-0 left-0 w-full h-1 bg-slate-800/50 z-20">
                                <div id="anim-progress-bar" class="h-full bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.6)]" style="width: 0%"></div>
                            </div>
                            <canvas id="skate-canvas" width="600" height="200" class="w-full h-[200px] block"></canvas>
                        </div>
~~~~~
~~~~~html.new
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

                            <canvas id="skate-canvas" width="600" height="200" class="w-full h-[200px] block"></canvas>
                        </div>
~~~~~

#### Acts 2: 调整 CSS 样式
确保控制条在全屏模式下表现良好，并添加一些视觉动画效果。

~~~~~act
patch_file
web/css/style.css
~~~~~
~~~~~css.old
.play-btn:hover {
    transform: scale(1.05);
    background-color: rgba(56, 189, 248, 0.2);
}
~~~~~
~~~~~css.new
.play-btn:hover {
    transform: scale(1.05);
    background-color: rgba(56, 189, 248, 0.2);
}

/* 全屏专用控制条显示策略 */
#canvas-container:fullscreen #fullscreen-controls {
    opacity: 0; /* 默认隐藏 */
    transition: opacity 0.3s ease;
}

#canvas-container:fullscreen:hover #fullscreen-controls {
    opacity: 1; /* 鼠标移动时显示 */
}

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

#### Acts 3: 同步控制逻辑
更新 `app.js` 以确保主界面和全屏界面的两个播放按钮状态保持实时同步。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
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
~~~~~
~~~~~javascript.new
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
~~~~~
~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
    if (animProgress >= 1.0) {
        animProgress = 1.0;
        isAnimating = false;
        document.getElementById("play-icon").className = "fa-solid fa-rotate-right mr-1.5";
        document.getElementById("play-text").innerText = "再次播放";
    }
~~~~~
~~~~~javascript.new
    if (animProgress >= 1.0) {
        animProgress = 1.0;
        isAnimating = false;
        const resetIcon = "fa-solid fa-rotate-right";
        document.getElementById("play-icon").className = resetIcon + " mr-1.5";
        document.getElementById("fs-play-icon").className = resetIcon;
        document.getElementById("play-text").innerText = "再次播放";
        document.getElementById("fs-play-text").innerText = "重播";
    }
~~~~~

### 下一步建议
- **进度拖动**：目前进度条仅用于展示。可以实现点击进度条进行跳转的功能，方便用户反复观察某个特定动作。
- **慢动作模式**：在控制条增加一个 $0.5x / 1.0x$ 的倍速切换功能。对于初学者来说，观察高难度动作（如乔克陶步）的物理转体细节，慢动作非常有用。
- **键盘快捷键**：映射 `空格键` 为播放/暂停，`F` 键为切换全屏，进一步优化桌面端的操作体验。
