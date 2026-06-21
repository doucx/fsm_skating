我完全同意您的看法。采用方案 A，我们能够以最小的改动和最干净的方式，从底层消除这种由于数据结构非对称性导致的序列化缺陷。

我将生成一个 Quipu WIP 计划，对后端的 `State` 进行自定义序列化与反序列化重构，并同步修正前端在接收到新格式状态字符串时的处理逻辑。

## [WIP] refactor: 重构 State (用刃状态) 序列化行为以彻底根置 [object Object] 问题

### 用户需求
彻底消除前端和 API 传输层经常遇到的 `[object Object]` 或 `undefinedundefinedundefined` 序列化与数据渲染不匹配问题。通过重构后端的 Pydantic `State` 模型，使其在 API 传输边界上以原生字符串（如 `"LFO"`）的形式输入/输出，同时保持其作为对象的内部校验和推导能力。

### 评论
该重构极大简化了 FSM 系统的物理状态传输形态。相比将状态包装成字典，将其强制序列化为紧凑、不可变、唯一的简写字符串（如 `"LFO"`）更符合自然直觉，同时也精简了大量的网络负荷和前端胶水解析逻辑。

### 目标
1. **重构后端 State 模型**：引入 Pydantic 的 `@model_serializer` 和 `@model_validator`，定制 `State` 的生命周期，支持在 API 输入端自动将 3 字符的简写字符串反序列化为内部对象，并在输出端将其自动转为字符串。
2. **重构前端数据接口接收端**：修改前端 `app.js` 与 `uiController.js`，让其兼容地或优先地以纯文本形式渲染和读写来自后端的滑行状态值。
3. **验证测试包稳定性**：运行测试，确保后端的全部测试用例依然能够正常通过。

### 基本原理
利用 Pydantic v2 的内置装饰器，在不破坏 `State` 既有属性校验的前提下介入序列化管道。前端通过识别返回的状态是否为 `string`，自适应采用纯文本直接提取或降级回原有的拼装逻辑，在维持极高兼容性的同时完成这一现代化重构。

### 标签
#intent/refine #flow/ready #priority/high
#comp/engine #comp/interfaces #concept/state #scope/core #scope/api #ai/instruct
#task/domain/api
#task/object/state-serialization
#task/action/refactor
#task/state/begin

---

### Script

#### Acts 1: 重构后端模型 (models.py)

修改 `src/fsm_skating/domain/models.py`，为 `State` 模型引入自定义序列化和反序列化处理器。

~~~~~act
patch_file
src/fsm_skating/domain/models.py
~~~~~
~~~~~python.old
from typing import Dict
from pydantic import BaseModel, Field, ConfigDict


class State(BaseModel):
    """
    表示花样滑冰中的一个滑行瞬间状态。
    State = (Foot, Direction, Edge)
    """

    model_config = ConfigDict(frozen=True)

    foot: str = Field(..., pattern="^[LR]$")
    direction: str = Field(..., pattern="^[FB]$")
    edge: str = Field(..., pattern="^[OI]$")

    @classmethod
    def from_string(cls, s: str) -> "State":
        """
        从简写字符串解析状态。例如: "LFO" -> 左前外刃
        """
        s = s.strip().upper()
        if len(s) != 3:
            raise ValueError(
                f"Invalid state format: '{s}'. Must be 3 characters, e.g., 'LFO'."
            )
        return cls(foot=s[0], direction=s[1], edge=s[2])

    def __str__(self) -> str:
        return f"{self.foot}{self.direction}{self.edge}"

    def __repr__(self) -> str:
        return f"State(foot='{self.foot}', direction='{self.direction}', edge='{self.edge}')"
~~~~~
~~~~~python.new
from typing import Dict, Any
from pydantic import BaseModel, Field, ConfigDict, model_serializer, model_validator


