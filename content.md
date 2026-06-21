好的，隐藏具体的实现细节（如 DFS、A*）并将其抽象为业务术语（如“智能规划”、“路径搜索”），是符合软件工程封装原则和用户体验（UX）设计的。这不仅使界面更加简洁专业，也为未来算法的平滑升级（例如从 A* 升级到 D* 或其他约束求解器）预留了空间。

## [WIP] tune(ui/cli): 隐藏具体算法实现细节，统一业务术语描述

### 用户需求
1. 在 CLI 和 Web UI 中移除所有显式的 "DFS" 算法提及。
2. 将相关描述统一为“智能轨迹生成”、“路径规划”或“启发式搜索”。
3. 确保用户在等待结果时，看到的文案更符合业务逻辑而非技术实现。

### 评论
将技术名词（Algorithm Specifics）与功能描述（Functionality Description）解耦是提升软件专业感的关键。用户关心的是“能否搜出高质量步法”，而非底层使用的是哪种搜索策略。

### 目标
1. 修改 `src/fsm_skating/cli/main.py`，移除 `run_generator` 和 `run_path_search` 中的 DFS 字样。
2. 修改 `web/index.html`，更新生成器和搜索器的标题及描述。
3. 修改 `web/js/app.js`，更新搜索时的 Loading 文案。

### 基本原理
通过修改面向用户的字符串常量，完成“界面语义”的重构。这不涉及任何底层逻辑变化，但能显著提升产品的品牌一致性。

### 标签
#intent/tune #flow/ready #priority/low
#comp/cli #comp/docs #concept/ui #scope/ux
#ai/instruct 
#task/domain/ui #task/object/semantics #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 清理 CLI 界面中的算法技术术语

我们将修改 `cli/main.py`，将带有 "DFS" 的提示语更新为更通用的业务表达。

~~~~~act
patch_file
src/fsm_skating/cli/main.py
~~~~~
~~~~~python.old
    print("\n⚡ 正在调配 FSM 编排状态机，并应用 DFS 算法规划冰面最优惯性路径...")
    path = engine.generate_sequence(steps, max_diff, start_state)
~~~~~
~~~~~python.new
    print("\n⚡ 正在调配 FSM 编排状态机，规划冰面最优惯性路径...")
    path = engine.generate_sequence(steps, max_diff, start_state)
~~~~~
~~~~~act
patch_file
src/fsm_skating/cli/main.py
~~~~~
~~~~~python.old
    print(
        f"\n⚡ 正在调配 DFS 算法检索从 {start_state} 到 {end_state} (中间间隔 {intermediate_count} 个状态) 的合规路径..."
    )
~~~~~
~~~~~python.new
    print(
        f"\n⚡ 正在检索从 {start_state} 到 {end_state} (中间间隔 {intermediate_count} 个状态) 的合规滑行路径..."
    )
~~~~~

#### Acts 2: 更新 Web UI 标题与 Loading 状态

我们将同步更新前端 HTML 标签和 JavaScript 中的加载文案。

~~~~~act
patch_file
web/index.html
~~~~~
~~~~~html.old
                <!-- 智能随机路径规划 -->
                <div class="ice-card rounded-2xl p-6">
                    <h2 class="text-lg font-semibold flex items-center text-amber-400 mb-3"><i class="fa-solid fa-wand-magic-sparkles mr-2"></i> 3. DFS 惯性轨迹自动生成器</h2>
                    <p class="text-xs text-slate-400 mb-3">基于深度优先回溯规划出绝不进入“死胡同”的滑跑路径。</p>
~~~~~
~~~~~html.new
                <!-- 智能随机路径规划 -->
                <div class="ice-card rounded-2xl p-6">
                    <h2 class="text-lg font-semibold flex items-center text-amber-400 mb-3"><i class="fa-solid fa-wand-magic-sparkles mr-2"></i> 3. 智能轨迹自动生成器</h2>
                    <p class="text-xs text-slate-400 mb-3">基于滑行演化逻辑，自动规划出不进入“死胡同”的滑跑方案。</p>
~~~~~
~~~~~act
patch_file
web/index.html
~~~~~
~~~~~html.old
                <!-- 物理路径搜索器 -->
                <div class="ice-card rounded-2xl p-6">
                    <h2 class="text-lg font-semibold flex items-center text-sky-400 mb-3"><i class="fa-solid fa-route mr-2"></i> 4. 物理路径搜索器</h2>
                    <p class="text-xs text-slate-400 mb-3">使用 DFS 算法，精准检索起止用刃状态之间、指定间隔状态数的全部可行滑跑路径。</p>
~~~~~
~~~~~html.new
                <!-- 物理路径搜索器 -->
                <div class="ice-card rounded-2xl p-6">
                    <h2 class="text-lg font-semibold flex items-center text-sky-400 mb-3"><i class="fa-solid fa-route mr-2"></i> 4. 物理路径搜索器</h2>
                    <p class="text-xs text-slate-400 mb-3">基于物理规则与启发式度量，检索起止状态间指定步数的最优路径方案。</p>
~~~~~
~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
    resultsDiv.innerHTML = '<p class="text-xs text-slate-500 animate-pulse"><i class="fa-solid fa-spinner fa-spin mr-1.5"></i>正在利用 DFS 穷举物理路径...</p>';
~~~~~
~~~~~javascript.new
    resultsDiv.innerHTML = '<p class="text-xs text-slate-500 animate-pulse"><i class="fa-solid fa-spinner fa-spin mr-1.5"></i>正在进行启发式路径检索与评估...</p>';
~~~~~

### 下一步建议
- **后端日志审查**：可以检查后端 `services/engine.py` 内部是否还有遗留的 `print` 语句提及算法细节，建议统一改为标准的 Python `logging` 或仅在 `debug` 模式下输出。
- **提交变更**：如果你对目前的算法升级和界面清理满意，我们可以创建一个 `[COMMIT]` 计划来永久化这些更改。
