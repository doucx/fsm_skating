好的，这是一个非常专业的改进建议。将 A* 算法的启发式权重暴露给用户，可以将这个“沙盒”提升为一个真正的“策略调优工具”，让教练或编排者根据不同的表演风格（例如：偏向高难度动作，还是偏向左右平衡的艺术表现）来生成路径。

我将按以下步骤执行：
1.  **后端模型更新**：在 API 请求模型中增加权重参数字段。
2.  **搜索算法重构**：修改 `search_paths` 函数，使其能够接收并应用自定义权重。
3.  **前端 UI 增强**：在路径搜索器中引入选项卡切换功能，并增加“高级”配置面板，使用滑动条（Range）提供直观的权重微调。
4.  **前端逻辑对接**：更新 API 调用逻辑，确保高级选项中的权重能正确传递。

## [WIP] feat: 将路径搜索启发式权重暴露至 UI 以实现高级编排微调

### 用户需求
路径搜索器目前使用硬编码的 A* 权重。需要将这些权重因子（单步代价、难度奖励、平衡度惩罚、多样性惩罚）通过 API 暴露给前端，并在搜索器界面增加一个“高级”选项卡，允许用户手动调整这些参数，以影响生成路径的风格。

### 评论
这极大增强了系统的灵活性。通过调整这些权重，用户可以模拟不同的评级偏好：
- 提高 **难度奖励**：生成包含更多复杂步法（如 Counter, Rocker）的长路径。
- 提高 **平衡度惩罚**：生成的路径将强制包含顺、逆两个方向的旋转。
- 提高 **多样性惩罚**：避免生成重复类别的动作。

### 目标
1. 修改 `SearchRequest` 以包含可选的 `weights` 字典。
2. 修改 `search_paths` 以使用请求中提供的权重，若无则降级使用默认值。
3. 在 `index.html` 中为搜索器添加“基础/高级”选项卡及对应的配置输入控件。
4. 更新 `app.js` 中的 `searchPaths` 函数以采集这些新参数。

### 基本原理
我们在 A* 搜索算法的内部逻辑中，将原本的常量（如 `C_STEP`）替换为从参数传入的动态变量。前端使用选项卡（Tabs）设计来保持界面的简洁，默认只显示基础参数，用户点击“高级”时展示四个控制滑块。

### 标签
#intent/build #flow/ready #priority/medium #comp/api #comp/engine #comp/docs #concept/executor #scope/ux #ai/instruct #task/domain/choreography #task/object/search-weights #task/action/expose-parameters #task/state/begin

---

### Script

#### Acts 1: 更新 API 模型与服务层逻辑

首先更新后端接口定义和搜索算法，使其支持动态权重。

~~~~~act
patch_file
src/fsm_skating/api/main.py
~~~~~
~~~~~python.old
class SearchRequest(BaseModel):
    start_state: str
    end_state: str
    intermediate_count: int
    max_difficulty: int = 5
    max_results: int = 10
~~~~~
~~~~~python.new
class SearchRequest(BaseModel):
    start_state: str
    end_state: str
    intermediate_count: int
    max_difficulty: int = 5
    max_results: int = 10
    weights: Optional[Dict[str, float]] = None
~~~~~

~~~~~act
patch_file
src/fsm_skating/services/engine.py
~~~~~
~~~~~python.old
    def search_paths(
        self,
        start_state: State,
        end_state: State,
        intermediate_count: int,
        max_difficulty: int = 5,
        max_results: int = 10,
    ) -> List[List[Tuple[State, Optional[Move]]]]:
        """
        使用 A* 算法检索物理轨迹，综合评估距离、难度、旋转平衡度和类别多样性，
        使高难度搜索时能更快收敛到高质量的最优滑行路线。
        """
        target_steps = intermediate_count + 1
        results: List[List[Tuple[State, Optional[Move]]]] = []
        
        # 启发函数特征权重配置 (调节偏好)
        C_STEP = 10.0      # 单步执行的基础惩罚代价
        C_DIFF = 3.0       # 动作难度奖励抵扣乘数 (鼓励高难度)
        C_BALANCE = 15.0   # 旋转平衡度失调的惩罚因子
        C_DIVERSITY = 20.0 # 动作类别缺乏多样性的惩罚因子
        TARGET_CATEGORIES = 4
~~~~~
~~~~~python.new
    def search_paths(
        self,
        start_state: State,
        end_state: State,
        intermediate_count: int,
        max_difficulty: int = 5,
        max_results: int = 10,
        weights: Optional[Dict[str, float]] = None,
    ) -> List[List[Tuple[State, Optional[Move]]]]:
        """
        使用 A* 算法检索物理轨迹，综合评估距离、难度、旋转平衡度和类别多样性，
        使高难度搜索时能更快收敛到高质量的最优滑行路线。
        """
        target_steps = intermediate_count + 1
        results: List[List[Tuple[State, Optional[Move]]]] = []
        
        # 启发函数特征权重配置 (调节偏好)
        w = weights or {}
        C_STEP = w.get("step_cost", 10.0)
        C_DIFF = w.get("difficulty_bonus", 3.0)
        C_BALANCE = w.get("balance_penalty", 15.0)
        C_DIVERSITY = w.get("diversity_penalty", 20.0)
        
        TARGET_CATEGORIES = 4
