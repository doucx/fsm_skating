好的，我们将完成本次工程架构的深度重构提交。这标志着 `fsm_skating` 从一个简单的脚本项目进化为一个拥有严密分层、具备生产级维护潜力的模块化软件系统。

## [COMMIT] refactor: restructure project into DDD layers

### 用户需求
将项目目录结构重塑为领域驱动设计 (DDD) 分层架构，并提交相关变更。

### 评论
这是一次具有里程碑意义的“架构清理”。通过引入 `domain`、`services`、`cli` 和 `api` 的四层结构，我们为项目的长期演进奠定了坚实的基础。这种分层方式不仅使得代码逻辑更加清晰，也极大地降低了未来在引入持久化层或更复杂的物理引擎时的重构成本。

### 目标
1.  将所有重构后的新文件和已删除旧文件的变更状态同步到 Git。
2.  确保 `pyproject.toml` 的入口点配置正确提交。
3.  在提交记录中详细说明分层架构的设计意图。

### 基本原理
按照工程最佳实践，架构重构完成后应立即进行原子提交。这次提交记录了文件从平铺到层级的物理位移，以及全链路导入路径的逻辑修正。这样做可以确保版本历史中有一个清晰的界限：在此之后，所有的功能开发都将在新的、解耦的架构之上进行。

### 标签
#intent/refine #flow/ready #priority/medium 
#comp/build #comp/engine #comp/cli #comp/interfaces #comp/tests 
#concept/config #scope/dx #ai/instruct
#task/domain/refactor #task/object/ddd-project-restructuring #task/action/git-commit
#task/state/end #task/status/completed

---

### Script

#### Acts 1: 提交 DDD 架构重构变更

我们将把所有涉及移动、修改和路径适配的文件添加到 Git 暂存区。由于文件被移动，Git 会自动识别为 `rename` 状态。

~~~~~act
git_add
pyproject.toml
src/fsm_skating/domain/models.py
src/fsm_skating/services/engine.py
src/fsm_skating/cli/main.py
src/fsm_skating/api/main.py
tests/test_core.py
tests/test_engine.py
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor: restructure project into DDD layers

Completed a major architectural overhaul by reorganizing the codebase into a Domain-Driven Design (DDD) inspired structure. This decoupling significantly improves maintainability and scalability.

Structural Changes:
- domain/: Created a pure domain layer containing core physical models and skating logic (formerly core.py).
- services/: Isolated the application logic and choreography algorithms (formerly engine.py) into a dedicated service layer.
- cli/: Separated the terminal-based user interface into its own presentation module.
- api/: Standardized the FastAPI web controller as a distinct presentation layer.

Technical Adjustments:
- Updated all internal package imports to follow the new hierarchical structure (e.g., fsm_skating.domain.models).
- Refactored pyproject.toml to point the 'fsm-skating' entry point to the new CLI location.
- Aligned the unit testing suite with the new package naming conventions.

This reorganization establishes a clear one-way dependency chain: Presentation -> Services -> Domain, ensuring that the core skating physics remain decoupled from external frameworks and interfaces.
~~~~~

### 下一步建议
- **回归测试**：建议在新的环境下重新运行一次 `pytest`，确保所有模块的相对引用在安装后依然完全正常。
- **文档更新**：建议更新项目的 `README.md`，向未来的开发者展示当前的 DDD 架构图。
- **功能迭代**：既然架构已经如此清晰，你可以开始考虑更复杂的功能，例如在 `domain` 层引入更精确的滑行轨迹数学方程，或者在 `services` 层增加基于 AI 的步法风格推荐。

你的项目重构旅程非常成功！还有什么我可以帮你的吗？
