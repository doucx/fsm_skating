好的，我们已经完成了路线图的 **第四阶段**。现在，前端沙盒已经具备了强大的双模式校验能力，不仅能够识别并展示物理路径中的“歧义（DAG 多重候选动作）”，还支持将校验通过的逻辑链条（无论是状态链还是动作链）一键载入画布进行 2D 物理轨迹预览。

我将生成一个 `[COMMIT]` 计划，将这些前端 UI 的关键功能变更提交到版本库中。

## [COMMIT] feat(web): 实现双模式校验器 UI 与歧义路径可视化展示

### 用户需求
前端需要适配后端新增的动作驱动校验能力。用户应能在界面上自由切换“状态流”与“步法流”两种校验模式，并在校验通过后，能够直观地看到步骤中的歧义动作（DAG 多重候选），并支持将推演出的物理轨迹一键导入沙盒进行 2D 渲染。

### 评论
这是一次显著的 UX（用户体验）提升。通过“一键载入画布”功能，我们打通了“校验推演”与“可视化编排”之间的闭环，使得编排师可以先用步法 ID 快速构思，再通过系统自动推演出的 2D 轨迹进行细节打磨。同时，对歧义路径的展示也让用户意识到冰面上同一物理轨迹对应的不同技术可能性。

### 目标
1. 提交 `web/js/api.js` 中新增的步法序列网络请求封装。
2. 提交 `web/index.html` 中重构的具有模式切换功能的校验面板。
3. 提交 `web/js/app.js` 中关于双模式控制、歧义路径渲染以及“一键载入画布”的核心逻辑。

### 基本原理
前端利用 JavaScript 维护一个 `verifyMode` 状态。在“状态流模式”下，解析后端返回的 `candidate_moves` 数组长度，若大于 1 则判定为 DAG 歧义路径并高亮显示；在“步法流模式”下，允许用户输入动作 ID，系统利用后端的物理演算能力得出状态链，并利用 `verifiedPathData` 机制实现不同模块间的数据共享与轨迹重绘。

### 标签
#intent/build #flow/ready #priority/high 
#comp/interfaces #concept/ui #concept/executor #scope/ux #scope/dx
#ai/instruct
#task/domain/ui
#task/object/dual-mode-verifier
#task/action/implementation
#task/state/continue #task/status/active

---

### Script

#### Acts 1: 提交前端 UI 与交互逻辑变更

我们将修改后的前端 HTML、API 封装和 App 主逻辑脚本添加到暂存区并提交。

~~~~~act
git_add
web/js/api.js
web/index.html
web/js/app.js
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(web): implement dual-mode verifier UI and DAG path visualization

Enhanced the web sandbox to support both State-driven and Move-driven verification modes.

Key improvements:
- Added `verifyMovesSequence` API wrapper for move-id based physics derivation.
- Refactored verifier UI with a mode-switching toggle and optional starting state selector.
- Implemented ambiguity detection in the results view, displaying alternative move candidates (DAG edges) when multiple moves match a state transition.
- Introduced "Load to Canvas" feature, allowing users to inject verified or derived movement paths directly into the 2D sandbox for visual trajectory rendering and diversity analysis.
- Improved input parsing to support arrows, commas, or spaces as move delimiters.
~~~~~

### 下一步建议
- **最终验收（第五阶段）**：现在的系统已经非常完整。我建议你尝试在“步法流校验”中输入 `stroke -> forward_inside_three_turn`，然后点击“载入画布”，观察 2D 轨迹是否正确生成。
- **鲁棒性检查**：检查在输入错误的动作 ID（例如拼写错误）时，前端是否能正确显示后端返回的错误信息。
- **发布准备**：如果一切正常，我们可以准备进行最终的文档更新或 README 完善，标志着这次“物理步法序列校验器”升级圆满完成。
