这是一次非常关键的可用性重构！将状态面板修改为**“刚刚的动作 ➜ 滑行状态 ➜ 下一个动作”**的语义流，能让编排者在播放过程中，清晰地在逻辑和时间轴上理解动作之间的起承转合。同时，我们将 Tooltip 重构为现代浮动 HUD 样式，使其更为美观不遮挡。

我将为你进行以下改进：
1.  **重构 HUD 面板**：将原本臃肿的“三段式”面板，改造为紧凑、语义流畅的横排/纵排卡片流，完美契合你要求的结构。
2.  **重构 Tooltip**：引入磨砂玻璃质感、天蓝色边框微光和阴影，并将悬停内容升级为“用刃 - 动作”双行对比的精细化视图。
3.  **重构数据管道**：修改 `canvasRenderer.js` 中的 `drawTracker` 物理计算，使其精准吐出：刚刚发生的转体/蹬冰、当前的用刃、即将到来的下一个步法。

### [WIP] refactor(web): 重构动态状态面板与进度条 Tooltip 的语义流与视觉样式

### 用户需求
1.  重构动态面板展示：按“刚刚的动作：无 / 滑行状态：RBI / 下一个动作：前外转三”的清晰时间顺序流向展示。
2.  修复、重编 Tooltip 样式，使其在悬停进度条时布局精美、定位精确、不出现溢出。

### 评论
当前的语义显示确实存在歧义。引入“刚刚动作 - 当前滑行 - 下个动作”之后，播放器就具备了“过去-现在-未来”的完整时间维度的可预测性，这对训练滑手控制用刃时机的节奏感极有帮助。

### 目标
1.  修改 `index.html` 中的 `#playback-overlay` 面板结构。
2.  修改 `style.css` 完善 `#progress-tooltip` 浮动样式。
3.  优化 `canvasRenderer.js` 的 `drawTracker` 状态上下文返回值。
4.  在 `app.js` 中完美呈现新的语义流。

### 标签
#intent/refine #flow/ready #priority/high #comp/docs #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/video-player-controls #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 更新 HTML 结构 (重构状态看板)
修改为更优雅的三段横向流动布局 HUD。

~~~~~act
patch_file
web/index.html
~~~~~
~~~~~html.old
                            <!-- 动态看板 (三段式 HUD) -->
                            <div id="playback-overlay" class="anim-overlay absolute top-4 left-4 z-10 hidden">
                                <div class="bg-slate-900/90 backdrop-blur-xl border border-sky-500/30 rounded-xl p-4 min-w-[180px] shadow-2xl">
                                    <!-- 上一个状态 -->
                                    <div class="mb-3 opacity-40">
                                        <div class="text-[9px] text-slate-400 uppercase tracking-widest mb-1">已完成</div>
                                        <div class="flex items-center space-x-2">
                                            <span id="overlay-prev-state" class="text-xs font-mono font-bold text-slate-300">--</span>
                                            <span id="overlay-prev-move" class="text-[10px] text-slate-500 truncate">--</span>
                                        </div>
                                    </div>

                                    <!-- 当前正在执行 (核心) -->
                                    <div class="mb-3 relative">
                                        <div class="text-[9px] text-sky-400 uppercase tracking-widest font-bold mb-1 flex items-center">
                                            <span class="w-1 h-1 bg-sky-400 rounded-full mr-1.5 animate-ping"></span>
                                            正在执行
                                        </div>
                                        <div id="overlay-state" class="text-3xl font-black text-white font-mono tracking-tighter leading-none mb-1">LFO</div>
                                        <div id="overlay-move" class="text-sm font-bold text-sky-300 truncate">滑行中...</div>
                                    </div>

                                    <!-- 下一个动作预告 -->
                                    <div class="pt-3 border-t border-slate-800">
                                        <div class="text-[9px] text-amber-500 uppercase tracking-widest font-bold mb-1">预备动作 (NEXT)</div>
                                        <div id="overlay-next-move" class="text-xs font-bold text-slate-200 truncate italic">--</div>
                                    </div>
                                </div>
                            </div>
                            <!-- 进度条容器 (增加交互响应范围) -->
