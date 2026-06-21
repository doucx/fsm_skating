这个改进非常符合现代 TUI/Web 设计的“卡片式交互”趋势。通过将整个容器变为可点击的单元，我们不仅消除了视觉上的冗余，还扩大了交互的热区，使搜索结果列表看起来更像是一个专业的数据仪表盘。

我将执行以下操作：
1.  修改 `app.js` 中的 `searchPaths` 函数：
    - 将 `card` 的元素类型从 `div` 更改为 `button`。
    - 为 `card` 添加 `w-full` 和 `text-left` 样式以确保其表现得像一个列表项。
    - 将原本底部按钮的 `onclick` 事件直接绑定到 `card` 上。
    - 移除原本内部的 `button` 元素。

## [WIP] feat(web): 重构搜索结果卡片为整项点击模式

### 用户需求
删除搜索结果中重复的“载入”按钮，将整个路径卡片作为一个可点击的交互项，使 UI 更加紧凑和直观。

### 评论
这显著降低了视觉噪音。当用户看到列表中的路径轨迹时，点击轨迹本身进行预览是最自然的直觉。整项点击模式配合我们之前添加的“软辉光”效果，能提供极佳的交互确认感。

### 目标
1.  重构 `app.js` 的搜索结果生成逻辑。
2.  确保整项点击后能够正确触发 `loadSearchedPathToCanvas`。
3.  优化卡片内的布局，使其在紧凑模式下依然清晰。

### 基本原理
我们将 HTML 结构扁平化。原本作为 `div` 的容器被替换为带有 `onclick` 属性的 `button` 元素。为了保持布局一致，我们保留了 `flex justify-between items-center` 结构。移除底部按钮后，轨迹展示区将获得更大的垂直空间，观感更为透亮。

### 标签
#intent/refine #flow/ready #priority/medium #comp/interfaces #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/search-result-card #task/action/polish #task/state/continue

---

### Script

#### Acts 1: 重构搜索结果渲染逻辑

我们将修改 `app.js` 中 `searchPaths` 函数内的循环部分。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
        paths.forEach((p, idx) => {
            const totalDiff = p.reduce((sum, step) => sum + (step.move ? step.move.difficulty : 0), 0);
            const trailHTML = ui.renderPathTrailHTML(p, true);

            const card = document.createElement("div");
            // 优化：默认使用更清晰的 slate-800 边框，Hover 时变为 sky 亮色、微蓝背景及软辉光阴影
            card.className = "bg-slate-900/60 border border-slate-800 hover:border-sky-400/50 hover:bg-sky-400/5 hover:shadow-[0_0_20px_rgba(56,189,248,0.15)] p-4 rounded-xl flex flex-col space-y-3 transition-all duration-300 group";
            
            card.innerHTML = `
                <div class="flex justify-between items-center">
                    <div class="flex flex-wrap items-center gap-1.5 overflow-hidden">${trailHTML}</div>
                    <span class="text-[10px] font-semibold px-2 py-1 rounded bg-sky-950/60 text-sky-400 border border-sky-900 shrink-0 ml-2">难度: ${totalDiff}</span>
                </div>
                <button onclick="loadSearchedPathToCanvas(${idx})" class="w-full py-1.5 bg-sky-950/40 hover:bg-sky-900/60 border border-sky-800/40 hover:border-sky-700 text-[10px] text-sky-300 rounded-md transition flex items-center justify-center">
                    <i class="fa-solid fa-chart-line mr-1"></i> 载入此轨迹至画布
                </button>
            `;
            resultsDiv.appendChild(card);
        });
~~~~~
~~~~~javascript.new
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

### 下一步建议
- **一致性同步**：既然搜索结果已经实现了整项点击和软辉光，建议对“物理步法序列校验器”的结果展示也进行同样的重构（目前它也含有一个底部按钮），以保持交互逻辑的全局一致。
- **状态标记**：当一个路径被载入画布后，可以为该卡片添加一个“Active”状态（例如一个蓝色的左侧指示条），告知用户当前画布上正在展示的是哪一条搜索结果。
- **创建提交**：如果这组 UI 微调符合预期，可以执行 `创建提交` 将其固化。
