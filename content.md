这是一个旨在为花样滑冰 FSM 步法编排沙盒系统增加“轨迹流源码导入/导出功能与 JSON 源代码编辑器”的完整实施计划。该编辑器将编排的整个状态路径物理序列化为优雅的 JSON 数据，并赋予其逆向动力学装配解析能力。

## [WIP] feat: 增加轨迹流源码导入/导出功能与 JSON 源代码编辑器

### 用户需求
需要一个可编辑的文本框来展示当前沙盒轨迹的“源码”，右侧需要有复制和导入按钮。支持用户通过编辑、粘贴或复制这段代码，在不同的浏览器、设备甚至他人之间传递并实时还原冰面滑痕。

### 评论
该功能的加入显著增强了 FSM Skating 编排工具在多设备、多用户之间的可共享性和协作性。通过借助后端 `/api/verify` 对状态变化进行动力学诊断，再结合候选动作库的多重配对组装，极大保证了数据离线与热插拔式复苏的精准度。

### 目标
1. 在 `web/index.html` 的已规划轨迹下方，嵌入源码编辑器组件、复制按钮和导入按钮。
2. 在 `web/js/app.js` 中开发 `updateTrajectorySourceUI`，实现当前编排序列对 JSON 的实时双向序列化同步。
3. 实现 `copyTrajectorySource` 剪贴板复制及动态绿色高亮成功态反馈。
4. 实现 `importTrajectorySource` 反序列化、后端状态逆向动力学解析以及主画布、统计栏层面的重绘和联动。

### 基本原理
1. **导出**：当用户在沙盒中进行加步、回撤、或者一键生成动作时，程序将当前的 `path`（包含 `state` 和 `move` 实体）序列化为纯净的 `[{"state": "...", "move_id": "..."}]` 物理数据并同步填充到 `#trajectory-source` 中。
2. **导入**：解析用户输入的 JSON 数组。提取各步的边缘状态并使用 `->` 拼接，通过 `/api/verify` 接口进行快速的前置动力学校验。校验通过后，遍历并提取每一阶段状态机中所有合法的 `candidate_moves` 动作库，将用户期望的 `move_id` 进行 O(1) 检索配对，以此装配恢复旋转、难度及圆弧等所有实体特征，重建路径。

### 标签
#intent/build #flow/ready #priority/high #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/trajectory-source #task/action/implementation #task/state/begin #task/status/active

---

### Script

#### Acts 1: 环境及文件就绪确认

确认当前工作根目录，并验证需要修改的两个主要 Web 前端文件存在。

~~~~~act
check_cwd_match
/home/doucx/Documents/Projects/fsm_skating
~~~~~

~~~~~act
check_files_exist
web/index.html
web/js/app.js
~~~~~

#### Acts 2: 在 `web/index.html` 中注入“📦 轨迹流源代码（支持导入/导出）”组件

我们在“已规划轨迹流向”模块的下方注入全新的源代码文本编辑框以及其控制按钮。

~~~~~act
patch_file
web/index.html
~~~~~
~~~~~html.old
                    <!-- 已编排链路可视化 -->
                    <div class="mb-6">
                        <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">🐾 已规划轨迹流向</h3>
                        <div class="bg-slate-900/60 rounded-xl p-4 min-h-[64px] flex flex-wrap items-center gap-2 border border-slate-800" id="choreography-trail">
                            <!-- 动态追加 -->
                        </div>
                    </div>

                    <!-- 候选分支选择 -->
                    <div>
                        <h3 class="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-3">⬇️ FSM 动力学引擎推荐分支 (已排序)</h3>
~~~~~
~~~~~html.new
                    <!-- 已编排链路可视化 -->
                    <div class="mb-6">
                        <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">🐾 已规划轨迹流向</h3>
                        <div class="bg-slate-900/60 rounded-xl p-4 min-h-[64px] flex flex-wrap items-center gap-2 border border-slate-800" id="choreography-trail">
                            <!-- 动态追加 -->
                        </div>
                    </div>

                    <!-- 📦 轨迹流源代码（支持导入/导出） -->
                    <div class="mb-6">
                        <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex justify-between items-center">
                            <span>📦 轨迹流源代码（支持导入/导出）</span>
                        </h3>
                        <div class="flex space-x-2">
                            <textarea id="trajectory-source" rows="3" class="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs font-mono text-emerald-400 outline-none focus:border-sky-500" placeholder='[{"state": "LFO", "move_id": null}]'></textarea>
                            <div class="flex flex-col space-y-2 justify-center">
                                <button id="btn-copy-source" onclick="copyTrajectorySource()" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 transition flex items-center justify-center space-x-1 min-w-[80px]">
                                    <i class="fa-solid fa-copy"></i>
                                    <span>复制</span>
                                </button>
                                <button onclick="importTrajectorySource()" class="px-3 py-2 bg-sky-950 hover:bg-sky-900 border border-sky-800 rounded-lg text-xs text-sky-300 transition flex items-center justify-center space-x-1 min-w-[80px]">
                                    <i class="fa-solid fa-file-import"></i>
                                    <span>导入</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- 候选分支选择 -->
                    <div>
                        <h3 class="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-3">⬇️ FSM 动力学引擎推荐分支 (已排序)</h3>
