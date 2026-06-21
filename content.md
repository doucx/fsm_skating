你的观察非常敏锐。目前的交互确实存在“视觉重心反转”的问题——鼠标移入时变暗会给用户一种该项被“抑制”或“不可选”的错觉。

我将执行以下操作：
1.  修改 `app.js` 中动态生成的搜索结果卡片样式，将默认边框设为更柔和的 `slate-800`。
2.  为 Hover 状态引入 `sky-400/50` 的高亮边框，并叠加一个蓝色的软辉光（Soft Glow）阴影。
3.  增加 `transition-all` 和 `duration-300` 确保辉光浮现的过程丝滑、具有弹性。

## [WIP] style(web): 优化搜索结果卡片交互，实现软辉光 Hover 效果

### 用户需求
检索结果路线列表中的卡片在鼠标悬停时边框变暗，不符合直觉。需要反转逻辑，让选中的卡片在悬停时产生“软辉光”效果，增强交互的反馈感。

### 评论
在“冰面物理”这种深色调且具有发光元素的 UI 风格中，Hover 状态应当表现为“充能”或“亮起”。通过 CSS `box-shadow` 模拟的软辉光可以完美契合滑冰沙盒的冷色调视觉特征，让搜索结果看起来像是在冰面上被照亮。

### 目标
1.  调整 `app.js` 中搜索结果卡片的 `className`。
2.  实现悬停时的边框亮化、背景微调及蓝色软辉光投影。

### 基本原理
利用 Tailwind 的任意值阴影语法 `hover:shadow-[0_0_20px_rgba(56,189,248,0.15)]` 来创建非侵入式的软辉光。同时，将 `transition` 从默认改为 `transition-all`，以确保阴影、背景色和边框颜色能同步平滑过渡。

### 标签
#intent/refine #flow/ready #priority/low #comp/interfaces #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/search-result-card #task/action/polish #task/state/begin

---

### Script

#### Acts 1: 优化 `app.js` 中的卡片样式

我们将更新 `searchPaths` 函数中创建 `card` 元素的代码。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
        paths.forEach((p, idx) => {
            const totalDiff = p.reduce((sum, step) => sum + (step.move ? step.move.difficulty : 0), 0);
            const trailHTML = ui.renderPathTrailHTML(p, true);

            const card = document.createElement("div");
            card.className = "bg-slate-900/60 border border-slate-850 hover:border-sky-500/30 p-4 rounded-xl flex flex-col space-y-3 transition group";
            
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

### 下一步建议
- **性能观察**: 辉光阴影在列表项极多时可能会对渲染压力有一点点影响，目前限制为 10 条结果完全没有问题。如果未来增加到 100+ 条，建议开启 `will-change: transform` 或简化阴影。
- **一致性检查**: 如果这种辉光反馈效果良好，我们可以考虑将 `transition-options`（推荐分支列表）中的按钮也升级为这种辉光交互。
