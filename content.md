好的，我们已成功修复前端 API 地址硬编码问题，实现了前后端通信的自适应端口绑定。现在将此修复提交到 Git。

## [COMMIT] fix(web): 移除 API 地址硬编码以实现前端自适应端口

### 用户需求
正式提交对前端 API 地址的修复，确保 Web UI 在修改后端运行端口（如 `--port 9000`）时，前端依然能自动定位到正确的主机与端口。

### 评论
这是一个关键的 UX 与架构修复。通过将 `API_BASE` 改为相对路径，前端代码不再与特定的端口号耦合，这不仅提升了开发时的本地测试便利性，也为将来可能的多端口部署或反向代理配置扫清了障碍。

### 目标
1.  将 `web/js/api.js` 的通信协议修正。
2.  将 `web/index.html` 和 `web/js/app.js` 的动态端点渲染逻辑添加到版本库。
3.  生成规范的 Git 提交信息。

### 基本原理
按照项目惯例，在文件系统变更稳定后，执行独立的提交步骤，确保提交历史的可追溯性和整洁性。

### 标签
#intent/fix #flow/done #priority/critical #comp/interfaces #concept/sync #scope/ux #ai/instruct #task/domain/cli #task/object/endpoint-adaptation #task/action/commit #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交修复

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
fix(web): remove hardcoded API base URL for dynamic port support

- Replaced hardcoded 'http://127.0.0.1:8000/api' with relative path '/api' in 'web/js/api.js'.
- Updated 'web/index.html' to include a dynamic API status badge.
- Added logic in 'web/js/app.js' to automatically detect and display the current host/port in the UI header.
- This change ensures the Web UI remains functional regardless of the port assigned to the Uvicorn backend.
~~~~~

### 下一步建议

- **生产部署验证**: 现在你的 WebUI 已经具备了完全的“部署弹性”。你可以放心地使用任何端口启动服务。
- **项目收官**: 目前项目已经具备了完整的 DDD 领域逻辑、物理校验、自动生成、可视化渲染以及完备的启动配置，该系统已处于稳定且可用的状态。
