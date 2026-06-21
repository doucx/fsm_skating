这是一个典型的重构后遗症。在我们将后端 `State` 重构为直接序列化为字符串（如 `"LFO"`）后，前端 `loadSearchedPathToCanvas` 函数中原有的 `${step.state.foot}${step.state.direction}${step.state.edge}` 逻辑会因为尝试访问字符串的属性而返回 `undefined`，最终拼接成 `undefinedundefinedundefined`。

我将生成一个修复计划，更新该函数的映射逻辑。

## [WIP] fix: 修复路径搜索结果载入画布时的状态字符串解析错误

### 错误分析

在之前的重构中，我们将 API 返回的 `state` 字段从对象格式（`{"foot": "L", ...}`）更改为了纯字符串格式（`"LFO"`）。

然而，`web/js/app.js` 中的 `loadSearchedPathToCanvas` 函数仍然保留了旧的解构逻辑：
```javascript
path = selectedPath.map(step => ({
    state: `${step.state.foot}${step.state.direction}${step.state.edge}`,
    move: step.move
}));
```
当 `step.state` 是字符串 `"LFO"` 时，`step.state.foot` 为 `undefined`。三个 `undefined` 拼接后就形成了用户看到的错误显示。

### 用户需求
修复从“物理路径搜索器”加载路径到主画布时，状态显示为 `undefinedundefinedundefined` 的 Bug。

### 评论
这是一个简单的回归错误。由于我们已经在整个系统中推动“状态即字符串”的规范，解决办法是让该函数具备识别并直接使用字符串的能力。

### 目标
1. 修正 `web/js/app.js` 中的 `loadSearchedPathToCanvas` 函数。
2. 确保它能正确处理字符串格式的状态，并保留对旧对象的向后兼容性（防御性编程）。

### 基本原理
在映射路径步进（step）时，判断 `step.state` 的类型。如果是字符串，直接使用；如果是对象，则执行原有的拼接逻辑。

### 标签
#intent/fix #flow/ready #priority/critical
#comp/cli #concept/ui #scope/ux #ai/instruct
#task/domain/ui
#task/object/path-loader
#task/action/bug-fix
#task/state/continue

---

### Script

#### Acts 1: 修正路径载入映射逻辑 (app.js)

修改 `web/js/app.js` 中的 `loadSearchedPathToCanvas` 函数。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
function loadSearchedPathToCanvas(idx) {
    if (!window.searchedPathsCache || !window.searchedPathsCache[idx]) return;
    const selectedPath = window.searchedPathsCache[idx];
    
    path = selectedPath.map(step => ({
        state: `${step.state.foot}${step.state.direction}${step.state.edge}`,
        move: step.move
    }));

    const startSelect = document.getElementById("start-state-select");
~~~~~
~~~~~javascript.new
function loadSearchedPathToCanvas(idx) {
    if (!window.searchedPathsCache || !window.searchedPathsCache[idx]) return;
    const selectedPath = window.searchedPathsCache[idx];
    
    path = selectedPath.map(step => ({
        state: typeof step.state === 'string' ? step.state : `${step.state.foot}${step.state.direction}${step.state.edge}`,
        move: step.move
    }));

    const startSelect = document.getElementById("start-state-select");
~~~~~

### 下一步建议
- **回归检查**：在浏览器中重新运行路径搜索，点击“载入主画布预览”，确认状态现在能正确显示为 "LFO", "RBO" 等。
- **UI 润色**：如果加载成功，可以考虑在载入时添加一个微弱的边框闪烁或 Toast 提示，增强用户感知的反馈。
