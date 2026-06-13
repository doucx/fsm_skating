### [COMMIT] fix(web): 修复步法校验器结果中状态代码显示为 [object Object] 的问题

这次提交修复了前端校验器模块在渲染校验结果时，因直接插值 `State` 对象而导致的显示错误。

---

### Script

#### Acts 1: 提交状态代码渲染修复

将修复后的 `web/js/app.js` 添加到 Git 暂存区，并进行提交。

~~~~~act
git_add
web/js/app.js
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
fix(web): correct State object rendering in sequence verifier

- Fixed an issue where State objects were being implicitly cast to '[object Object]' during HTML template string interpolation in the UI.
- Updated 'verifySequence' and 'verifyMovesSequence' result rendering logic to explicitly concatenate 'foot', 'direction', and 'edge' properties into standard 3-character state codes (e.g., 'LFO').

This ensures clear and readable output for all skating choreography validation results.
~~~~~

### 下一步建议
* **状态渲染抽象**：考虑到后续系统可能会增加更多类似的需求，建议在 `web/js/state.js` 中定义一个 `formatState` 辅助函数，将这种拼写逻辑统一起来。
* **验证验证**：建议您在 UI 校验模块输入一组序列（例如 `LFO -> RFI`），确认结果展示区域现在已正确显示为 `LFO ──▶ RFI`。