~~~~~
~~~~~html.new
                            <!-- 动态看板 (三段式 HUD) -->
                            <div id="playback-overlay" class="anim-overlay absolute top-4 left-4 z-10 hidden">
                                <div class="bg-slate-950/90 backdrop-blur-xl border border-sky-500/20 rounded-xl p-4 min-w-[210px] shadow-2xl flex flex-col space-y-3">
                                    <!-- 刚刚的动作 -->
                                    <div class="flex items-center justify-between text-xs">
                                        <span class="text-slate-400 flex items-center"><i class="fa-solid fa-backward-step mr-1.5 text-slate-500"></i> 刚刚的动作：</span>
                                        <span id="overlay-prev-move" class="font-bold text-slate-300 truncate max-w-[100px]">无</span>
                                    </div>

                                    <!-- 滑行状态 -->
                                    <div class="flex items-center justify-between border-y border-slate-800/80 py-2">
                                        <span class="text-slate-400 text-xs flex items-center"><i class="fa-solid fa-person-skating mr-1.5 text-sky-400"></i> 滑行状态：</span>
                                        <span id="overlay-state" class="text-2xl font-black text-sky-400 font-mono tracking-tighter">LFO</span>
                                    </div>

                                    <!-- 下一个动作 -->
                                    <div class="flex items-center justify-between text-xs">
                                        <span class="text-slate-400 flex items-center"><i class="fa-solid fa-forward-step mr-1.5 text-amber-500"></i> 下一个动作：</span>
                                        <span id="overlay-next-move" class="font-bold text-amber-400 truncate max-w-[100px]">--</span>
                                    </div>
                                </div>
                            </div>
                            <!-- 进度条容器 (增加交互响应范围) -->
~~~~~

#### Acts 2: 优化 CSS 样式 (重写 Tooltip)
为悬浮窗设计更高级的毛玻璃与边框微光。

~~~~~act
patch_file
web/css/style.css
~~~~~
~~~~~css.old
/* 进度预览 Tooltip */
#progress-tooltip {
    pointer-events: none;
    transform: translateX(-50%);
    transition: opacity 0.2s;
}

.speed-btn.active {
~~~~~
~~~~~css.new
/* 进度预览 Tooltip */
#progress-tooltip {
    pointer-events: none;
    transform: translateX(-50%);
    transition: opacity 0.15s ease, transform 0.1s ease;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(56, 189, 248, 0.35);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
    border-radius: 8px;
    padding: 6px 10px;
}

.speed-btn.active {
~~~~~

#### Acts 3: 重构物理追踪数据的输出结构
在 `canvasRenderer.js` 里重新设计返回的字段，把当前片段前后的动作归属计算得清清楚楚。

~~~~~act
patch_file
web/js/canvasRenderer.js
~~~~~
~~~~~javascript.old
        // 3.5 获取上下文信息
        const prevArc = targetIdx > 0 ? arcs[targetIdx - 1] : null;
        const nextArc = targetIdx < arcs.length - 1 ? arcs[targetIdx + 1] : null;

        return {
            current: {
                state: targetArc.state,
                moveName: targetArc.move ? targetArc.move.name : "滑行/蹬冰"
            },
            prev: prevArc ? {
                state: prevArc.state,
                moveName: prevArc.move ? prevArc.move.name : "起始"
            } : null,
            nextMove: targetArc.move ? targetArc.move.name : (nextArc && nextArc.move ? nextArc.move.name : "收尾/结束")
        };
    }
~~~~~
~~~~~javascript.new
        // 3.5 获取高精度语义上下文
        // 刚刚的动作：也就是如何转移到 targetArc 的，对应的正是前一个 arc 结尾处所带的 move
        const prevMoveName = (targetIdx > 0 && arcs[targetIdx - 1].move) ? arcs[targetIdx - 1].move.name : "无";
        
        // 下一个动作：即在 targetArc 滑行终点即将执行的 move
        const nextMoveName = targetArc.move ? targetArc.move.name : "无";

        return {
            state: targetArc.state,
            prevMove: prevMoveName,
            nextMove: nextMoveName
        };
    }
~~~~~

#### Acts 4: 重构看板更新与 Tooltip 渲染
在 `app.js` 中提取信息，并使用 DOM 精准呈现美观的双行浮动 Tooltip。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
    // 执行绘制并获取当前位置的状态信息
    const info = renderer.drawTracker(geometry, animProgress, transform, fFactor);
    
    if (info) {
        // 更新当前主看板
        document.getElementById("overlay-state").innerText = info.current.state;
        document.getElementById("overlay-move").innerText = info.current.moveName;

        // 更新上一个状态
        const prevS = document.getElementById("overlay-prev-state");
        const prevM = document.getElementById("overlay-prev-move");
        if (info.prev) {
            prevS.innerText = info.prev.state;
            prevM.innerText = info.prev.moveName;
        } else {
            prevS.innerText = "无";
            prevM.innerText = "起始位置";
        }

        // 更新预告动作
        // 注意：逻辑上，“当前滑行弧线”之后的动作就是该弧线末端的 Move
        const nextM = document.getElementById("overlay-next-move");
        nextM.innerText = info.nextMove || "结束";

        document.getElementById("anim-progress-bar").style.width = `${animProgress * 100}%`;
    }
}
~~~~~
~~~~~javascript.new
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
~~~~~
~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
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
~~~~~javascript.new
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
~~~~~

### 下一步建议
- **关键帧闪烁标记**：当鼠标悬停在进度条节点分隔线（动作节点）上时，让画布上对应的动作符号闪烁提示，实现双向交互绑定。
- **键盘逐帧微调**：按 `Left Arrow` (后退一帧) / `Right Arrow` (前进一帧) 进行逐帧步法拆解，这是专业花滑教练纠正用刃错误的常用分析手段。
