好的。我们已经顺利完成了路线图的前三个阶段：从底层领域模型的物理演算，到核心引擎的逻辑实现，再到 API 层的服务暴露。

现在的系统已经具备了自动推导用刃状态和识别 DAG 歧义路径的能力。我将生成一个 `[COMMIT]` 计划，将这些核心变更提交到版本库中。

## [COMMIT] feat: 实现动作驱动校验逻辑与物理状态演算器

### 用户需求
完成路线图前三阶段的开发：支持通过物理运动条件自动演算用刃状态，实现动作驱动（Move-Centric）的步法校验引擎，并通过 REST API 暴露该能力。

### 评论
这是一次关键的架构升级。系统从单纯的“状态检查器”进化为了具有物理推理能力的“动力学模拟器”。这不仅极大地方便了前端实现，也为未来支持更复杂的编排规则（如 ISU 转体多样性自动评分）奠定了基础。

### 目标
1. 提交领域模型中新增的状态翻转与演算逻辑。
2. 提交引擎层中支持多重路径识别（`is_ambiguous`）与动作推演（`verify_move_sequence`）的变更。
3. 提交 FastAPI 中新增的动作校验路由。
4. 包含针对上述逻辑的所有新单元测试用例。

### 基本原理
我们通过在领域层封装物理翻转规则，使引擎能够模拟动作对选手的位移和姿态影响。在校验时，我们通过回溯识别具有多个合法动作的过渡段，从而标记出序列的歧义性。API 层采用标准 RESTful 设计，支持无状态的动作链校验。

### 标签
#intent/build #flow/ready #priority/high
#comp/engine #comp/interfaces #concept/state #scope/core
#ai/instruct
#task/domain/engine
#task/object/move-centric-refactor
#task/action/implementation
#task/state/continue #task/status/active

---

### Script

#### Acts 1: 提交核心重构与新功能

我们将修改后的领域模型、引擎服务、API 路由以及新增的测试文件添加到暂存区并提交。

~~~~~act
git_add
src/fsm_skating/domain/models.py
src/fsm_skating/services/engine.py
src/fsm_skating/api/main.py
tests/test_phase1_refactor.py
tests/test_phase2_move_centric.py
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat: implement move-centric verification and automated state derivation

This commit completes Phases 1-3 of the refactoring roadmap, transitioning the system from a simple state validator to a physics-aware kinetic engine.

Key changes:
- Domain: Added `calculate_next_state` and attribute flipping helpers (`get_opposite_*`) to simulate edge/direction/foot changes based on movement conditions.
- Engine: Updated `VerificationResponse` to include an `is_ambiguous` flag, identifying DAG multi-edges where a single state transition matches multiple technical moves (e.g., LFI->LBO matching both Three-Turn and Bracket).
- Engine: Implemented `verify_move_sequence`, a new entry point that allows validating a sequence of move IDs. It automatically derives intermediate states and checks start constraints.
- API: Exposed the new logic via `POST /api/verify/moves`.
- Tests: Added comprehensive unit tests for state derivation logic and move-centric verification flows.
~~~~~

### 下一步建议
- **开展第四阶段**：升级前端代码（`web/js/api.js` 和 `web/js/app.js`），在界面上增加“步法驱动”模式，并调用新接口展示演化轨迹。
- **2D 渲染器优化**：在第四阶段中，我们将特别关注如何在 Canvas 上清晰地呈现 `is_ambiguous` 标记的多重路径分支。