~~~~~

#### Acts 3: 在 `web/js/app.js` 中挂载并同步生命周期，并增加核心序列化和逆向推导方法

我们需要在 `DOMContentLoaded` 中挂载新增的 `copyTrajectorySource` 与 `importTrajectorySource`，并为所有会修改全局路径 `path` 的五个动作模块（初始化、增加步骤、撤回步骤、加载验证路径、一键随机规划路径）加上实时序列化同步。最后在文件末尾实现辅助与核心演算函数。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
document.addEventListener("DOMContentLoaded", () => {
    renderer = new CanvasRenderer("skate-canvas");
    initChoreography();
    initInteraction();

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

function initChoreography() {
    const startState = document.getElementById("start-state-select").value;
    path = [{ state: startState, move: null }];
    ui.updateCurrStateUI(startState);
    fetchNextTransitions();
    ui.updateStats(path, undoMove);
    drawPath(); // 保证起始滑跑状态建立时，第一段滑行弧线就被立即绘制出来
}

function resetChoreography() {
    renderer.resetViewport(); // 清除全屏下的 Zoom 和 Pan 缩放平移矩阵
    initChoreography();
}

async function fetchNextTransitions() {
    const currState = path[path.length - 1].state;
    const maxDiff = document.getElementById("max-difficulty-select").value;
    const container = document.getElementById("transition-options");
    container.innerHTML = '<p class="text-xs text-slate-500 animate-pulse">正在调配 FSM 编排逻辑推荐...</p>';

    try {
        const options = await api.fetchTransitions(currState, maxDiff);
        if (options.length === 0) {
            container.innerHTML = '<p class="text-xs text-rose-400/80 p-2 border border-rose-950 bg-rose-950/20 rounded-lg">⚠️ 当前状态下没有符合最大难度限制的有效滑行变体！请宽限难度限制。</p>';
            return;
        }
        ui.renderTransitionOptions(currState, options, chooseNextMove);
    } catch (err) {
        container.innerHTML = `<p class="text-xs text-rose-400">加载推荐分支时出现网络故障。请确认后端服务已运行。</p>`;
    }
}

function chooseNextMove(nextStateObj, moveObj) {
    path[path.length - 1].move = moveObj;
    const nextStateStr = `${nextStateObj.foot}${nextStateObj.direction}${nextStateObj.edge}`;
    path.push({ state: nextStateStr, move: null });

    ui.updateCurrStateUI(nextStateStr);
    fetchNextTransitions();
    ui.updateStats(path, undoMove);
    drawPath();
}

function undoMove() {
    if (path.length <= 1) return;
    path.pop();
    path[path.length - 1].move = null;
    const prevState = path[path.length - 1].state;
    ui.updateCurrStateUI(prevState);
    fetchNextTransitions();
    ui.updateStats(path, undoMove);
    drawPath();
}
~~~~~
~~~~~javascript.new
document.addEventListener("DOMContentLoaded", () => {
    renderer = new CanvasRenderer("skate-canvas");
    initChoreography();
    initInteraction();

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
    window.copyTrajectorySource = copyTrajectorySource;
    window.importTrajectorySource = importTrajectorySource;
});

function initChoreography() {
    const startState = document.getElementById("start-state-select").value;
    path = [{ state: startState, move: null }];
    ui.updateCurrStateUI(startState);
    fetchNextTransitions();
    ui.updateStats(path, undoMove);
    drawPath(); // 保证起始滑跑状态建立时，第一段滑行弧线就被立即绘制出来
    updateTrajectorySourceUI();
}

function resetChoreography() {
    renderer.resetViewport(); // 清除全屏下的 Zoom 和 Pan 缩放平移矩阵
    initChoreography();
}

async function fetchNextTransitions() {
    const currState = path[path.length - 1].state;
    const maxDiff = document.getElementById("max-difficulty-select").value;
    const container = document.getElementById("transition-options");
    container.innerHTML = '<p class="text-xs text-slate-500 animate-pulse">正在调配 FSM 编排逻辑推荐...</p>';

    try {
        const options = await api.fetchTransitions(currState, maxDiff);
        if (options.length === 0) {
            container.innerHTML = '<p class="text-xs text-rose-400/80 p-2 border border-rose-950 bg-rose-950/20 rounded-lg">⚠️ 当前状态下没有符合最大难度限制的有效滑行变体！请宽限难度限制。</p>';
            return;
        }
        ui.renderTransitionOptions(currState, options, chooseNextMove);
    } catch (err) {
        container.innerHTML = `<p class="text-xs text-rose-400">加载推荐分支时出现 network 故障。请确认后端服务已运行。</p>`;
    }
}

function chooseNextMove(nextStateObj, moveObj) {
    path[path.length - 1].move = moveObj;
    const nextStateStr = `${nextStateObj.foot}${nextStateObj.direction}${nextStateObj.edge}`;
    path.push({ state: nextStateStr, move: null });

    ui.updateCurrStateUI(nextStateStr);
    fetchNextTransitions();
    ui.updateStats(path, undoMove);
    drawPath();
    updateTrajectorySourceUI();
}

function undoMove() {
    if (path.length <= 1) return;
    path.pop();
    path[path.length - 1].move = null;
    const prevState = path[path.length - 1].state;
    ui.updateCurrStateUI(prevState);
    fetchNextTransitions();
    ui.updateStats(path, undoMove);
    drawPath();
    updateTrajectorySourceUI();
}
~~~~~

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
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

        const lastState = path[path.length - 1].state;
        ui.updateCurrStateUI(lastState);
        fetchNextTransitions();
        ui.updateStats(path, undoMove);
        drawPath();
    } catch (err) {
        alert(`[-] 生成失败: ${err.message}`);
    }
}
~~~~~
~~~~~javascript.new
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
    updateTrajectorySourceUI();
}

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

        const lastState = path[path.length - 1].state;
        ui.updateCurrStateUI(lastState);
        fetchNextTransitions();
        ui.updateStats(path, undoMove);
        drawPath();
        updateTrajectorySourceUI();
    } catch (err) {
        alert(`[-] 生成失败: ${err.message}`);
    }
}
~~~~~

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
    // 延时首帧绘制，确保 DOM 完全就绪、加载完毕
    setTimeout(() => {
        drawPath();
    }, 100);
}
~~~~~
~~~~~javascript.new
    // 延时首帧绘制，确保 DOM 完全就绪、加载完毕
    setTimeout(() => {
        drawPath();
    }, 100);
}

