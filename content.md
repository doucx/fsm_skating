好的，重构工作已经顺利完成。现在我将生成一个 `[COMMIT]` 计划，将这些改进作为一个逻辑完整的工作单元提交到仓库中。

## [COMMIT] refactor: eliminate redundancies in engine and frontend state parsing

### 用户需求
将刚才完成的关于消除代码冗余（DRY）以及重构前端状态解析逻辑的改动进行 Git 提交。

### 评论
这次重构不仅提高了 `canvasRenderer.js` 和 `engine.py` 的执行效率（减少了重复计算和 I/O），还通过引入 `parseState` 增强了前端代码的健壮性，为后续可能的状态机扩展奠定了良好的基础。

### 目标
1. 将所有受影响的文件添加到 Git 暂存区。
2. 创建一个清晰、详尽的提交记录，说明所做的重构工作。

### 基本原理
按照 Quipu 的工作流规范，在完成一个阶段性的代码重构并验证其逻辑正确性后，应立即创建提交。这有助于保持开发历史的清晰，并在必要时能够精确回退。

### 标签
#intent/refine #flow/ready #priority/medium #comp/engine #comp/runtime #concept/ui #scope/core #ai/instruct #task/domain/cli #task/object/fsm-skating #task/action/refactor #task/state/end

---

### Script

#### Acts 1: 提交重构代码

我们将修改后的引擎服务文件、绘图渲染器、状态解析工具以及主逻辑文件添加到暂存区并提交。

~~~~~act
git_add
src/fsm_skating/services/engine.py
web/js/state.js
web/js/canvasRenderer.js
web/js/app.js
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor: eliminate DRY violations and unify state parsing

- Refactored `CanvasRenderer.js` to extract `_getBoundsAndScale`, eliminating duplicated bounding box and scale calculation logic in `getTransform` and `draw`.
- Improved `ChoreographyEngine` in `engine.py` to cache configuration data (moves and categories) during initialization, removing redundant file reads and hardcoded category fallbacks in `check_library_integrity`.
- Introduced `parseState` in `state.js` to centralize skate state string parsing, replacing brittle array index access (e.g., `state[0]`) across multiple frontend components with a more descriptive object.
- Updated `app.js` and `canvasRenderer.js` to utilize the new `parseState` utility for consistent state property access.
~~~~~

### 下一步建议
- **性能分析**：由于我们减少了 Canvas 每一帧绘制时的遍历次数，如果编排序列非常长，可以观察一下在全屏回放模式下的帧率表现，验证重构带来的性能收益。
- **扩展状态属性**：如果未来需要引入更多滑行属性（如滑行速度、刃的深浅等），只需在 `parseState` 逻辑和 `moves_config.yaml` 中进行扩展即可，现有的 UI 逻辑将更容易适配。
