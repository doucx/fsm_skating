你的建议非常专业。这种“极简主义”的交互方式不仅让 UI 更加清爽，还充分利用了阴影（Shadow）和边框（Border）作为非语言暗示的力量。

我将执行以下操作：
1.  在 `uiController.js` 中新增 `renderResultCardHTML` 函数，作为渲染路径卡片的唯一标准模板。
2.  移除卡片内部的提示文字，仅保留轨迹流和难度标签，通过 `justify-between items-center` 布局实现紧凑的单行感。
3.  重构 `app.js`，在三个核心场景中统一调用该模板。

## [WIP] refactor(web): 提取路径卡片模板并实现极致简约的交互 UI

### 用户需求
1. 删除卡片中冗余的提示文字。
2. 通过封装模板解决代码重复（DRY）问题。
3. 保持通过“软辉光”提供的隐性交互暗示。

### 评论
移除提示文字是一个大胆但正确的决定。在现代 Web 设计中，当一个列表项在鼠标悬停时产生明显的视觉反馈（发光+背景变色）时，用户会自发尝试点击。封装模板则极大提升了系统的可维护性，以后若需调整所有卡片的圆角或阴影，只需修改一处。

### 目标
1.  在 `uiController.js` 中定义 `renderResultCardHTML`。
2.  重构 `app.js` 中的 `verifySequence`、`verifyMovesSequence` 和 `searchPaths`。
3.  统一所有场景下的卡片为“单行/多行自适应”的精简模式。

### 基本原理
我们在模板中使用了 `flex justify-between items-center`。左侧是调用 `renderPathTrailHTML` 生成的轨迹流，右侧是难度标签。通过移除卡片内的次要文字和多余的 `flex-col` 间距，卡片变得更加扁平化。

### 标签
#intent/refine #flow/ready #priority/medium #comp/interfaces #concept/ui #scope/ux #dx #ai/refine #task/domain/ui #task/object/path-card-template #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 在 `uiController.js` 中封装卡片模板

我们将新增 `renderResultCardHTML` 并在其中封装所有的样式定义。

~~~~~act
patch_file
web/js/uiController.js
~~~~~
~~~~~javascript.old
export function renderPathTrailHTML(path, isMini = false) {
    const size = isMini 
        ? { state: "px-1.5 py-0.5 text-[10px]", move: "px-1.5 py-0.5 text-[9px]", diff: "text-[7px]", arrow: "text-[8px]" }
        : { state: "px-2.5 py-1 text-xs", move: "px-2.5 py-1 text-[10px]", diff: "text-[8px]", arrow: "text-[9px]" };

    return path.map((step, idx) => {
        const stateStr = typeof step.state === 'string' ? step.state : `${step.state.foot}${step.state.direction}${step.state.edge}`;
        let html = `<span class="${size.state} font-bold font-mono tracking-wider bg-sky-950 text-sky-300 rounded-md border border-sky-800 glow-ice flex items-center shrink-0">${stateStr}</span>`;
        
        if (step.move) {
            const miniName = step.move.name.split(" ")[0];
            const rotIcon = step.move.rotation_dir ? (step.move.rotation_dir === 'CW' ? ' ↻' : ' ↺') : '';
            html += `
                <span class="${size.arrow} text-slate-600 self-center px-0.5"><i class="fa-solid fa-chevron-right"></i></span>
                <div class="flex items-center space-x-1.5 ${size.move} bg-amber-950/40 border border-amber-500/40 rounded-md shadow-[0_0_10px_rgba(245,158,11,0.25)] text-amber-400 font-semibold shrink-0">
                    <span class="tracking-tight">${miniName}${rotIcon}</span>
                    <span class="px-1 py-0.2 bg-amber-500 text-slate-950 rounded-[3px] ${size.diff} font-extrabold leading-none scale-90 origin-right">${step.move.difficulty}级</span>
                </div>
                <span class="${size.arrow} text-slate-600 self-center px-0.5"><i class="fa-solid fa-chevron-right"></i></span>
            `;
        }
        return html;
    }).join("");
}
~~~~~
~~~~~javascript.new
export function renderPathTrailHTML(path, isMini = false) {
    const size = isMini 
        ? { state: "px-1.5 py-0.5 text-[10px]", move: "px-1.5 py-0.5 text-[9px]", diff: "text-[7px]", arrow: "text-[8px]" }
        : { state: "px-2.5 py-1 text-xs", move: "px-2.5 py-1 text-[10px]", diff: "text-[8px]", arrow: "text-[9px]" };

    return path.map((step, idx) => {
        const stateStr = typeof step.state === 'string' ? step.state : `${step.state.foot}${step.state.direction}${step.state.edge}`;
        let html = `<span class="${size.state} font-bold font-mono tracking-wider bg-sky-950 text-sky-300 rounded-md border border-sky-800 glow-ice flex items-center shrink-0">${stateStr}</span>`;
        
        if (step.move) {
            const miniName = step.move.name.split(" ")[0];
            const rotIcon = step.move.rotation_dir ? (step.move.rotation_dir === 'CW' ? ' ↻' : ' ↺') : '';
            html += `
                <span class="${size.arrow} text-slate-600 self-center px-0.5"><i class="fa-solid fa-chevron-right"></i></span>
                <div class="flex items-center space-x-1.5 ${size.move} bg-amber-950/40 border border-amber-500/40 rounded-md shadow-[0_0_10px_rgba(245,158,11,0.25)] text-amber-400 font-semibold shrink-0">
                    <span class="tracking-tight">${miniName}${rotIcon}</span>
                    <span class="px-1 py-0.2 bg-amber-500 text-slate-950 rounded-[3px] ${size.diff} font-extrabold leading-none scale-90 origin-right">${step.move.difficulty}级</span>
                </div>
                <span class="${size.arrow} text-slate-600 self-center px-0.5"><i class="fa-solid fa-chevron-right"></i></span>
            `;
        }
        return html;
    }).join("");
}

