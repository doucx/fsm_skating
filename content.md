好的，现在开始进行前端对接。我们将把后端的路径搜索 API 完整对接到 Web UI 界面中。

我们将按顺序对 `web/index.html`（添加物理路径搜索器卡片）、`web/js/api.js`（增加网络请求 API）以及 `web/js/app.js`（实现 DFS 搜索结果卡片渲染及主画布一键热重载载入）进行精确代码更新。

## [WIP] feat: 完成 FSM 路径搜索功能的前端对接

### 用户需求
在前端 Web 页面中集成“物理路径搜索器”模块。用户可以通过选择起始状态、结束状态、指定间隔数、最大难度和结果数来搜索可行路径；检索结果应以具有现代科技感的列表呈现，并支持点击后将该轨迹载入主画布和编排沙盒进行预览和动画播放。

### 评论
将后端的 DFS 规划算法转化为前端交互，是实现最终用户闭环的关键一步。通过将路径结果缓存并支持一键载入主画布，不仅能够让用户看到静态曲线，还能立刻配合播放、倍速和 TUI 动态 HUD 播放引擎，为编排人员提供了极其直观的可视化辅助。

### 目标
1. 修改 `web/index.html`，在右侧面板的自动生成器下方新增“4. 物理路径搜索器”卡片。
2. 在 `web/js/api.js` 中新增 `searchPaths` API 异步通信方法。
3. 在 `web/js/app.js` 中挂载全局方法并实现 `searchPaths`（结果卡片渲染、动作徽章展现）与 `loadSearchedPathToCanvas`（沙盒数据热重载、状态指示器及画布重绘刷新）核心交互逻辑。

### 基本原理
1. **API 双向通信**：使用 `fetch` 采用标准的 JSON 结构向 `/api/search` 发送 POST 请求，返回的多个轨迹数组直接缓存于 `window.searchedPathsCache`。
2. **画布数据动态重载**：当用户点击某一结果行上的“载入此验证轨迹至主画布预览”按钮时，该函数会重新改写全局的 `path` 变量。随后，系统将同步起始选择器的值并链式触发 `ui.updateCurrStateUI()`、`fetchNextTransitions()` 以及 `syncChoreographyUI()` 刷新页面，此时画布将利用现有的贝塞尔物理插值算法，对该新装载的曲线进行平滑渲染。

### 标签
#intent/build #flow/ready #priority/high #comp/interfaces #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/search-panel #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 在主页面结构中增加物理路径搜索器控制面板

我们在右侧栏智能随机生成器的下方追加“4. 物理路径搜索器”组件卡片。

~~~~~act
patch_file
web/index.html
~~~~~
~~~~~html.old
                <!-- 智能随机路径规划 -->
                <div class="ice-card rounded-2xl p-6">
                    <h2 class="text-lg font-semibold flex items-center text-amber-400 mb-3"><i class="fa-solid fa-wand-magic-sparkles mr-2"></i> 3. DFS 惯性轨迹自动生成器</h2>
                    <p class="text-xs text-slate-400 mb-3">基于深度优先回溯规划出绝不进入“死胡同”的滑跑路径。</p>
                    <div class="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label class="block text-[10px] text-slate-400 mb-1">规划总动作步数</label>
                            <input id="gen-steps" type="number" value="6" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none text-slate-200">
                        </div>
                        <div>
                            <label class="block text-[10px] text-slate-400 mb-1">最大动作难度上限</label>
                            <input id="gen-diff" type="number" value="3" max="5" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none text-slate-200">
                        </div>
                    </div>
                    <button onclick="generateSequence()" class="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded-lg text-sm transition"><i class="fa-solid fa-route mr-1"></i> 自动一键规划路径</button>
                </div>
            </div>
        </div>
    </div>

    <script type="module" src="js/app.js"></script>