class State(BaseModel):
    """
    表示花样滑冰中的一个滑行瞬间状态。
    State = (Foot, Direction, Edge)
    """

    model_config = ConfigDict(frozen=True)

    foot: str = Field(..., pattern="^[LR]$")
    direction: str = Field(..., pattern="^[FB]$")
    edge: str = Field(..., pattern="^[OI]$")

    @model_serializer
    def serialize_model(self) -> str:
        """
        使 Pydantic 在转 JSON 时直接输出 "LFO" 字符串，而不是 {"foot":...}
        """
        return f"{self.foot}{self.direction}{self.edge}"

    @model_validator(mode='before')
    @classmethod
    def validate_before(cls, value: Any) -> Any:
        """
        允许在输入校验前从字符串、字典或已有对象实例化
        """
        if isinstance(value, str):
            s = value.strip().upper()
            if len(s) != 3:
                raise ValueError(
                    f"Invalid state format: '{s}'. Must be 3 characters, e.g., 'LFO'."
                )
            return {"foot": s[0], "direction": s[1], "edge": s[2]}
        return value

    @classmethod
    def from_string(cls, s: str) -> "State":
        """
        从简写字符串解析状态。例如: "LFO" -> 左前外刃
        """
        s = s.strip().upper()
        if len(s) != 3:
            raise ValueError(
                f"Invalid state format: '{s}'. Must be 3 characters, e.g., 'LFO'."
            )
        return cls(foot=s[0], direction=s[1], edge=s[2])

    def __str__(self) -> str:
        return f"{self.foot}{self.direction}{self.edge}"

    def __repr__(self) -> str:
        return f"State(foot='{self.foot}', direction='{self.direction}', edge='{self.edge}')"
~~~~~

#### Acts 2: 修正前端状态解析与兼容性处理 (app.js)

