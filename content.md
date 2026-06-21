分析完全正确，这两处问题本质上属于同一个连锁故障。

---

## [WIP] fix: 修复路径检索结果的状态序列对象序列化错误

### 错误分析

**1. 状态序列显示为 `[object Object]` 的根源**:
FastAPI 后端在 `/api/search` 端点返回的 JSON 中，每个 `GeneratedStep` 的 `state` 属性不是一个单纯的字符串，而是一个包含 `{foot, direction, edge}` 的 JSON 对象。
所以在前端 `searchPaths` 函数中：
```javascript
const seqStr = p.map(step => step.state).join(" ──▶ ");
```
由于 `step.state` 是一个 JavaScript 对象，直接进行字符串拼接时被强制转型为了 `"[object Object]"`。

**2. 动力学引擎推荐分支报错 `network 故障` 的根源**:
由于我们在上一步加载搜索路径至画布时，错误地直接将 `step.state` 这个原始的 Pydantic 字典对象直接赋值给了 `path` 状态数组的 `state`：
```javascript
path = selectedPath.map(step => ({
    state: step.state, // 此时 state 变成了一个 Object 
    move: step.move
}));
```
随后当触发 `fetchNextTransitions()` 时，代码尝试使用 `path` 尾端的状态去请求后续动作候选：
```javascript
const currState = path[path.length - 1].state; // currState 变为了 [object Object]
const options = await api.fetchTransitions(currState, maxDiff);
```
发送的请求变成了 `GET /api/transitions/[object Object]?max_difficulty=...`。
后端在路由路径解析中无法将 `"[object Object]"` 反序列化为有效的用刃状态，直接返回了 `400 / 422` 错误，导致前端 Promise 抛出异常并触发了 `network 故障` 警告。

**3. 解决方案**:
在 `searchPaths` 路线图拼接和 `loadSearchedPathToCanvas` 数据装载时，将 `step.state` 格式化为标准的 3 字符简写字符串 `${step.state.foot}${step.state.direction}${step.state.edge}`（例如 `"LFO"`, `"RFI"`）。

### 用户需求
修复由于接口反序列化数据类型不匹配引起的画布加载和推荐引擎推荐阻断问题。

### 评论
该修复可以彻底解决前后端数据结构边界不统一导致的状态污染。保持 `path` 全局变量中状态简写格式（如 `"LFO"`）的纯净性，是系统高容错运行的必要基础。

### 目标
1. 修正 `web/js/app.js` 中的 `searchPaths()` 路径简写拼装，将其从 `[object Object]` 恢复为正常的用刃状态链条。
2. 修正 `loadSearchedPathToCanvas()` 数据序列装配，确保装填至 `path` 变量的 `state` 始终是规范的 3 位字符字符串。
3. 自动同步清理 LocalStorage 中已被污染的 `fsm_skating_path` 临时缓存。

### 基本原理
前端的状态简写（如 `"LFO"`, `"RBO"`) 在画布绘制、API 转移查询等诸多核心流程中被作为主键。通过在请求响应边界处拦截并解包 Pydantic 状态字典，将其组装成单字符串格式，从而维护了全局状态的强一致性。

### 标签
#intent/fix #flow/ready #priority/high #comp/interfaces #concept/ui #scope/ux #ai/refine #task/domain/ui #task/object/js-data-binding #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 修正 `app.js` 路径搜索与画布载入中的状态解析逻辑

我们将更新 `searchPaths` 中的字符串映射逻辑与 `loadSearchedPathToCanvas` 的解包拼装逻辑。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
        resultsDiv.innerHTML = "";
        window.searchedPathsCache = paths;

        paths.forEach((p, idx) => {
            const seqStr = p.map(step => step.state).join(" ──▶ ");
            const totalDiff = p.reduce((sum, step) => sum + (step.move ? step.move.difficulty : 0), 0);
            
            const movesList = p
                .filter(step => step.move)
                .map(step => `<span class="text-[10px] bg-slate-850 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700/50">${step.move.name}</span>`)
                .join(" ");
~~~~~
~~~~~javascript.new
        resultsDiv.innerHTML = "";
        window.searchedPathsCache = paths;

        paths.forEach((p, idx) => {
            const seqStr = p.map(step => `${step.state.foot}${step.state.direction}${step.state.edge}`).join(" ──▶ ");
            const totalDiff = p.reduce((sum, step) => sum + (step.move ? step.move.difficulty : 0), 0);
            
            const movesList = p
                .filter(step => step.move)
                .map(step => `<span class="text-[10px] bg-slate-850 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700/50">${step.move.name}</span>`)
                .join(" ");
~~~~~

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
function loadSearchedPathToCanvas(idx) {
    if (!window.searchedPathsCache || !window.searchedPathsCache[idx]) return;
    const selectedPath = window.searchedPathsCache[idx];
    
    path = selectedPath.map(step => ({
        state: step.state,
        move: step.move
    }));

    const startSelect = document.getElementById("start-state-select");
~~~~~
~~~~~javascript.new
function loadSearchedPathToCanvas(idx) {
    if (!window.searchedPathsCache || !window.searchedPathsCache[idx]) return;
    const selectedPath = window.searchedPathsCache[idx];
    
    path = selectedPath.map(step => ({
        state: `${step.state.foot}${step.state.direction}${step.state.edge}`,
        move: step.move
    }));

    const startSelect = document.getElementById("start-state-select");
~~~~~

---

### 下一步建议
1. **浏览器重试**：打开浏览器的控制台（F12 -> Console），执行一次 `localStorage.clear()` 清空先前由于污染写入的遗留数据。
2. **刷新页面并重试**：刷新页面（F5），打开右侧“4. 物理路径搜索器”，设定好参数并点击检索。此时你可以观察到检索结果已恢复为优美的 `RFO ──▶ LFO ──▶ ...` 链路。
3. **点击一键载入画布**：点击任一路径底部的“载入主画布预览”，主画布和左下角的“🐾 已规划轨迹流向”都应该能同步刷新，且动力学推荐引擎也不会再发生 Network 故障！
