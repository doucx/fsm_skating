好的，我们已经完成了路径搜索功能从核心引擎算法、REST API、命令行 CLI 到 Web 前端交互的全栈开发与调试。现在，我们将把这些变更作为一个完整的工作单元提交到 Git 仓库。

## [COMMIT] feat: 实现两用刃状态间指定间隔状态数的路径搜索功能

### 用户需求
系统需要能够检索两个指定滑行状态之间、恰好间隔 $x$ 个状态的所有可行物理轨迹。该功能需要支持：
1. **算法层**：基于 DFS 的深度受限搜索。
2. **接口层**：提供标准化的 REST API 端点。
3. **终端层**：在 CLI 中提供交互式搜索及详细 ISU 多样性报告导出。
4. **网页层**：提供可视化的搜索面板，并支持一键将结果载入主画布预览及回放。

### 评论
这是一个跨越多个层级的核心功能升级。它不仅释放了 FSM 引擎的规划潜力，还通过前端的“载入预览”功能，极大地提升了编排人员对复杂步法序列的探索效率。我们在开发过程中及时修复了物理逻辑假设引起的测试失败以及前端数据绑定引起的序列化问题，确保了最终交付的稳健性。

### 目标
1. 将所有涉及后端引擎、API、CLI 以及前端 JS/HTML 的修改添加到 Git 暂存区。
2. 创建一个符合 Conventional Commits 规范的提交，详细说明本次全栈功能的实现。

### 基本原理
按照 Quipu 协议的稳定性假设，我们已经在之前的 `[WIP]` 计划中完成了功能编写与本地验证（包括 pytest 校验和前端交互测试）。现在的 `[COMMIT]` 计划负责将这些经过验证的代码正式固化到历史图谱中。

### 标签
#intent/build #flow/ready #priority/high 
#comp/engine #comp/api #comp/cli #comp/interfaces #comp/tests
#concept/executor #concept/ui #scope/ux #scope/dx
#ai/delegate
#task/domain/fsm #task/object/path-search #task/action/implementation #task/state/end #task/status/completed

---

### Script

#### Acts 1: 提交全栈路径搜索功能变更

我们将所有修改过的核心逻辑、接口定义、终端交互、前端代码及新测试用例添加到暂存区并提交。

~~~~~act
git_add
src/fsm_skating/services/engine.py
src/fsm_skating/api/main.py
src/fsm_skating/cli/main.py
tests/test_search.py
web/index.html
web/js/api.js
web/js/app.js
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat: implement physical path search across engine, API, CLI and Web

Introduced a robust DFS-based path searching capability that finds all valid skating trajectories between two states with a specific number of intermediate steps.

Key Changes:
- **Engine**: Added `search_paths` method with depth-constrained DFS to handle physical transition logic and pruning.
- **API**: Exposed `POST /api/search` endpoint with strict Pydantic validation for search parameters.
- **CLI**: Integrated a new "Path Search" module (Option 5) allowing users to find, inspect, and export detailed ISU diversity reports for any discovered path.
- **Web UI**: 
    - Added "Physical Path Inspector" card with intuitive controls for start/end states and step counts.
    - Implemented high-performance result rendering and a "Load to Canvas" feature that hot-reloads the choreographer sandbox for instant visualization and playback.
- **Quality**: Added comprehensive unit tests in `tests/test_search.py` and fixed serialization issues where state objects were incorrectly handled as `[object Object]` in the frontend.

This feature completes the core planning capabilities of the FSM Skating system.
~~~~~

### 下一步建议
- **回归测试**：在新的功能分支上运行全量 `pytest`，确保新引入的 DFS 逻辑没有对原有的随机路径生成算法产生回归干扰。
- **UI 增强**：考虑在搜索结果中增加简单的“难度星级”可视化，以及根据总旋转平衡度对结果进行初步推荐排序。
- **后端缓存**：如果用户频繁执行深层（如间隔步数 > 8）搜索，建议在 `search_paths` 中引入结果集缓存机制。
