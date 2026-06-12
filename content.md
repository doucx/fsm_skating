好的，我理解你的需求。在编排轨迹流向（已完成轨迹流向）中，直接展示动作名称（如“前外转三”）比单纯显示难度等级能提供更直观的编排反馈。

我将修改 `web/js/app.js` 中的 `updateStats` 函数，使箭头的标注信息同时包含动作名称。

## [WIP] feat(web): 在轨迹流向图中显示具体的步法名称

### 用户需求
修改前端 UI 的“已规划轨迹流向”区域，使其在显示步骤之间的转换时，不仅显示难度等级（例如“3级”），还要包含所使用的具体步法名称。

### 评论
这是一个提升用户体验（UX）的小改进，能让用户在查看编排路径时更清晰地知道每一步发生了什么，而不仅仅是难度反馈。

### 目标
1.  修改 `web/js/app.js` 中的 `updateStats` 逻辑。
2.  在渲染 `trail`（轨迹流向）的 `arrow` 元素时，提取 `step.move.name` 并将其渲染到界面中。

### 基本原理
在 `updateStats` 函数中，我们遍历 `path` 数组。当 `step.move` 存在时，我们创建一个 `span` 作为连接箭头的容器。目前它只渲染了 `${step.move.difficulty}级`。我们将修改其 `innerHTML` 模板，加入 `step.move.name`，并调整样式以适应多行显示。

### 标签
#intent/build #flow/ready #priority/medium #comp/interfaces #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/trajectory-flow #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 更新 `web/js/app.js` 以显示步法名称

我们将定位到 `updateStats` 函数中处理 `step.move` 渲染的代码块，并注入动作名称。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
        if (step.move) {
            const arrow = document.createElement("span");
            arrow.className = "text-[10px] text-slate-500 flex flex-col items-center";
            arrow.innerHTML = `<i class="fa-solid fa-chevron-right"></i><span class="text-[9px] text-slate-400 scale-90">${step.move.difficulty}级</span>`;
            trail.appendChild(arrow);
        }
~~~~~
~~~~~javascript.new
        if (step.move) {
            const arrow = document.createElement("span");
            arrow.className = "text-[10px] text-slate-500 flex flex-col items-center px-1";
            // 显示步法名称（截取前段）和难度
            const miniName = step.move.name.split(" ")[0];
            arrow.innerHTML = `
                <i class="fa-solid fa-chevron-right"></i>
                <span class="text-[8px] text-slate-400 scale-90 text-center leading-tight">
                    ${miniName}<br/>${step.move.difficulty}级
                </span>`;
            trail.appendChild(arrow);
        }
~~~~~

### 下一步建议
- **UI 压力测试**: 随着编排步数增加，流向图可能会变得非常长。建议观察在 10 步以上时，`flex-wrap` 的排版是否依然美观。
- **工具提示**: 如果由于空间限制需要缩短名称，可以考虑为该 `span` 添加 `title="${step.move.name}"`，以便用户悬停时查看全称。
