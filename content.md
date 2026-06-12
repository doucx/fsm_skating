这是一个非常专业的交互改进。将动态看板升级为“三段式”上下文显示，能让用户更清晰地预判接下来的动作走向，就像观看花样滑冰直播时的实时解说字幕。

我将为你实现一个 **语义化 HUD (平视显示器)**：
1.  **看板结构重组**：分为“已完成 (PREV)”、“正在执行 (CURRENT)”和“预备动作 (NEXT)”三个区域。
2.  **上下文感知引擎**：在渲染循环中实时定位进度所属的圆弧片段及其前后关联节点。
3.  **视觉分层**：通过字号和透明度区分主次，让当前的用刃状态（如 RBI）保持最醒目。

### [WIP] feat(web): 升级实时看板为三段式上下文显示（上一个/当前/下一个）

### 用户需求
看板应同时显示滑行链条的上下文：上一个动作状态、当前滑行状态以及即将到来的下一个动作。

### 评论
这种设计极大增强了“编排感”。在滑冰教学中，教练经常强调“从哪来”和“到哪去”，这个看板能够完美契合这一教学逻辑。

### 目标
1.  修改 `index.html` 中的看板结构，增加前后节点容器。
2.  更新 `canvasRenderer.js` 中的 `drawTracker`，使其返回包含前后文的完整信息对象。
3.  在 `app.js` 中实时更新这些新字段。

### 标签
#intent/build #flow/ready #priority/high #comp/docs #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/playback-hud #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 更新 HTML 结构
重新定义动态看板的内部布局，采用垂直堆叠的三段式结构。

~~~~~act
patch_file
web/index.html
~~~~~
~~~~~html.old
                            <!-- 动态看板 -->
                            <div id="playback-overlay" class="anim-overlay absolute top-4 left-4 z-10 hidden">
                                <div class="bg-slate-900/80 backdrop-blur-md border border-sky-500/30 rounded-lg p-3 min-w-[140px]">
                                    <div class="text-[10px] text-sky-400 uppercase tracking-widest font-bold mb-1">当前动态</div>
                                    <div id="overlay-move" class="text-sm font-bold text-white truncate">--</div>
                                    <div id="overlay-state" class="text-xl font-black text-sky-300 font-mono mt-1 tracking-tighter">LFO</div>
                                </div>
                            </div>
~~~~~
~~~~~html.new
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
~~~~~

#### Acts 2: 扩展 Renderer 数据返回
修改 `drawTracker` 逻辑，使其不仅找到当前的 `targetArc`，还根据索引提取前后弧线/动作的信息。

~~~~~act
patch_file
web/js/canvasRenderer.js
~~~~~
~~~~~javascript.old
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
~~~~~
~~~~~javascript.new
        let targetIdx = arcs.length - 1;
        for (let i = 0; i < arcs.length; i++) {
            const arc = arcs[i];
            const arcLen = arc.R * Math.abs(arc.endAngle - arc.startAngle);
            if (currentLen + arcLen >= targetLen) {
                targetArc = arc;
                targetIdx = i;
                localProgress = (targetLen - currentLen) / arcLen;
                break;
            }
            currentLen += arcLen;
        }

        // 2. 计算插值坐标
~~~~~
~~~~~act
patch_file
web/js/canvasRenderer.js
~~~~~
~~~~~javascript.old
        return {
            state: targetArc.state,
            moveName: targetArc.move ? targetArc.move.name : "滑行/蹬冰"
        };
    }
~~~~~
~~~~~javascript.new
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

#### Acts 3: 同步 HUD 状态显示
更新 `app.js` 中的 `renderAnimationStep` 以填充新的 UI 字段。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
    // 执行绘制并获取当前位置的状态信息
    const currentInfo = renderer.drawTracker(geometry, animProgress, transform, fFactor);
    
    if (currentInfo) {
        document.getElementById("overlay-move").innerText = currentInfo.moveName;
        document.getElementById("overlay-state").innerText = currentInfo.state;
        document.getElementById("anim-progress-bar").style.width = `${animProgress * 100}%`;
    }
}
~~~~~
~~~~~javascript.new
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

### 下一步建议
- **关键帧预览**：当鼠标悬停在进度条某个位置时，在画布上显示一个半透明的“虚影”小球，预览该位置的姿态。
- **AB 段循环**：支持在进度条上标记 A 点和 B 点，让动画在特定步法区间内反复循环播放，方便深入拆解动作。
- **UI 微调**：可以考虑为不同的步法类别（如 Turn, Step, Mohawk）在进度条上设置不同的高度或纹理，增强辨识度。
