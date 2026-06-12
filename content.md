好的，既然核心重构已经完成且通过了逻辑梳理，我们现在将这些变更作为一个完整的逻辑单元提交到 Git 仓库。

这个提交标志着项目从“纯 CLI 工具”向“支持 Web 序列化的强类型库”转型的重要里程碑。

## [COMMIT] refactor(core): migrate to Pydantic models for serialization

### 用户需求
将当前已完成的 Pydantic 模型化重构工作提交到版本控制系统。

### 评论
这是一个结构性的重大变更。我们成功地将业务逻辑（滑冰物理模型）与展示层（CLI/未来 Web）的数据契约进行了标准化。这不仅消除了代码中大量的硬编码字符串键（Magic Strings），还为接下来的 Web 可视化编排提供了天然的 JSON Schema 支持。

### 目标
1.  将所有受影响的文件添加到 Git 暂存区。
2.  创建一个详尽的提交说明，记录重构的动机、内容和带来的收益。

### 基本原理
遵循“小步提交、逻辑清晰”的原则。目前的修改虽然涉及多个文件，但其逻辑意图是高度一致的：即“全链路模型化”。在开始下一阶段的 FastAPI 集成之前进行提交，可以确保我们有一个稳定的回退点。

### 标签
#intent/refine #flow/ready #priority/medium 
#comp/core #comp/engine #comp/cli #comp/tests 
#concept/state #scope/dx #ai/instruct
#task/domain/refactor #task/object/pydantic-migration #task/action/git-commit
#task/state/end #task/status/completed

---

### Script

#### Acts 1: 提交变更

我们将把涉及重构的所有文件添加到 Git，并生成正式的提交记录。

~~~~~act
git_add
pyproject.toml
src/fsm_skating/core.py
src/fsm_skating/engine.py
src/fsm_skating/cli.py
tests/test_core.py
tests/test_engine.py
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(core): migrate to Pydantic models for serialization

Major architectural refactor to replace raw dictionary-based data handling with strong-typed Pydantic models, preparing the codebase for web-based visualization.

Key changes:
- Replaced the legacy `State` class with a Pydantic `BaseModel` featuring regex-based field validation for foot, direction, and edge.
- Introduced `Move`, `MoveOption`, and `VerificationResponse` models in `engine.py` to define strict data contracts for path generation and sequence verification.
- Refactored `ChoreographyEngine` methods to return validated Pydantic instances instead of loose dictionaries.
- Updated `cli.py` to use attribute-based access (.name, .difficulty) which improves IDE support and runtime safety.
- Updated the test suite (`test_core.py`, `test_engine.py`) to align with the new keyword-argument initialization and model attributes.
- Added `pydantic` as a core dependency in `pyproject.toml`.

This refactor eliminates "magic string" keys throughout the project and provides an out-of-the-box JSON serialization path for the upcoming REST API layer.
~~~~~

### 下一步建议
- **API 集成**：既然数据模型已经就绪，下一步我们应该创建 `src/fsm_skating/api/` 目录，并使用 **FastAPI** 编写几个核心接口（如 `/verify` 和 `/transitions`），实现通过 HTTP 调用编排引擎。
- **静态前端**：在 API 跑通后，我们可以编写一个简单的 HTML/JS 页面，利用 `fetch` 调用这些接口，并在前端展示编排路径。

如果你准备好了，我们可以开始 **“第三步：构建 FastAPI 路由与 Web 服务基础”**。
