好的，我们已经完成了从算法核心升级到前端交互语义清理的所有工作。现在我将生成一个 `[COMMIT]` 计划，将这些更改作为一个完整的逻辑单元提交到仓库中。

## [COMMIT] feat: 升级编排引擎为 A* 搜索并优化 UI 术语

### 用户需求
将近期完成的“A* 算法升级”以及“界面算法术语清理”相关的所有修改提交到 Git 仓库历史记录中。

### 评论
这是一个里程碑式的提交。它不仅从技术底层（算法效率与质量）提升了系统的编排能力，还在产品层面（UI/CLI 语义）完成了从“技术原型”向“专业工具”的转变。将算法逻辑与界面文案同步提交，保证了代码库逻辑与展现的一致性。

### 目标
1. 将 `src/fsm_skating/services/engine.py`、`src/fsm_skating/cli/main.py`、`web/index.html` 和 `web/js/app.js` 添加到暂存区。
2. 创建一个详细的提交记录，涵盖算法演进和 UX 优化两个维度。

### 基本原理
根据 `d3-constraint-quipu-plan-script-rules` 协议，文件修改与 Git 提交必须在不同的 Plan 中执行。当前计划专门负责执行 Git 持久化操作，以确保此前所有的代码变更都被稳健地记录下来。

### 标签
#intent/build #intent/tune #flow/ready #priority/medium
#comp/engine #comp/cli #comp/ui #concept/executor #concept/ui
#scope/core #scope/ux #ai/instruct
#task/domain/core #task/object/search-algorithm #task/action/implementation #task/state/end

---

### Script

#### Acts 1: 提交 A* 算法升级与 UI 术语优化

我们将所有变更文件加入暂存区，并进行正式提交。

~~~~~act
git_add
src/fsm_skating/services/engine.py
src/fsm_skating/cli/main.py
web/index.html
web/js/app.js
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(engine): upgrade search to A* and refine UI terminology

- Replaced the DFS search in ChoreographyEngine with an A* heuristic algorithm.
- Introduced ChoreoSearchNode to track rotation balance and category diversity.
- Implemented BFS-based distance matrix pre-calculation for admissible pruning.
- Refined CLI and Web UI terminology to hide internal algorithm details, 
  focusing on professional business terms like "Smart Planning" and "Path Search".
- Enhanced search results quality by prioritizing balanced and diverse sequences.
~~~~~

### 下一步建议
- **性能基准测试**：可以针对极长步数（例如 20-30 步）的路径搜索进行性能压力测试，验证 A* 算法在复杂约束下的收敛速度。
- **扩展定级逻辑**：既然引擎现在能感知“多样性”和“平衡度”，下一步可以考虑将这些指标转化为具体的 ISU 定级建议（如 Level 1-4 预估）直接反馈给用户。
