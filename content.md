好的，我们已经完成了“轨迹流源码编辑器”的 UI 注入与核心逻辑实现。现在，我们将这些更改作为一个完整的逻辑单元提交到版本库中。

## [COMMIT] feat: 增加轨迹流源码导入/导出功能与 JSON 源代码编辑器

### 用户需求
需要将新开发的轨迹流 JSON 源代码编辑器及其配套的导入、导出与逆向动力学装配逻辑提交到 Git 仓库。

### 评论
通过这次提交，编排沙盒正式具备了数据持久化与跨端共享的能力。这不仅是一个 UI 改进，更标志着系统在数据结构化和动力学逆向工程解析方面的成熟。

### 目标
1. 将修改后的 `web/index.html` 和 `web/js/app.js` 提交。
2. 确保提交说明清晰地描述了序列化与动力学逆向装配的实现细节。

### 基本原理
遵循“修改与提交分离”的原则，在确认代码逻辑已注入后，通过 `git_add` 暂存更改，并执行 `git_commit` 生成正式记录。

### 标签
#intent/build #flow/ready #priority/high #comp/docs #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/trajectory-source #task/action/implementation #task/state/end #task/status/completed

---

### Script

#### Acts 1: 提交 Web 端功能变更

我们将新增的编辑器组件及其交互逻辑代码正式存入版本库。

~~~~~act
git_add
web/index.html
web/js/app.js
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(web): add trajectory source JSON editor for import/export

Implemented a new "Trajectory Source" editor in the choreography sandbox.

- Added a real-time JSON editor that serializes the current skating path into a structured `[{state, move_id}]` format.
- Implemented a copy-to-clipboard feature with dynamic success-state feedback.
- Developed an "Import" engine that:
  1. Parses raw JSON input.
  2. Performs kinetic validation via the /api/verify backend endpoint.
  3. Re-assembles full Move entities from the candidate pool based on move_id, restoring rotation and difficulty data.
- Integrated synchronization logic into the core application lifecycle (init, move selection, undo, and auto-generation).
~~~~~

### 下一步建议
- **复杂序列集成测试**: 建议手动测试几个包含异脚转移（如 Mohawk）和复杂转体（如 Bracket）的长序列，验证导入后的 Canvas 渲染与统计分析是否与导出前完全一致。
- **UI 增强**: 可以考虑为文本框增加一个“格式化/美化 JSON”的小按钮，方便用户手动编辑源码时的可读性。
