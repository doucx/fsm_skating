我们现在开始执行 **第四阶段：前端 UI 与多模式支持适配**。

在这个阶段，我们将全力升级前端网页沙盒界面，完美支持状态流和动作流的双模式自由切换校验，并且提供**“一键载入画布”**的高级交互功能：
1. **接口网络封装**：在 `web/js/api.js` 中新增对第二阶段接口 `/api/verify/moves` 的网络适配。
2. **校验面板 UI 重构**：在 `web/index.html` 中引入状态/步法双校验模式切换 Tab，并为步法流提供可选的“初始状态”下拉菜单。
3. **推演与歧义展现逻辑**：在 `web/js/app.js` 中，重写 `verifySequence` 并实现 `verifyMovesSequence`，不仅能够以明显的标签渲染歧义路径（DAG 候选动作），还支持一键将合规推演出来的轨迹渲染回 2D 画布中进行可视化演示。

以下是具体的实施计划。

## [WIP] feat: 升级前端沙盒 UI 以完美支持双模式校验与合规轨迹一键载入画布

### 用户需求
前端需要支持在同一校验模块中自由切换“用刃状态链（State-driven）”与“步法动作链（Move-driven）”校验。验证通过的合规链路，应该允许用户点击直接载入主画布，从而进行动态图形渲染与多样性分析。当出现歧义步骤时，应在界面上醒目展示备选的多重路径动作候选。

### 评论
这是一次极其出色的人机交互体验（UX/DX）跨越。它让用户在验证一长串冰面滑行轨迹后，无缝加载回主编辑沙盒进行后续扩展编排，充分发挥了 FSM 模型的双向对偶推理优势。

### 目标
1. 升级 `/web/js/api.js`，支持网络请求无状态动作链校验。
2. 重塑 `/web/index.html` 序列校验器组件，在视觉层划分状态/步法卡片。
3. 升级 `/web/js/app.js`，增加歧义候选在列表中的展现，并增加一键注入画布动作 `loadVerifiedPathToCanvas`。

### 基本原理
前端利用 `let verifyMode = 'state'` 变量维系当前校验面板所属模式：
1. **状态流校验**：调用原有接口，若遇到某一环节 matching candidates 数量超过 1，表明出现歧义路径（有多重冰面解），将其打印在步骤详情中。
2. **步法流校验**：将输入按照空格、英文箭头、逗号切分为动作 ID 数组，与可选的起始用刃一同打包请求。
3. **轨迹画布共享**：不论何种模式校验成功，后端返回的数据本质都记录了滑行细节。前端全局挂载 `window.verifiedPathData`，用户一旦点击“载入画布”，程序清除原有数据，将校验数据灌注进画布状态，重新触发现场绘制与统计指标重新洗牌计算。

### 标签
#intent/build #flow/ready #priority/high
#comp/interfaces #concept/ui #scope/ux #scope/dx
#ai/instruct
#task/domain/ui
#task/object/double-mode-verifier-ui
#task/action/implementation
#task/state/continue #task/status/active

---

### Script

#### Acts 1: 在前端网络封装中增加步法链校验

我们修改 `web/js/api.js`，增加向 `/api/verify/moves` 投递动作校验请求的封装方法。

~~~~~act
patch_file
web/js/api.js
~~~~~
~~~~~javascript.old
export async function generateSequence(steps, maxDifficulty, startState) {
    const res = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            steps,
            max_difficulty: maxDifficulty,
            start_state: startState
        })
    });
    if (!res.ok) {
        const detail = await res.json();
        throw new Error(detail.detail || "自动规划算法未给出有效方案");
    }
    return await res.json();
}
~~~~~
~~~~~javascript.new
export async function generateSequence(steps, maxDifficulty, startState) {
    const res = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            steps,
            max_difficulty: maxDifficulty,
            start_state: startState
        })
    });
    if (!res.ok) {
        const detail = await res.json();
        throw new Error(detail.detail || "自动规划算法未给出有效方案");
    }
    return await res.json();
}

