分析非常准确，这确实是一个典型的 JavaScript 模板字符串隐式转换错误。

当后端 API 返回 Pydantic 定义的 `State` 模型时，它在前端表现为一个包含 `foot`, `direction`, `edge` 属性的 JSON 对象。在 `web/js/app.js` 中，代码直接将这两个对象插入到了 HTML 模板字符串中（`${t.from_state}`），导致 JavaScript 调用了对象的默认 `toString()` 方法，从而输出了 `[object Object]`。

我将生成一个修复计划，在前端渲染前显式地将状态对象格式化为“LFO”这种简写字符串。

## [WIP] fix(web): 修复校验器输出结果中状态显示为 [object Object] 的问题

### 错误分析

**问题表现**: 
在“物理步法序列校验器”中，验证结果列表显示的不是如 `LFO ──▶ LFI` 的字符串，而是 `[object Object] ──▶ [object Object]`。

**根本原因**: 
在 `web/js/app.js` 的 `verifySequence` 和 `verifyMovesSequence` 函数中，直接在模板字符串里引用了 `t.from_state` 和 `t.to_state`（或 `step.from_state`）。由于后端返回的是结构化对象而非纯字符串，JavaScript 在进行字符串插值时无法自动将其转换为“LFO”格式，而是使用了默认的 `[object Object]` 占位符。

**解决方案**:
在渲染结果 HTML 之前，通过模板字符串 `${s.foot}${s.direction}${s.edge}` 将 `State` 对象手动拼接为 3 位状态码。

### 用户需求
修正 Web UI 中“物理步法序列校验器”的结果展示，使其能正确显示滑行状态代码（如 LFO, RBO）。

### 评论
这是一个纯前端的显示层逻辑修复，不涉及算法和后端的变更。由于这种拼写逻辑在代码中出现了两次，我们需要同时修复这两个位置。

### 目标
1. 在 `verifySequence` 的渲染循环中增加状态格式化逻辑。
2. 在 `verifyMovesSequence` 的渲染循环中增加状态格式化逻辑。

### 基本原理
利用 ES6 解构或属性访问，在将数据推入 `listHTML` 之前，先构造好易读的 `fromStr` 和 `toStr` 变量。

### 标签
#intent/fix #flow/ready #priority/high 
#comp/interfaces #concept/ui #scope/ux 
#ai/instruct
#task/domain/ui
#task/object/state-renderer
#task/action/fix
#task/state/begin

---

### Script

#### Acts 1: 修复 `app.js` 中的状态字符串插值错误

我们将对 `web/js/app.js` 进行两次精确替换，确保两种校验模式下的输出都能正确显示状态码。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
            let listHTML = "";
            data.transitions.forEach((t) => {
                const rot = t.selected_move.rotation_dir ? ` [${t.selected_move.rotation_dir === 'CW' ? '顺时针' : '逆时针'}]` : "";
                let candidateHTML = "";
                if (t.candidate_moves.length > 1) {
                    const others = t.candidate_moves.slice(1).map(c => c.name).join(", ");
                    candidateHTML = `<div class="text-[10px] text-amber-400/80 mt-1"><i class="fa-solid fa-circle-nodes mr-1"></i>存在歧义（多重路径候选: ${others}）</div>`;
                }
                listHTML += `
                    <div class="text-xs pl-3 border-l border-emerald-800">
                        <span class="font-bold text-slate-200">${t.from_state} ──▶ ${t.to_state}</span><br/>
                        <span class="text-emerald-400">${t.selected_move.name}${rot}</span> (难度: ${t.selected_move.difficulty})
                        ${candidateHTML}
                    </div>
                `;
            });
~~~~~
~~~~~javascript.new
            let listHTML = "";
            data.transitions.forEach((t) => {
                const fromStr = `${t.from_state.foot}${t.from_state.direction}${t.from_state.edge}`;
                const toStr = `${t.to_state.foot}${t.to_state.direction}${t.to_state.edge}`;
                const rot = t.selected_move.rotation_dir ? ` [${t.selected_move.rotation_dir === 'CW' ? '顺时针' : '逆时针'}]` : "";
                let candidateHTML = "";
                if (t.candidate_moves.length > 1) {
                    const others = t.candidate_moves.slice(1).map(c => c.name).join(", ");
                    candidateHTML = `<div class="text-[10px] text-amber-400/80 mt-1"><i class="fa-solid fa-circle-nodes mr-1"></i>存在歧义（多重路径候选: ${others}）</div>`;
                }
                listHTML += `
                    <div class="text-xs pl-3 border-l border-emerald-800">
                        <span class="font-bold text-slate-200">${fromStr} ──▶ ${toStr}</span><br/>
                        <span class="text-emerald-400">${t.selected_move.name}${rot}</span> (难度: ${t.selected_move.difficulty})
                        ${candidateHTML}
                    </div>
                `;
            });
~~~~~

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
            let listHTML = "";
            data.trace.forEach((step) => {
                const rot = step.move.rotation_dir ? ` [${step.move.rotation_dir === 'CW' ? '顺时针' : '逆时针'}]` : "";
                listHTML += `
                    <div class="text-xs pl-3 border-l border-emerald-800">
                        <span class="font-bold text-slate-200">${step.from_state} ──▶ ${step.to_state}</span><br/>
                        <span class="text-emerald-400">${step.move.name}${rot}</span> (难度: ${step.move.difficulty})
                    </div>
                `;
            });
~~~~~
~~~~~javascript.new
            let listHTML = "";
            data.trace.forEach((step) => {
                const fromStr = `${step.from_state.foot}${step.from_state.direction}${step.from_state.edge}`;
                const toStr = `${step.to_state.foot}${step.to_state.direction}${step.to_state.edge}`;
                const rot = step.move.rotation_dir ? ` [${step.move.rotation_dir === 'CW' ? '顺时针' : '逆时针'}]` : "";
                listHTML += `
                    <div class="text-xs pl-3 border-l border-emerald-800">
                        <span class="font-bold text-slate-200">${fromStr} ──▶ ${toStr}</span><br/>
                        <span class="text-emerald-400">${step.move.name}${rot}</span> (难度: ${step.move.difficulty})
                    </div>
                `;
            });
~~~~~

### 下一步建议
* **代码重构**: 目前 `app.js` 中多处手动拼接 `${s.foot}${s.direction}${s.edge}`。建议未来在 `web/js/state.js` 中添加一个通用的 `formatState(stateObj)` 工具函数，以提高代码的可维护性。
* **回归测试**: 修改后请刷新页面，分别测试“状态流校验”和“步法流校验”，确认结果已能正确显示为三位简写代码。