~~~~~
~~~~~html.new
                <!-- 智能随机路径规划 -->
                <div class="ice-card rounded-2xl p-6">
                    <h2 class="text-lg font-semibold flex items-center text-amber-400 mb-3"><i class="fa-solid fa-wand-magic-sparkles mr-2"></i> 3. DFS 惯性轨迹自动生成器</h2>
                    <p class="text-xs text-slate-400 mb-3">基于深度优先回溯规划出绝不进入“死胡同”的滑跑路径。</p>
                    <div class="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label class="block text-[10px] text-slate-400 mb-1">规划总动作步数</label>
                            <input id="gen-steps" type="number" value="6" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none text-slate-200">
                        </div>
                        <div>
                            <label class="block text-[10px] text-slate-400 mb-1">最大动作难度上限</label>
                            <input id="gen-diff" type="number" value="3" max="5" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none text-slate-200">
                        </div>
                    </div>
                    <button onclick="generateSequence()" class="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded-lg text-sm transition"><i class="fa-solid fa-route mr-1"></i> 自动一键规划路径</button>
                </div>

                <!-- 物理路径搜索器 -->
                <div class="ice-card rounded-2xl p-6">
                    <h2 class="text-lg font-semibold flex items-center text-sky-400 mb-3"><i class="fa-solid fa-route mr-2"></i> 4. 物理路径搜索器</h2>
                    <p class="text-xs text-slate-400 mb-3">使用 DFS 算法，精准检索起止用刃状态之间、指定间隔状态数的全部可行滑跑路径。</p>
                    
                    <div class="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label class="block text-[10px] text-slate-400 mb-1">起始用刃状态</label>
                            <select id="search-start-state" class="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-sky-500">
                                <option value="LFO">LFO - 左前外刃</option>
                                <option value="LFI">LFI - 左前内刃</option>
                                <option value="LBO">LBO - 左后外刃</option>
                                <option value="LBI">LBI - 左后内刃</option>
                                <option value="RFO" selected>RFO - 右前外刃</option>
                                <option value="RFI">RFI - 右前内刃</option>
                                <option value="RBO">RBO - 右后外刃</option>
                                <option value="RBI">RBI - 右后内刃</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] text-slate-400 mb-1">结束用刃状态</label>
                            <select id="search-end-state" class="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-sky-500">
                                <option value="LFO">LFO - 左前外刃</option>
                                <option value="LFI">LFI - 左前内刃</option>
                                <option value="LBO" selected>LBO - 左后外刃</option>
                                <option value="LBI">LBI - 左后内刃</option>
                                <option value="RFO">RFO - 右前外刃</option>
                                <option value="RFI">RFI - 右前内刃</option>
                                <option value="RBO">RBO - 右后外刃</option>
                                <option value="RBI">RBI - 右后内刃</option>
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-2 mb-4">
                        <div>
                            <label class="block text-[10px] text-slate-400 mb-1">中间间隔状态数</label>
                            <input id="search-inter-count" type="number" value="2" min="0" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none text-slate-200">
                        </div>
                        <div>
                            <label class="block text-[10px] text-slate-400 mb-1">最大动作难度</label>
                            <input id="search-max-diff" type="number" value="5" min="1" max="5" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none text-slate-200">
                        </div>
                        <div>
                            <label class="block text-[10px] text-slate-400 mb-1">最大结果数量</label>
                            <input id="search-max-results" type="number" value="10" min="1" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none text-slate-200">
                        </div>
                    </div>

                    <button onclick="searchPaths()" class="w-full bg-sky-600 hover:bg-sky-500 text-white font-medium py-2 rounded-lg text-sm transition shadow-lg shadow-sky-950/20"><i class="fa-solid fa-magnifying-glass mr-1"></i> 一键检索可行路径</button>
                    
                    <div id="search-results-container" class="mt-4 hidden space-y-3">
                        <h3 class="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-2">⬇️ 检索结果路线列表</h3>
                        <div id="search-results" class="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                            <!-- 动态加载搜索路径列表 -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script type="module" src="js/app.js"></script>
~~~~~

#### Acts 2: 在 API 请求模块中追加路径搜索方法

我们为 `web/js/api.js` 追加 `searchPaths` 请求。

~~~~~act
patch_file
web/js/api.js
~~~~~
~~~~~javascript.old
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
~~~~~javascript.new
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

export async function searchPaths(startState, endState, intermediateCount, maxDifficulty, maxResults) {
    const res = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            start_state: startState,
            end_state: endState,
            intermediate_count: parseInt(intermediateCount),
            max_difficulty: parseInt(maxDifficulty),
            max_results: parseInt(maxResults)
        })
    });
    if (!res.ok) {
        const detail = await res.json();
        throw new Error(detail.detail || "路径检索失败");
    }
    return await res.json();
}
~~~~~

