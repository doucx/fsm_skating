好的，代码修改已完成。现在我将生成一个 `[COMMIT]` 计划，将这些增强功能作为完整的逻辑单元进行提交。

## [COMMIT] feat: 暴露搜索启发式权重以支持高级路径编排微调

### 用户需求
路径搜索器需要更灵活的编排偏好控制。通过将 A* 搜索算法的内部启发式权重（单步代价、难度奖励、平衡度惩罚、多样性惩罚）暴露给前端 UI，用户可以根据需要微调生成的路径风格。

### 评论
这是一项显著提升专业性的功能改进。它将静态的路径搜索转化为了一个可交互的策略调优工具，使系统能够适应从“基础教学”到“高级竞技”的不同编排需求。

### 目标
- 在后端 `SearchRequest` API 中支持可选的 `weights` 字典。
- 重构 `ChoreographyEngine.search_paths` 以应用动态权重。
- 在 Web 端引入“基础/高级”选项卡，并提供四个权重的滑动条控制面板。
- 实现权重采集与 API 的端到端对接。

### 基本原理
通过在 A* 搜索的 `f_score` 计算中引入权重乘数，我们将算法的评估偏好参数化。前端通过 Tabs 设计保持了 UI 的整洁度，仅在用户需要“进阶”控制时才展示滑块，从而兼顾了易用性与专业性。

### 标签
#intent/build #flow/ready #priority/medium #comp/api #comp/engine #comp/cli #comp/docs #concept/executor #scope/api #scope/ux #ai/instruct #task/domain/choreography #task/object/search-weights #task/action/expose-parameters #task/state/end

---

### Script

#### Acts 1: 提交变更

~~~~~act
git_add
src/fsm_skating/api/main.py
src/fsm_skating/services/engine.py
web/index.html
web/js/api.js
web/js/app.js
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat: expose A* search weights to UI for advanced choreography tuning

This change introduces granular control over the path-finding heuristics, allowing users to influence the style of generated skating sequences.

Key changes:
- API: Updated 'SearchRequest' to accept a 'weights' dictionary.
- Engine: Modified 'search_paths' to use dynamic weights for step cost, difficulty bonus, balance penalty, and diversity penalty in the A* algorithm.
- Web UI: Added an "Advanced" tab to the Path Searcher with interactive range sliders and real-time value displays.
- Integration: Wired the UI sliders to the API call, ensuring custom weights are utilized during path retrieval.

These improvements enable the system to cater to diverse choreography goals, such as prioritizing bilateral rotation balance or high-difficulty move density.
~~~~~

### 下一步建议
- **性能监控**: 监控在极端权重设置（例如极高的难度奖励）下的搜索耗时，必要时在 API 层添加计算超时保护。
- **权重预设**: 考虑添加“预设”功能，如“艺术性优先”（高平衡权重）或“技术性优先”（高难度权重），进一步提升用户体验。
