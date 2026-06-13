在完成了 UI 同步逻辑的重构并提炼出 `syncChoreographyUI` 辅助函数之后，引入 LocalStorage 的自动保存和恢复变得异常简单与优雅。

因为所有修改路径和状态的事件（手动编排、动作撤销、智能生成路径、源码导入、甚至起始用刃状态改变等）在完成数据变更后，最终都会集中调配 `syncChoreographyUI()` 触发 UI 渲染。因此，我们只需要将持久化钩子注入到该统一出口，并在页面加载时执行逆向的加载重建，即可确保用户在任何修改路径的操作后，数据都能即时存储且不会在页面关闭时丢失。

我将为您生成一个完整的计划来引入该 LocalStorage 持久化和恢复机制。

## [WIP] feat: 在 web/js/app.js 中引入基于 LocalStorage 的自动保存与恢复逻辑

### 用户需求
在 FSM 步法编排沙盒前端中实现自动保存与数据恢复机制。在用户执行任何修改路径的操作（包括但不限于选择下一个动作、撤销操作、智能生成路径、导入外部 JSON 源码、甚至起始状态重置等）时，将“轨迹流向”实时持久化至浏览器的 LocalStorage 中。当用户关闭网页并重新打开时，系统能自动恢复上一滑行会话的未完结编排。

### 评论
这个设计能大幅提升用户体验 (UX)。在此前的重构中，我们已经将所有路径变更相关的 UI 同步操作合并到了统一的 `syncChoreographyUI` 辅助函数中。将 LocalStorage 的持久化调用直接置于该函数内，可以达到“一次修改、全线生效”的效果，完美避免了在各个修改路径操作的子函数里零散调用 LocalStorage 的混乱设计。

### 目标
1. 定义持久化写入辅助函数 `saveToLocalStorage`，将全局 `path` 数组序列化并存储至 LocalStorage（键名定为 `"fsm_skating_path"`）。
2. 在 `syncChoreographyUI` 结束前，追加对 `saveToLocalStorage` 的调用。
3. 定义恢复数据读取辅助函数 `loadFromLocalStorage`，在页面首屏加载时解析已存储的 path JSON，恢复 `path` 变量的值，同步将起始选择框 `start-state-select` 恢复至路径起点用刃状态，并调用 `syncChoreographyUI` 重绘冰面轨迹。
4. 修改页面生命周期的 `DOMContentLoaded` 入口，优先尝试从 LocalStorage 恢复，恢复失败时才降级为使用缺省的 `initChoreography`。

### 基本原理
利用 HTML5 规范中现代浏览器均支持的 `window.localStorage` 进行离线持久化存储。使用 `JSON.stringify` 与 `JSON.parse` 对复杂类型（对象数组 `path`）进行序列化与反序列化，通过精简的 Hook 设计嵌入在我们之前重构的统一管道函数中，确保行为的确定性和零状态遗漏。

### 标签
#intent/build #flow/ready #priority/medium #concept/ui #scope/ux #ai/refine
#task/domain/ui
#task/object/ui-auto-save
#task/action/implementation
#task/state/continue
#task/status/active

---

### Script

#### Acts 1: 在 `web/js/app.js` 中注入自动保存与数据恢复辅助函数

我们将扩展 `syncChoreographyUI` 并在其下方声明 `saveToLocalStorage` 与 `loadFromLocalStorage`。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
function updateTrajectorySourceUI() {
    const sourceData = path.map(step => ({
        state: step.state,
        move_id: step.move ? step.move.id : null
    }));
    document.getElementById("trajectory-source").value = JSON.stringify(sourceData);
}

function syncChoreographyUI() {
    ui.updateStats(path, undoMove);
    drawPath(true);
    updateTrajectorySourceUI();
}
~~~~~
~~~~~javascript.new
function updateTrajectorySourceUI() {
    const sourceData = path.map(step => ({
        state: step.state,
        move_id: step.move ? step.move.id : null
    }));
    document.getElementById("trajectory-source").value = JSON.stringify(sourceData);
}

function syncChoreographyUI() {
    ui.updateStats(path, undoMove);
    drawPath(true);
    updateTrajectorySourceUI();
    saveToLocalStorage();
}

function saveToLocalStorage() {
    try {
        localStorage.setItem("fsm_skating_path", JSON.stringify(path));
    } catch (e) {
        console.error("Failed to save path to LocalStorage:", e);
    }
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem("fsm_skating_path");
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                path = parsed;
                // 将 start-state-select 同步为 path[0].state
                const startSelect = document.getElementById("start-state-select");
                if (startSelect && path[0]) {
                    startSelect.value = path[0].state;
                }
                const lastState = path[path.length - 1].state;
                ui.updateCurrStateUI(lastState);
                fetchNextTransitions();
                syncChoreographyUI();
                return true;
            }
        } catch (e) {
            console.error("Failed to restore path from LocalStorage:", e);
        }
    }
    return false;
}
~~~~~

#### Acts 2: 调整 `DOMContentLoaded` 生命周期钩子以引入恢复流程

重写 `DOMContentLoaded` 处的挂载和启动声明，优先执行来自本地存储的状态链路恢复。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
document.addEventListener("DOMContentLoaded", () => {
    renderer = new CanvasRenderer("skate-canvas");
    initChoreography();
    initInteraction();

    // 动态同步当前 API 实际访问端点
~~~~~
~~~~~javascript.new
document.addEventListener("DOMContentLoaded", () => {
    renderer = new CanvasRenderer("skate-canvas");
    
    // 优先尝试从 LocalStorage 恢复，失败则调用 initChoreography 重新初始化
    const loaded = loadFromLocalStorage();
    if (!loaded) {
        initChoreography();
    }
    
    initInteraction();

    // 动态同步当前 API 实际访问端点
~~~~~

---

### 下一步建议
1. **交互验证**: 
   - 打开沙盒网页并执行几步滑行编排。
   - 检查 `trajectory-source` 内是否有更新。
   - 刷新网页，检查编排流、转体平衡度分析、画布轨迹是否正确复现、起始状态下拉框选中状态是否自动同步为历史首节点。
   - 点击“重置编排”，刷新网页，检查状态是否如期回到只有单一起滑用刃状态的环境。
2. **提交版本**: 验证没有功能故障后，将所有变更暂存、提交，并合并到 Git 仓库。