#### Acts 3: 在前端控制器中实现 DFS 搜索和画布热重载载入

我们在 `web/js/app.js` 中挂载 `searchPaths` 和 `loadSearchedPathToCanvas` 方法到全局 window 上，并实现卡片列表构建和状态链路载入逻辑。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
    window.chooseNextMove = chooseNextMove;
    window.copyTrajectorySource = copyTrajectorySource;
    window.importTrajectorySource = importTrajectorySource;
});
~~~~~
~~~~~javascript.new
    window.chooseNextMove = chooseNextMove;
    window.copyTrajectorySource = copyTrajectorySource;
    window.importTrajectorySource = importTrajectorySource;
    window.searchPaths = searchPaths;
    window.loadSearchedPathToCanvas = loadSearchedPathToCanvas;
});
~~~~~

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
        path = newPath;
        ui.updateCurrStateUI(path[path.length - 1].state);
        fetchNextTransitions();
        syncChoreographyUI();

    } catch (err) {
        alert(`[-] 导入解析失败: ${err.message}`);
    }
}
~~~~~
~~~~~javascript.new
        path = newPath;
        ui.updateCurrStateUI(path[path.length - 1].state);
        fetchNextTransitions();
        syncChoreographyUI();

    } catch (err) {
        alert(`[-] 导入解析失败: ${err.message}`);
    }
}

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
            const seqStr = p.map(step => step.state).join(" ──▶ ");
            const totalDiff = p.reduce((sum, step) => sum + (step.move ? step.move.difficulty : 0), 0);
            
            const movesList = p
                .filter(step => step.move)
                .map(step => `<span class="text-[10px] bg-slate-850 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700/50">${step.move.name}</span>`)
                .join(" ");

            const card = document.createElement("div");
            card.className = "bg-slate-900/60 border border-slate-850 hover:border-sky-500/30 p-3 rounded-xl flex flex-col space-y-2 transition group";
            
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <span class="text-xs font-bold font-mono text-slate-200 tracking-wider break-all">${seqStr}</span>
                    <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-950/60 text-sky-400 border border-sky-900 shrink-0">难度: ${totalDiff}</span>
                </div>
                <div class="flex flex-wrap gap-1 items-center">
                    ${movesList}
                </div>
                <button onclick="loadSearchedPathToCanvas(${idx})" class="w-full py-1.5 bg-sky-950/40 hover:bg-sky-900/60 border border-sky-800/40 hover:border-sky-700 text-[10px] text-sky-300 rounded-md transition flex items-center justify-center">
                    <i class="fa-solid fa-chart-line mr-1"></i> 将此验证轨迹载入主画布预览
                </button>
            `;
            resultsDiv.appendChild(card);
        });

    } catch (err) {
        resultsDiv.innerHTML = `<p class="text-xs text-rose-400">检索发生异常: ${err.message}</p>`;
    }
}

function loadSearchedPathToCanvas(idx) {
    if (!window.searchedPathsCache || !window.searchedPathsCache[idx]) return;
    const selectedPath = window.searchedPathsCache[idx];
    
    path = selectedPath.map(step => ({
        state: step.state,
        move: step.move
    }));

    const startSelect = document.getElementById("start-state-select");
    if (startSelect && path[0]) {
        startSelect.value = path[0].state;
    }

    const lastState = path[path.length - 1].state;
    ui.updateCurrStateUI(lastState);
    fetchNextTransitions();
    syncChoreographyUI();
}
~~~~~

---

### 下一步建议
1. **全栈连通性校验**：启动你的 FastAPI 后端服务（或在终端运行 `uvicorn src.fsm_skating.api.main:app --reload`），在浏览器打开该页面。通过物理路径搜索器选择不同的两刃状态和指定间隔数，点击“一键检索可行路径”看是否有流畅的网络返回。
2. **移动端交互适配测试**：在全屏下可以测试我们追加的 Pinch Zoom 双指微调与 Pan 拖拽动作，确保与我们新增的 DFS 搜索出来的超长轨迹之间交互极其跟手，且没有几何变形。