~~~~~

#### Acts 2: 增强前端 UI 结构

在 `index.html` 中为搜索器模块添加选项卡和高级配置面板。

~~~~~act
patch_file
web/index.html
~~~~~
~~~~~html.old
                <!-- 物理路径搜索器 -->
                <div class="ice-card rounded-2xl p-6">
                    <h2 class="text-lg font-semibold flex items-center text-sky-400 mb-3"><i class="fa-solid fa-route mr-2"></i> 4. 物理路径搜索器</h2>
                    <p class="text-xs text-slate-400 mb-3">基于物理规则与启发式度量，检索起止状态间指定步数的最优路径方案。</p>
                    
                    <div class="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label class="block text-[10px] text-slate-400 mb-1">起始用刃状态</label>
~~~~~
~~~~~html.new
                <!-- 物理路径搜索器 -->
                <div class="ice-card rounded-2xl p-6">
                    <div class="flex justify-between items-center mb-3">
                        <h2 class="text-lg font-semibold flex items-center text-sky-400"><i class="fa-solid fa-route mr-2"></i> 4. 物理路径搜索器</h2>
                        <div class="flex bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/50">
                            <button id="tab-search-basic" onclick="switchSearchTab('basic')" class="px-3 py-1 text-[10px] font-bold rounded-md bg-sky-600 text-white shadow-sm transition">基础</button>
                            <button id="tab-search-advanced" onclick="switchSearchTab('advanced')" class="px-3 py-1 text-[10px] font-bold rounded-md text-slate-400 hover:text-slate-200 transition">高级</button>
                        </div>
                    </div>
                    
                    <p class="text-xs text-slate-400 mb-4">基于物理规则与启发式度量，检索起止状态间指定步数的最优路径方案。</p>
                    
                    <div id="search-panel-basic" class="space-y-3">
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-[10px] text-slate-400 mb-1">起始用刃状态</label>
~~~~~
~~~~~act
patch_file
web/index.html
~~~~~
~~~~~html.old
                        <div>
                            <label class="block text-[10px] text-slate-400 mb-1">最大结果数量</label>
                            <input id="search-max-results" type="number" value="10" min="1" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none text-slate-200">
                        </div>
                    </div>

                    <button onclick="searchPaths()" class="w-full bg-sky-600 hover:bg-sky-500 text-white font-medium py-2 rounded-lg text-sm transition shadow-lg shadow-sky-950/20"><i class="fa-solid fa-magnifying-glass mr-1"></i> 一键检索可行路径</button>
~~~~~
~~~~~html.new
                        <div>
                            <label class="block text-[10px] text-slate-400 mb-1">最大结果数量</label>
                            <input id="search-max-results" type="number" value="10" min="1" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs outline-none text-slate-200">
                        </div>
                    </div>

                    <div id="search-panel-advanced" class="hidden mb-4 p-4 bg-slate-950/40 rounded-xl border border-slate-800/60 space-y-4">
                        <h4 class="text-[10px] font-bold text-sky-500 uppercase tracking-widest flex items-center">
                            <i class="fa-solid fa-sliders mr-2"></i> A* 启发式搜索权重微调
                        </h4>
                        
                        <div class="space-y-3">
                            <div>
                                <div class="flex justify-between text-[10px] mb-1">
                                    <span class="text-slate-400">单步执行代价 (Step Cost)</span>
                                    <span id="val-w-step" class="text-sky-400 font-mono">10.0</span>
                                </div>
                                <input id="range-w-step" type="range" min="0" max="50" step="0.5" value="10" oninput="updateWeightDisplay('step')" class="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500">
                            </div>
                            
                            <div>
                                <div class="flex justify-between text-[10px] mb-1">
                                    <span class="text-slate-400">难度奖励系数 (Diff Bonus)</span>
                                    <span id="val-w-diff" class="text-amber-400 font-mono">3.0</span>
                                </div>
                                <input id="range-w-diff" type="range" min="0" max="20" step="0.1" value="3" oninput="updateWeightDisplay('diff')" class="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500">
                            </div>

                            <div>
                                <div class="flex justify-between text-[10px] mb-1">
                                    <span class="text-slate-400">方向失调惩罚 (Balance Penalty)</span>
                                    <span id="val-w-balance" class="text-teal-400 font-mono">15.0</span>
                                </div>
                                <input id="range-w-balance" type="range" min="0" max="50" step="0.5" value="15" oninput="updateWeightDisplay('balance')" class="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500">
                            </div>

                            <div>
                                <div class="flex justify-between text-[10px] mb-1">
                                    <span class="text-slate-400">缺乏多样性惩罚 (Diversity Penalty)</span>
                                    <span id="val-w-diversity" class="text-indigo-400 font-mono">20.0</span>
                                </div>
                                <input id="range-w-diversity" type="range" min="0" max="50" step="0.5" value="20" oninput="updateWeightDisplay('diversity')" class="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500">
                            </div>
                        </div>
                        <p class="text-[9px] text-slate-500 italic">注：权重越高代表该特征在路径评估中越被看重。难度奖励越高倾向于生成复杂动作。</p>
                    </div>

                    <button onclick="searchPaths()" class="w-full bg-sky-600 hover:bg-sky-500 text-white font-medium py-2 rounded-lg text-sm transition shadow-lg shadow-sky-950/20"><i class="fa-solid fa-magnifying-glass mr-1"></i> 一键检索可行路径</button>
