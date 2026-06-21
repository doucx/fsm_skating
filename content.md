好的，我将把“物理步法序列校验器”的结果展示重构为与搜索结果一致的“整项点击+软辉光”模式。

这不仅会让 UI 看起来更统一，也能让用户在验证成功后，只需点击一下那个精美的轨迹卡片就能立即在画布上预览。

## [WIP] feat(web): 同步序列校验器结果展示，实现一致的卡片交互模式

### 用户需求
将“物理步法序列校验器”的结果展示重构为与搜索结果一致的交互逻辑：移除独立的“载入”按钮，将整个校验成功的反馈区域变为可点击的、带软辉光效果的卡片。

### 评论
这种交互逻辑的同步是建立高质量用户心理模型的关键。用户一旦学会在搜索结果中通过点击卡片来预览轨迹，他们自然会期望在校验器中也执行同样的操作。通过消除这种行为不一致，我们让系统的 DX（开发者体验）更加流畅。

### 目标
1.  重构 `app.js` 中的 `verifySequence` 和 `verifyMovesSequence` 函数。
2.  将校验结果包装在一个具有 `onclick="loadVerifiedPathToCanvas()"` 属性的交互式按钮容器中。
3.  应用相同的软辉光、边框亮化和 `transition` 样式。

### 基本原理
我们将 `verify-result` 区域内部的结构调整为：顶部的成功/失败提示头 + 中间的可点击轨迹卡片。点击卡片会触发 `loadVerifiedPathToCanvas()`。通过这种方式，我们不仅优化了布局，还强化了校验器作为“轨迹过滤器”的定位。

### 标签
#intent/refine #flow/ready #priority/medium #comp/interfaces #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/verify-result-card #task/action/synchronize #task/state/continue

---

### Script

#### Acts 1: 同步 `verifySequence` 渲染逻辑

我们将修改 `app.js` 中 `verifySequence` 处理成功逻辑的部分。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
        } else {
            output.className = "mt-4 p-4 rounded-xl text-sm border border-emerald-950 bg-emerald-950/10 text-slate-300 space-y-4";
            
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
                candidateHTML = `<div class="text-[10px] text-amber-400/80 bg-amber-950/20 p-2 rounded border border-amber-900/50"><i class="fa-solid fa-circle-nodes mr-1"></i>存在物理歧义。识别结果仅为最优匹配，其它候选：${details}</div>`;
            }

            // 允许一键渲染 verifiedPath
            window.verifiedPathData = data.transitions.map(t => ({
                state: typeof t.to_state === 'string' ? t.to_state : `${t.to_state.foot}${t.to_state.direction}${t.to_state.edge}`,
                move: t.selected_move
            }));
            window.verifiedInitialState = typeof data.states[0] === 'string' ? data.states[0] : `${data.states[0].foot}${data.states[0].direction}${data.states[0].edge}`;

            const loadBtnHTML = `
                <button onclick="loadVerifiedPathToCanvas()" class="mt-2 w-full py-1.5 bg-sky-950 hover:bg-sky-900 border border-sky-800 rounded-md text-xs text-sky-300 transition flex items-center justify-center">
                    <i class="fa-solid fa-chart-line mr-1"></i> 将此验证轨迹载入主画布预览
                </button>
            `;

            output.innerHTML = `
                <p class="text-emerald-400 font-bold flex items-center"><i class="fa-solid fa-circle-check mr-1"></i> 验证通过！符合物理规范</p>
                <div class="flex flex-wrap items-center gap-1.5 py-1">${trailHTML}</div>
                ${candidateHTML}
                <div class="text-xs text-slate-400 border-t border-emerald-900/30 pt-2">总设计难度积分: <strong class="text-slate-200 text-sm">${data.total_difficulty}</strong></div>
                ${loadBtnHTML}
            `;
        }
~~~~~
~~~~~javascript.new
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
~~~~~

#### Acts 2: 同步 `verifyMovesSequence` 渲染逻辑

我们将修改 `app.js` 中 `verifyMovesSequence` 处理成功逻辑的部分。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
        } else {
            output.className = "mt-4 p-4 rounded-xl text-sm border border-emerald-950 bg-emerald-950/10 text-slate-300 space-y-4";
            
            const pathForRender = [];
            data.trace.forEach((step, idx) => {
                if (idx === 0) pathForRender.push({ state: step.from_state, move: step.move });
                else pathForRender[pathForRender.length - 1].move = step.move;
                pathForRender.push({ state: step.to_state, move: null });
            });

            const trailHTML = ui.renderPathTrailHTML(pathForRender, true);

            // 渲染推导出的轨迹至主画布
            window.verifiedPathData = data.trace.map(t => ({
                state: typeof t.to_state === 'string' ? t.to_state : `${t.to_state.foot}${t.to_state.direction}${t.to_state.edge}`,
                move: t.move
            }));
            const initial = typeof data.trace[0].from_state === 'string' ? data.trace[0].from_state : `${data.trace[0].from_state.foot}${data.trace[0].from_state.direction}${data.trace[0].from_state.edge}`;
            window.verifiedInitialState = initial;

            const loadBtnHTML = `
                <button onclick="loadVerifiedPathToCanvas()" class="mt-2 w-full py-1.5 bg-sky-950 hover:bg-sky-900 border border-sky-800 rounded-md text-xs text-sky-300 transition flex items-center justify-center">
                    <i class="fa-solid fa-chart-line mr-1"></i> 将此演算轨迹载入主画布预览
                </button>
            `;

            output.innerHTML = `
                <p class="text-emerald-400 font-bold flex items-center"><i class="fa-solid fa-circle-check mr-1"></i> 验证并演算成功！</p>
                <div class="flex flex-wrap items-center gap-1.5 py-1">${trailHTML}</div>
                <div class="text-xs text-slate-400 border-t border-emerald-900/30 pt-2">推导总设计难度分: <strong class="text-slate-200 text-sm">${data.total_difficulty}</strong></div>
                ${loadBtnHTML}
            `;
        }
~~~~~
~~~~~javascript.new
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
~~~~~

### 下一步建议
- **最终测试**: 在 UI 中进行多次不同类型的校验（状态流 vs 步法流），确认生成的卡片在视觉上完全对齐，且点击行为准确无误。
- **添加 Active 态**: 如果想要更进一步，可以在点击载入后，给对应的卡片添加一个持续的发光边框（例如 `border-sky-400`），以标记当前正在预览的路径。
- **创建提交**: UI 一致性重构已完成，可以执行 `创建提交`。