更新 `web/js/app.js` 中所有直接或间接进行状态路径拼接、列表渲染的代码行，使其原生兼容和推荐使用来自后端的纯文本格式状态值。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
async function verifySequence() {
    const sequence = document.getElementById("verify-input").value;
    const output = document.getElementById("verify-result");
    if (!sequence.trim()) return;

    output.classList.remove("hidden");
    output.className = "mt-4 p-4 rounded-xl text-sm border bg-slate-900/80";
    output.innerHTML = '<p class="text-slate-400 animate-pulse">正在进行物理路径校验与动力学翻译...</p>';

    try {
        const data = await api.verifySequence(sequence);
        if (!data.valid) {
            output.className = "mt-4 p-4 rounded-xl text-sm border border-rose-950 bg-rose-950/20";
            output.innerHTML = `<p class="text-rose-400 font-semibold"><i class="fa-solid fa-circle-xmark mr-1"></i> 校验失败</p><p class="text-xs text-slate-300 mt-2">${data.error}</p>`;
        } else {
            output.className = "mt-4 p-4 rounded-xl text-sm border border-emerald-950 bg-emerald-950/10 text-slate-300 space-y-3";
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

            // 允许一键渲染 verifiedPath
            window.verifiedPathData = data.transitions.map(t => ({
                state: `${t.to_state.foot}${t.to_state.direction}${t.to_state.edge}`,
                move: t.selected_move
            }));
            window.verifiedInitialState = `${data.states[0].foot}${data.states[0].direction}${data.states[0].edge}`;
~~~~~
~~~~~javascript.new
async function verifySequence() {
    const sequence = document.getElementById("verify-input").value;
    const output = document.getElementById("verify-result");
    if (!sequence.trim()) return;

    output.classList.remove("hidden");
    output.className = "mt-4 p-4 rounded-xl text-sm border bg-slate-900/80";
    output.innerHTML = '<p class="text-slate-400 animate-pulse">正在进行物理路径校验与动力学翻译...</p>';

    try {
        const data = await api.verifySequence(sequence);
        if (!data.valid) {
            output.className = "mt-4 p-4 rounded-xl text-sm border border-rose-950 bg-rose-950/20";
            output.innerHTML = `<p class="text-rose-400 font-semibold"><i class="fa-solid fa-circle-xmark mr-1"></i> 校验失败</p><p class="text-xs text-slate-300 mt-2">${data.error}</p>`;
        } else {
            output.className = "mt-4 p-4 rounded-xl text-sm border border-emerald-950 bg-emerald-950/10 text-slate-300 space-y-3";
            let listHTML = "";
            data.transitions.forEach((t) => {
                const fromStr = typeof t.from_state === 'string' ? t.from_state : `${t.from_state.foot}${t.from_state.direction}${t.from_state.edge}`;
                const toStr = typeof t.to_state === 'string' ? t.to_state : `${t.to_state.foot}${t.to_state.direction}${t.to_state.edge}`;
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

            // 允许一键渲染 verifiedPath
            window.verifiedPathData = data.transitions.map(t => ({
                state: typeof t.to_state === 'string' ? t.to_state : `${t.to_state.foot}${t.to_state.direction}${t.to_state.edge}`,
                move: t.selected_move
            }));
            window.verifiedInitialState = typeof data.states[0] === 'string' ? data.states[0] : `${data.states[0].foot}${data.states[0].direction}${data.states[0].edge}`;
~~~~~

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
async function verifyMovesSequence() {
    const rawInput = document.getElementById("verify-input").value;
    const startState = document.getElementById("verify-start-state-select").value;
    const output = document.getElementById("verify-result");
    if (!rawInput.trim()) return;

    // 兼容空格、箭头、逗号分割
    const moveIds = rawInput.split(/->|,|\s+/).map(m => m.trim().toLowerCase()).filter(m => m.length > 0);
    if (moveIds.length === 0) return;

    output.classList.remove("hidden");
    output.className = "mt-4 p-4 rounded-xl text-sm border bg-slate-900/80";
    output.innerHTML = '<p class="text-slate-400 animate-pulse">正在进行步法动力学轨迹演化与起滑约束验证...</p>';

    try {
        const data = await api.verifyMovesSequence(moveIds, startState);
        if (!data.valid) {
            output.className = "mt-4 p-4 rounded-xl text-sm border border-rose-950 bg-rose-950/20";
            output.innerHTML = `<p class="text-rose-400 font-semibold"><i class="fa-solid fa-circle-xmark mr-1"></i> 校验失败</p><p class="text-xs text-slate-300 mt-2">${data.error}</p>`;
        } else {
            output.className = "mt-4 p-4 rounded-xl text-sm border border-emerald-950 bg-emerald-950/10 text-slate-300 space-y-3";
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

            // 渲染推导出的轨迹至主画布
            window.verifiedPathData = data.trace.map(t => ({
                state: `${t.to_state.foot}${t.to_state.direction}${t.to_state.edge}`,
                move: t.move
            }));
            const initial = `${data.trace[0].from_state.foot}${data.trace[0].from_state.direction}${data.trace[0].from_state.edge}`;
            window.verifiedInitialState = initial;
~~~~~
~~~~~javascript.new
async function verifyMovesSequence() {
    const rawInput = document.getElementById("verify-input").value;
    const startState = document.getElementById("verify-start-state-select").value;
    const output = document.getElementById("verify-result");
    if (!rawInput.trim()) return;

    // 兼容空格、箭头、逗号分割
    const moveIds = rawInput.split(/->|,|\s+/).map(m => m.trim().toLowerCase()).filter(m => m.length > 0);
    if (moveIds.length === 0) return;

    output.classList.remove("hidden");
    output.className = "mt-4 p-4 rounded-xl text-sm border bg-slate-900/80";
    output.innerHTML = '<p class="text-slate-400 animate-pulse">正在进行步法动力学轨迹演化与起滑约束验证...</p>';

    try {
        const data = await api.verifyMovesSequence(moveIds, startState);
        if (!data.valid) {
            output.className = "mt-4 p-4 rounded-xl text-sm border border-rose-950 bg-rose-950/20";
            output.innerHTML = `<p class="text-rose-400 font-semibold"><i class="fa-solid fa-circle-xmark mr-1"></i> 校验失败</p><p class="text-xs text-slate-300 mt-2">${data.error}</p>`;
        } else {
            output.className = "mt-4 p-4 rounded-xl text-sm border border-emerald-950 bg-emerald-950/10 text-slate-300 space-y-3";
            let listHTML = "";
            data.trace.forEach((step) => {
                const fromStr = typeof step.from_state === 'string' ? step.from_state : `${step.from_state.foot}${step.from_state.direction}${step.from_state.edge}`;
                const toStr = typeof step.to_state === 'string' ? step.to_state : `${step.to_state.foot}${step.to_state.direction}${step.to_state.edge}`;
                const rot = step.move.rotation_dir ? ` [${step.move.rotation_dir === 'CW' ? '顺时针' : '逆时针'}]` : "";
                listHTML += `
                    <div class="text-xs pl-3 border-l border-emerald-800">
                        <span class="font-bold text-slate-200">${fromStr} ──▶ ${toStr}</span><br/>
                        <span class="text-emerald-400">${step.move.name}${rot}</span> (难度: ${step.move.difficulty})
                    </div>
                `;
            });

            // 渲染推导出的轨迹至主画布
            window.verifiedPathData = data.trace.map(t => ({
                state: typeof t.to_state === 'string' ? t.to_state : `${t.to_state.foot}${t.to_state.direction}${t.to_state.edge}`,
                move: t.move
            }));
            const initial = typeof data.trace[0].from_state === 'string' ? data.trace[0].from_state : `${data.trace[0].from_state.foot}${data.trace[0].from_state.direction}${data.trace[0].from_state.edge}`;
            window.verifiedInitialState = initial;
~~~~~

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
async function generateSequence() {
    const steps = document.getElementById("gen-steps").value;
    const maxDiff = document.getElementById("gen-diff").value;
    const selectState = document.getElementById("start-state-select").value;

    try {
        const data = await api.generateSequence(parseInt(steps), parseInt(maxDiff), selectState);
        path = [];
        data.forEach((step) => {
            const stateStr = `${step.state.foot}${step.state.direction}${step.state.edge}`;
            path.push({
                state: stateStr,
                move: step.move
            });
        });
~~~~~
~~~~~javascript.new
async function generateSequence() {
    const steps = document.getElementById("gen-steps").value;
    const maxDiff = document.getElementById("gen-diff").value;
    const selectState = document.getElementById("start-state-select").value;

    try {
        const data = await api.generateSequence(parseInt(steps), parseInt(maxDiff), selectState);
        path = [];
        data.forEach((step) => {
            const stateStr = typeof step.state === 'string' ? step.state : `${step.state.foot}${step.state.direction}${step.state.edge}`;
            path.push({
                state: stateStr,
                move: step.move
            });
        });
~~~~~

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
function chooseNextMove(nextStateObj, moveObj) {
    path[path.length - 1].move = moveObj;
    const nextStateStr = `${nextStateObj.foot}${nextStateObj.direction}${nextStateObj.edge}`;
    path.push({ state: nextStateStr, move: null });

    ui.updateCurrStateUI(nextStateStr);
    fetchNextTransitions();
    syncChoreographyUI();
}
~~~~~
~~~~~javascript.new
function chooseNextMove(nextStateObj, moveObj) {
    path[path.length - 1].move = moveObj;
    const nextStateStr = typeof nextStateObj === 'string' ? nextStateObj : `${nextStateObj.foot}${nextStateObj.direction}${nextStateObj.edge}`;
    path.push({ state: nextStateStr, move: null });

    ui.updateCurrStateUI(nextStateStr);
    fetchNextTransitions();
    syncChoreographyUI();
}
~~~~~

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
async function searchPaths() {
    const startState = document.getElementById("search-start-state").value;
    const endState = document.getElementById("search-end-state").value;
    const interCount = document.getElementById("search-inter-count").value;
    const maxDiff = document.getElementById("search-max-diff").value;
    const maxResults = document.getElementById("search-max-results").value;

    const container = document.getElementById("search-results-container");
    const resultsDiv = document.getElementById("search-results");

    container.classList.remove("hidden");
    resultsDiv.innerHTML = '<p class="text-xs text-slate-500 animate-pulse"><i class="fa-solid fa-spinner fa-spin mr-1.5"></i>正在利用 DFS 穷举物理路径...</p>';

    try {
        const paths = await api.searchPaths(startState, endState, interCount, maxDiff, maxResults);
        
        if (paths.length === 0) {
            resultsDiv.innerHTML = '<p class="text-xs text-rose-400/80 p-2 border border-rose-950 bg-rose-950/20 rounded-lg">⚠️ 未检索到任何合规路径！请尝试改变起止用刃、调整间隔数或放宽难度限制。</p>';
            return;
        }

        resultsDiv.innerHTML = "";
        window.searchedPathsCache = paths;

        paths.forEach((p, idx) => {
            const seqStr = p.map(step => `${step.state.foot}${step.state.direction}${step.state.edge}`).join(" ──▶ ");
~~~~~
~~~~~javascript.new
async function searchPaths() {
    const startState = document.getElementById("search-start-state").value;
    const endState = document.getElementById("search-end-state").value;
    const interCount = document.getElementById("search-inter-count").value;
    const maxDiff = document.getElementById("search-max-diff").value;
    const maxResults = document.getElementById("search-max-results").value;

    const container = document.getElementById("search-results-container");
    const resultsDiv = document.getElementById("search-results");

    container.classList.remove("hidden");
    resultsDiv.innerHTML = '<p class="text-xs text-slate-500 animate-pulse"><i class="fa-solid fa-spinner fa-spin mr-1.5"></i>正在利用 DFS 穷举物理路径...</p>';

    try {
        const paths = await api.searchPaths(startState, endState, interCount, maxDiff, maxResults);
        
        if (paths.length === 0) {
            resultsDiv.innerHTML = '<p class="text-xs text-rose-400/80 p-2 border border-rose-950 bg-rose-950/20 rounded-lg">⚠️ 未检索到任何合规路径！请尝试改变起止用刃、调整间隔数或放宽难度限制。</p>';
            return;
        }

        resultsDiv.innerHTML = "";
        window.searchedPathsCache = paths;

        paths.forEach((p, idx) => {
            const seqStr = p.map(step => typeof step.state === 'string' ? step.state : `${step.state.foot}${step.state.direction}${step.state.edge}`).join(" ──▶ ");
~~~~~

#### Acts 3: 修正选项分支渲染的文本格式 (uiController.js)

修改 `web/js/uiController.js`，保证在引擎推荐的可选项分支中，能够正确提取目标状态。

~~~~~act
patch_file
web/js/uiController.js
~~~~~
~~~~~javascript.old
export function renderTransitionOptions(currState, options, onChoose) {
    const container = document.getElementById("transition-options");
    container.innerHTML = "";

    options.forEach((opt) => {
        const next = opt.target_state;
        const move = opt.move;
        const rotDir = move.rotation_dir;
        let rotBadge = "";
        if (rotDir === "CW") {
            rotBadge = '<span class="text-[10px] bg-sky-950 text-sky-300 border border-sky-800 px-1.5 py-0.5 rounded-md ml-2">↻ 顺旋转</span>';
        } else if (rotDir === "CCW") {
            rotBadge = '<span class="text-[10px] bg-teal-950 text-teal-300 border border-teal-800 px-1.5 py-0.5 rounded-md ml-2">↺ 逆旋转</span>';
        }

        const item = document.createElement("button");
        item.className = "w-full text-left bg-slate-800/40 hover:bg-slate-700/60 border border-slate-700/60 rounded-xl p-3 flex justify-between items-center transition group";
        item.onclick = () => onChoose(next, move);
        item.innerHTML = `
            <div>
                <span class="font-bold text-slate-200 group-hover:text-sky-300 transition tracking-wider mr-2">${currState} ──▶ ${next.foot}${next.direction}${next.edge}</span>
                ${rotBadge}
                <div class="text-xs text-slate-400 mt-1">${move.name}</div>
            </div>
            <div class="text-right">
                <span class="text-xs font-semibold px-2 py-1 rounded bg-slate-900 border border-slate-700/80 text-sky-400">难度: ${move.difficulty}</span>
            </div>
        `;
        container.appendChild(item);
    });
}
~~~~~
~~~~~javascript.new
export function renderTransitionOptions(currState, options, onChoose) {
    const container = document.getElementById("transition-options");
    container.innerHTML = "";

    options.forEach((opt) => {
        const next = opt.target_state;
        const move = opt.move;
        const rotDir = move.rotation_dir;
        let rotBadge = "";
        if (rotDir === "CW") {
            rotBadge = '<span class="text-[10px] bg-sky-950 text-sky-300 border border-sky-800 px-1.5 py-0.5 rounded-md ml-2">↻ 顺旋转</span>';
        } else if (rotDir === "CCW") {
            rotBadge = '<span class="text-[10px] bg-teal-950 text-teal-300 border border-teal-800 px-1.5 py-0.5 rounded-md ml-2">↺ 逆旋转</span>';
        }

        const nextStr = typeof next === 'string' ? next : `${next.foot}${next.direction}${next.edge}`;

        const item = document.createElement("button");
        item.className = "w-full text-left bg-slate-800/40 hover:bg-slate-700/60 border border-slate-700/60 rounded-xl p-3 flex justify-between items-center transition group";
        item.onclick = () => onChoose(next, move);
        item.innerHTML = `
            <div>
                <span class="font-bold text-slate-200 group-hover:text-sky-300 transition tracking-wider mr-2">${currState} ──▶ ${nextStr}</span>
                ${rotBadge}
                <div class="text-xs text-slate-400 mt-1">${move.name}</div>
            </div>
            <div class="text-right">
                <span class="text-xs font-semibold px-2 py-1 rounded bg-slate-900 border border-slate-700/80 text-sky-400">难度: ${move.difficulty}</span>
            </div>
        `;
        container.appendChild(item);
    });
}
~~~~~

### 下一步建议
* **启动与联合测试**：通过执行 `uv run fsm-skating-web` 启动沙盒服务器，在浏览器中测试“DFS惯性轨迹自动生成”、“一键检索可行路径”等 API，确认原本频繁产生 `[object Object]` 的报错已被连根拔起。
* **数据格式审查**：可以检查其他涉及的外部实体和子系统是否已一致地将 `"LFO"` 视为唯一的物理状态代表。