/**
 * 统一结果卡片模板 (封装 DRY 逻辑)
 */
export function renderResultCardHTML(path, totalDifficulty, onClickAction) {
    const trailHTML = renderPathTrailHTML(path, true);
    return `
        <button onclick="${onClickAction}" class="w-full text-left bg-slate-900/40 border border-slate-800 hover:border-sky-400/50 hover:bg-sky-400/5 hover:shadow-[0_0_20px_rgba(56,189,248,0.15)] p-4 rounded-xl transition-all duration-300 group outline-none">
            <div class="flex justify-between items-center">
                <div class="flex flex-wrap items-center gap-1.5 overflow-hidden">${trailHTML}</div>
                <span class="text-[10px] font-semibold px-2 py-1 rounded bg-sky-950/60 text-sky-400 border border-sky-900 shrink-0 ml-4">难度: ${totalDifficulty}</span>
            </div>
        </button>
    `;
}
~~~~~

#### Acts 2: 在 `app.js` 中全面应用新模板

我们将移除所有手写的卡片 HTML，改为调用 `ui.renderResultCardHTML`。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
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
~~~~~
~~~~~javascript.new
            // 允许一键渲染 verifiedPath
            window.verifiedPathData = data.transitions.map(t => ({
                state: typeof t.to_state === 'string' ? t.to_state : `${t.to_state.foot}${t.to_state.direction}${t.to_state.edge}`,
                move: t.selected_move
            }));
            window.verifiedInitialState = typeof data.states[0] === 'string' ? data.states[0] : `${data.states[0].foot}${data.states[0].direction}${data.states[0].edge}`;

            // 歧义检查 (保留在卡片外部)
            let candidateHTML = "";
            const ambiguousSteps = data.transitions.filter(t => t.candidate_moves.length > 1);
            if (ambiguousSteps.length > 0) {
                const details = ambiguousSteps.map(t => t.selected_move.name).join(", ");
                candidateHTML = `<div class="text-[10px] text-amber-400/80 bg-amber-950/20 p-2 rounded border border-amber-900/50 mt-2"><i class="fa-solid fa-circle-nodes mr-1"></i>存在物理歧义。其它候选：${details}</div>`;
            }

            const cardHTML = ui.renderResultCardHTML(pathForRender, data.total_difficulty, "loadVerifiedPathToCanvas()");

            output.innerHTML = `
                <div class="px-4 py-2 bg-emerald-950/20 border border-emerald-900/50 rounded-lg flex items-center justify-between mb-3">
                    <p class="text-emerald-400 text-xs font-bold flex items-center"><i class="fa-solid fa-circle-check mr-2"></i> 验证成功</p>
                    <span class="text-[10px] text-slate-500 font-mono">Verified Path</span>
                </div>
                ${cardHTML}
                ${candidateHTML}
            `;
~~~~~

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
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
~~~~~
~~~~~javascript.new
            const pathForRender = [];
            data.trace.forEach((step, idx) => {
                if (idx === 0) pathForRender.push({ state: step.from_state, move: step.move });
                else pathForRender[pathForRender.length - 1].move = step.move;
                pathForRender.push({ state: step.to_state, move: null });
            });

            // 准备载入数据
            window.verifiedPathData = data.trace.map(t => ({
                state: typeof t.to_state === 'string' ? t.to_state : `${t.to_state.foot}${t.to_state.direction}${t.to_state.edge}`,
                move: t.move
            }));
            const initial = typeof data.trace[0].from_state === 'string' ? data.trace[0].from_state : `${data.trace[0].from_state.foot}${data.trace[0].from_state.direction}${data.trace[0].from_state.edge}`;
            window.verifiedInitialState = initial;

            const cardHTML = ui.renderResultCardHTML(pathForRender, data.total_difficulty, "loadVerifiedPathToCanvas()");

            output.innerHTML = `
                <div class="px-4 py-2 bg-emerald-950/20 border border-emerald-900/50 rounded-lg flex items-center justify-between mb-3">
                    <p class="text-emerald-400 text-xs font-bold flex items-center"><i class="fa-solid fa-circle-check mr-2"></i> 演算成功</p>
                    <span class="text-[10px] text-slate-500 font-mono">Trace Inference</span>
                </div>
                ${cardHTML}
            `;
~~~~~

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
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
~~~~~
~~~~~javascript.new
        paths.forEach((p, idx) => {
            const totalDiff = p.reduce((sum, step) => sum + (step.move ? step.move.difficulty : 0), 0);
            const cardHTML = ui.renderResultCardHTML(p, totalDiff, `loadSearchedPathToCanvas(${idx})`);
            
            const wrapper = document.createElement("div");
            wrapper.innerHTML = cardHTML;
            resultsDiv.appendChild(wrapper.firstElementChild);
        });
~~~~~

### 下一步建议
- **回归测试**: 此时由于卡片内部结构简化，确保在各种长度的路径（如 8 步以上）下，`flex-wrap` 仍然能正常工作，不会撑破容器。
- **视觉反馈增强**: 由于去掉了文字，可以考虑在 `renderResultCardHTML` 的 `hover` 样式中加入极轻微的 `scale(1.01)`，让“点击”感更加呼之欲出。
- **创建提交**: 任务已按要求完成，代码质量显著提升。执行 `创建提交` 固化变更。