~~~~~

#### Acts 3: 更新前端 API 与交互逻辑

最后，修改 `api.js` 和 `app.js` 以收集并发送权重参数。

~~~~~act
patch_file
web/js/api.js
~~~~~
~~~~~javascript.old
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
~~~~~
~~~~~javascript.new
export async function searchPaths(startState, endState, intermediateCount, maxDifficulty, maxResults, weights = null) {
    const payload = {
        start_state: startState,
        end_state: endState,
        intermediate_count: parseInt(intermediateCount),
        max_difficulty: parseInt(maxDifficulty),
        max_results: parseInt(maxResults)
    };
    if (weights) payload.weights = weights;

    const res = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
~~~~~

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
    window.searchPaths = searchPaths;
    window.loadSearchedPathToCanvas = loadSearchedPathToCanvas;
});
~~~~~
~~~~~javascript.new
    window.searchPaths = searchPaths;
    window.loadSearchedPathToCanvas = loadSearchedPathToCanvas;
    window.switchSearchTab = switchSearchTab;
    window.updateWeightDisplay = updateWeightDisplay;
});

function switchSearchTab(mode) {
    const isBasic = mode === 'basic';
    document.getElementById('panel-search-advanced')?.classList.toggle('hidden', isBasic); // 此行逻辑稍后修正，面板 ID 需对应
    
    // 切换按钮样式
    const btnBasic = document.getElementById('tab-search-basic');
    const btnAdvanced = document.getElementById('tab-search-advanced');
    const panelAdvanced = document.getElementById('search-panel-advanced');

    if (isBasic) {
        btnBasic.className = "px-3 py-1 text-[10px] font-bold rounded-md bg-sky-600 text-white shadow-sm transition";
        btnAdvanced.className = "px-3 py-1 text-[10px] font-bold rounded-md text-slate-400 hover:text-slate-200 transition";
        panelAdvanced.classList.add('hidden');
    } else {
        btnBasic.className = "px-3 py-1 text-[10px] font-bold rounded-md text-slate-400 hover:text-slate-200 transition";
        btnAdvanced.className = "px-3 py-1 text-[10px] font-bold rounded-md bg-sky-600 text-white shadow-sm transition";
        panelAdvanced.classList.remove('hidden');
    }
}

function updateWeightDisplay(key) {
    const range = document.getElementById(`range-w-${key}`);
    const valDisplay = document.getElementById(`val-w-${key}`);
    if (range && valDisplay) {
        valDisplay.innerText = parseFloat(range.value).toFixed(1);
    }
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
    resultsDiv.innerHTML = '<p class="text-xs text-slate-500 animate-pulse"><i class="fa-solid fa-spinner fa-spin mr-1.5"></i>正在进行启发式路径检索与评估...</p>';

    try {
        const paths = await api.searchPaths(startState, endState, interCount, maxDiff, maxResults);
~~~~~
~~~~~javascript.new
async function searchPaths() {
    const startState = document.getElementById("search-start-state").value;
    const endState = document.getElementById("search-end-state").value;
    const interCount = document.getElementById("search-inter-count").value;
    const maxDiff = document.getElementById("search-max-diff").value;
    const maxResults = document.getElementById("search-max-results").value;

    // 采集高级权重
    const weights = {
        step_cost: parseFloat(document.getElementById("range-w-step").value),
        difficulty_bonus: parseFloat(document.getElementById("range-w-diff").value),
        balance_penalty: parseFloat(document.getElementById("range-w-balance").value),
        diversity_penalty: parseFloat(document.getElementById("range-w-diversity").value)
    };

    const container = document.getElementById("search-results-container");
    const resultsDiv = document.getElementById("search-results");

    container.classList.remove("hidden");
    resultsDiv.innerHTML = '<p class="text-xs text-slate-500 animate-pulse"><i class="fa-solid fa-spinner fa-spin mr-1.5"></i>正在进行启发式路径检索与评估...</p>';

    try {
        const paths = await api.searchPaths(startState, endState, interCount, maxDiff, maxResults, weights);
~~~~~

### 下一步建议
- **权重预设器**：可以进一步增加几个“预设按钮”，例如“艺术表现优先”（高平衡度和多样性权重）或“竞技难度优先”（高难度奖金权重），帮助非技术用户快速调整。
- **性能测试**：在高难度奖励和长路径搜索时，A* 可能需要更长时间。可以考虑在 UI 上增加一个超时提示或搜索深度限制。