function updateTrajectorySourceUI() {
    const sourceData = path.map(step => ({
        state: step.state,
        move_id: step.move ? step.move.id : null
    }));
    document.getElementById("trajectory-source").value = JSON.stringify(sourceData);
}

async function copyTrajectorySource() {
    const text = document.getElementById("trajectory-source").value;
    if (!text) return;
    try {
        await navigator.clipboard.writeText(text);
        const btn = document.getElementById("btn-copy-source");
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check text-emerald-400"></i><span class="text-emerald-400">已复制</span>';
        btn.classList.add("border-emerald-500", "bg-emerald-950/20");
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.classList.remove("border-emerald-500", "bg-emerald-950/20");
        }, 1500);
    } catch (err) {
        console.error("复制失败: ", err);
    }
}

async function importTrajectorySource() {
    const sourceText = document.getElementById("trajectory-source").value.trim();
    if (!sourceText) return;
    try {
        const jsonData = JSON.parse(sourceText);
        if (!Array.isArray(jsonData) || jsonData.length === 0) {
            alert("导入失败：请输入合法的 JSON 数组，例如: " + '[{"state": "LFO", "move_id": null}]');
            return;
        }

        const statesList = jsonData.map(item => item.state).filter(Boolean);
        if (statesList.length < 1) {
            alert("导入失败：数据中未包含有效状态。");
            return;
        }

        if (statesList.length === 1) {
            const startState = statesList[0];
            path = [{ state: startState, move: null }];
            ui.updateCurrStateUI(startState);
            fetchNextTransitions();
            ui.updateStats(path, undoMove);
            drawPath();
            updateTrajectorySourceUI();
            return;
        }

        const sequence = statesList.join(" -> ");
        const data = await api.verifySequence(sequence);
        if (!data.valid) {
            alert(`导入失败，动力学合规校验未通过：\n${data.error}`);
            return;
        }

        const newPath = [];
        for (let i = 0; i < data.transitions.length; i++) {
            const t = data.transitions[i];
            const expectedMoveId = jsonData[i] ? jsonData[i].move_id : null;
            
            let matchedMove = t.candidate_moves.find(m => m.id === expectedMoveId);
            if (!matchedMove) {
                matchedMove = t.selected_move;
            }

            const fromStateStr = `${t.from_state.foot}${t.from_state.direction}${t.from_state.edge}`;
            newPath.push({
                state: fromStateStr,
                move: matchedMove
            });
        }

        const lastT = data.transitions[data.transitions.length - 1];
        const lastStateStr = `${lastT.to_state.foot}${lastT.to_state.direction}${lastT.to_state.edge}`;
        newPath.push({
            state: lastStateStr,
            move: null
        });

        path = newPath;
        ui.updateCurrStateUI(path[path.length - 1].state);
        fetchNextTransitions();
        ui.updateStats(path, undoMove);
        drawPath();
        updateTrajectorySourceUI();

    } catch (err) {
        alert(`导入解析失败: ${err.message}`);
    }
}
~~~~~

### 下一步建议
- **边缘状态实时热编辑（高级）**：目前源码编辑器作为静态数据的序列化结果展示，可以进一步开发对 `JSON` 的在键盘编辑时输入监听进行防抖（Debounce）热校验并自动局部重新渲染冰面轨迹，带来极具临场感的代码流交互体验。