export async function verifyMovesSequence(moveIds, startState) {
    const res = await fetch(`${API_BASE}/verify/moves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            move_ids: moveIds,
            start_state: startState || null
        })
    });
    if (!res.ok) {
        const detail = await res.json();
        throw new Error(detail.detail || "步法流序列校验失败");
    }
    return await res.json();
}
~~~~~

#### Acts 2: 改造 HTML 校验器界面，引入双模式验证框架

我们修改 `/web/index.html` 中的“物理步法序列校验器”卡片，追加状态校验与步法校验两套可切换视图和可选起始条件。

~~~~~act
patch_file
web/index.html
~~~~~
~~~~~html.old
                <!-- 序列验证模块 -->
                <div class="ice-card rounded-2xl p-6">
                    <h2 class="text-lg font-semibold flex items-center text-emerald-400 mb-3"><i class="fa-solid fa-spell-check mr-2"></i> 2. 物理步法序列校验器</h2>
                    <p class="text-xs text-slate-400 mb-3">支持对任意输入的边缘状态转移序列进行分析翻译。</p>
                    <div class="space-y-3">
                        <input id="verify-input" type="text" placeholder="例: LFO -> LFI -> RFI -> RBO" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 text-slate-200">
                        <button onclick="verifySequence()" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg text-sm transition shadow-lg shadow-emerald-950/20"><i class="fa-solid fa-magnifying-glass mr-1"></i> 进行验证解析</button>
                    </div>
                    <div id="verify-result" class="mt-4 hidden">
                        <!-- 验证结果展示 -->
                    </div>
                </div>
~~~~~
~~~~~html.new
                <!-- 序列验证模块 -->
                <div class="ice-card rounded-2xl p-6">
                    <h2 class="text-lg font-semibold flex items-center text-emerald-400 mb-3"><i class="fa-solid fa-spell-check mr-2"></i> 2. 物理步法序列校验器</h2>
                    
                    <!-- 模式切换 -->
                    <div class="flex space-x-2 mb-4">
                        <button id="btn-verify-mode-state" onclick="switchVerifyMode('state')" class="flex-1 py-1.5 text-xs font-semibold rounded bg-emerald-600 text-white border border-emerald-500 transition">状态流校验</button>
                        <button id="btn-verify-mode-move" onclick="switchVerifyMode('move')" class="flex-1 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 border border-slate-700/60 hover:bg-slate-700/60 transition">步法流校验</button>
                    </div>

                    <!-- 可选的起始用刃状态（仅步法流可用） -->
                    <div id="verify-start-state-container" class="hidden mb-3">
                        <label class="block text-[10px] text-slate-400 mb-1">起始用刃状态 (可选，默认自动推导)</label>
                        <select id="verify-start-state-select" class="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-emerald-500">
                            <option value="">自动推导</option>
                            <option value="LFO">LFO - 左前外刃</option>
                            <option value="LFI">LFI - 左前内刃</option>
                            <option value="LBO">LBO - 左后外刃</option>
                            <option value="LBI">LBI - 左后内刃</option>
                            <option value="RFO">RFO - 右前外刃</option>
                            <option value="RFI">RFI - 右前内刃</option>
                            <option value="RBO">RBO - 右后外刃</option>
                            <option value="RBI">RBI - 右后内刃</option>
                        </select>
                    </div>

                    <p id="verify-desc" class="text-xs text-slate-400 mb-3">支持对任意输入的边缘状态转移序列进行分析翻译。</p>
                    <div class="space-y-3">
                        <input id="verify-input" type="text" placeholder="例: LFO -> LFI -> RFI -> RBO" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 text-slate-200">
                        <button onclick="handleVerify()" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg text-sm transition shadow-lg shadow-emerald-950/20"><i class="fa-solid fa-magnifying-glass mr-1"></i> 进行验证解析</button>
                    </div>
                    <div id="verify-result" class="mt-4 hidden">
                        <!-- 验证结果展示 -->
                    </div>
                </div>
~~~~~

#### Acts 3: 在 `app.js` 中全局注册控制方法并重构校验控制回路

我们修改 `web/js/app.js`。首先扩充其 `DOMContentLoaded` 入口的方法导出项，然后替换原有的 `verifySequence` 并新增状态演算流、模式切换器及画布共享渲染机制。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
    // 显式挂载动作方法至 window 作用域，确保完美支持 HTML 原生 inline onClick / onChange
    window.initChoreography = initChoreography;
    window.resetChoreography = resetChoreography;
    window.fetchNextTransitions = fetchNextTransitions;
    window.undoMove = undoMove;
    window.verifySequence = verifySequence;
    window.generateSequence = generateSequence;
    window.toggleFullscreen = toggleFullscreen;
    window.chooseNextMove = chooseNextMove;
});
~~~~~
~~~~~javascript.new
    // 显式挂载动作方法至 window 作用域，确保完美支持 HTML 原生 inline onClick / onChange
    window.initChoreography = initChoreography;
    window.resetChoreography = resetChoreography;
    window.fetchNextTransitions = fetchNextTransitions;
    window.undoMove = undoMove;
    window.verifySequence = verifySequence;
    window.verifyMovesSequence = verifyMovesSequence;
    window.handleVerify = handleVerify;
    window.switchVerifyMode = switchVerifyMode;
    window.loadVerifiedPathToCanvas = loadVerifiedPathToCanvas;
    window.generateSequence = generateSequence;
    window.toggleFullscreen = toggleFullscreen;
    window.chooseNextMove = chooseNextMove;
});
~~~~~

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
                const rot = t.selected_move.rotation_dir ? ` [${t.selected_move.rotation_dir === 'CW' ? '顺时针' : '逆时针'}]` : "";
                listHTML += `
                    <div class="text-xs pl-3 border-l border-emerald-800">
                        <span class="font-bold text-slate-200">${t.from_state} ──▶ ${t.to_state}</span><br/>
                        <span class="text-emerald-400">${t.selected_move.name}${rot}</span> (难度: ${t.selected_move.difficulty})
                    </div>
                `;
            });

            output.innerHTML = `
                <p class="text-emerald-400 font-bold flex items-center"><i class="fa-solid fa-circle-check mr-1"></i> 验证通过！完全符合动力学规范！</p>
                <p class="text-xs text-slate-400">总设计难度积分: <strong class="text-slate-200 text-sm">${data.total_difficulty}</strong></p>
                <div class="space-y-2 mt-2">${listHTML}</div>
            `;
        }
    } catch (err) {
        output.innerHTML = `<p class="text-xs text-rose-400">通信网络故障: ${err.message}</p>`;
    }
}
~~~~~
~~~~~javascript.new
let verifyMode = 'state';

function switchVerifyMode(mode) {
    verifyMode = mode;
    const btnState = document.getElementById("btn-verify-mode-state");
    const btnMove = document.getElementById("btn-verify-mode-move");
    const startStateContainer = document.getElementById("verify-start-state-container");
    const input = document.getElementById("verify-input");
    const desc = document.getElementById("verify-desc");
    const output = document.getElementById("verify-result");

    output.classList.add("hidden");

    if (mode === 'state') {
        btnState.className = "flex-1 py-1.5 text-xs font-semibold rounded bg-emerald-600 text-white border border-emerald-500 transition";
        btnMove.className = "flex-1 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 border border-slate-700/60 hover:bg-slate-700/60 transition";
        startStateContainer.classList.add("hidden");
        input.placeholder = "例: LFO -> LFI -> RFI -> RBO";
        desc.innerText = "支持对任意输入的边缘状态转移序列进行分析翻译。";
    } else {
        btnState.className = "flex-1 py-1.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 border border-slate-700/60 hover:bg-slate-700/60 transition";
        btnMove.className = "flex-1 py-1.5 text-xs font-semibold rounded bg-emerald-600 text-white border border-emerald-500 transition";
        startStateContainer.classList.remove("hidden");
        input.placeholder = "例: stroke -> forward_inside_three_turn";
        desc.innerText = "输入一组纯步法动作 ID（逗号或空格、英文箭头隔开），自动推导演化轨迹。";
    }
}

async function handleVerify() {
    if (verifyMode === 'state') {
        await verifySequence();
    } else {
        await verifyMovesSequence();
    }
}

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

            // 允许一键渲染 verifiedPath
            window.verifiedPathData = data.transitions.map(t => ({
                state: `${t.to_state.foot}${t.to_state.direction}${t.to_state.edge}`,
                move: t.selected_move
            }));
            window.verifiedInitialState = `${data.states[0].foot}${data.states[0].direction}${data.states[0].edge}`;

            const loadBtnHTML = `
                <button onclick="loadVerifiedPathToCanvas()" class="mt-2 w-full py-1 bg-sky-950 hover:bg-sky-900 border border-sky-800 rounded-md text-xs text-sky-300 transition flex items-center justify-center">
                    <i class="fa-solid fa-chart-line mr-1"></i> 将此验证轨迹载入主画布预览
                </button>
            `;

            output.innerHTML = `
                <p class="text-emerald-400 font-bold flex items-center"><i class="fa-solid fa-circle-check mr-1"></i> 验证通过！完全符合动力学规范！</p>
                <p class="text-xs text-slate-400">总设计难度积分: <strong class="text-slate-200 text-sm">${data.total_difficulty}</strong></p>
                <div class="space-y-2 mt-2">${listHTML}</div>
                ${loadBtnHTML}
            `;
        }
    } catch (err) {
        output.innerHTML = `<p class="text-xs text-rose-400">通信网络故障: ${err.message}</p>`;
    }
}

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
                const rot = step.move.rotation_dir ? ` [${step.move.rotation_dir === 'CW' ? '顺时针' : '逆时针'}]` : "";
                listHTML += `
                    <div class="text-xs pl-3 border-l border-emerald-800">
                        <span class="font-bold text-slate-200">${step.from_state} ──▶ ${step.to_state}</span><br/>
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

            const loadBtnHTML = `
                <button onclick="loadVerifiedPathToCanvas()" class="mt-2 w-full py-1 bg-sky-950 hover:bg-sky-900 border border-sky-800 rounded-md text-xs text-sky-300 transition flex items-center justify-center">
                    <i class="fa-solid fa-chart-line mr-1"></i> 将此演算轨迹载入主画布预览
                </button>
            `;

            output.innerHTML = `
                <p class="text-emerald-400 font-bold flex items-center"><i class="fa-solid fa-circle-check mr-1"></i> 验证并演算成功！</p>
                <p class="text-xs text-slate-400">推导总设计难度分: <strong class="text-slate-200 text-sm">${data.total_difficulty}</strong></p>
                <div class="space-y-2 mt-2">${listHTML}</div>
                ${loadBtnHTML}
            `;
        }
    } catch (err) {
        output.className = "mt-4 p-4 rounded-xl text-sm border border-rose-950 bg-rose-950/20";
        output.innerHTML = `<p class="text-xs text-rose-400">校验失败: ${err.message}</p>`;
    }
}

function loadVerifiedPathToCanvas() {
    if (!window.verifiedPathData || !window.verifiedInitialState) return;
    path = [{ state: window.verifiedInitialState, move: null }];
    window.verifiedPathData.forEach(step => {
        path[path.length - 1].move = step.move;
        path.push({ state: step.state, move: null });
    });
    ui.updateCurrStateUI(path[path.length - 1].state);
    fetchNextTransitions();
    ui.updateStats(path, undoMove);
    drawPath();
}
~~~~~

### 下一步建议
1. **启动应用并联调**：使用运行命令启动 API 服务和 Web 端服务，在页面中尝试切换“步法流校验”并输入例如 `stroke -> forward_inside_three_turn` 进行推算。
2. **开展第五阶段**：编写系统与前端的多模式对偶联调报告，并在确认无回归问题后将前端的所有改动提交并封版。如果你准备好进行下一步，我们可以直接安排最后阶段的联调工作。
