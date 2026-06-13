好的，功能开发与文档补充已全部就绪。现在我们将这些变更作为一个完整的逻辑单元提交到 Git 仓库。

这是本次任务阶段的最后一个计划。

## [COMMIT] feat(api,docs): 参数化 Web 启动入口并建立项目 README

### 用户需求
将最近关于 Web 服务启动参数（host/port）的改进以及新编写的 `README.md` 文档正式提交到版本控制系统中。

### 评论
通过这次提交，项目不仅在运行灵活性上得到了提升，同时也拥有了正式的“门面”文档。这标志着 `fsm_skating` 从一个纯功能性的原型进化为了一个结构清晰、易于分发和使用的开源工具原型。

### 目标
1.  将 `src/fsm_skating/api/main.py` 添加到暂存区。
2.  将 `README.md` 添加到暂存区。
3.  生成一条包含功能描述和文档更新说明的规范 Git 提交信息。

### 基本原理
遵循 `d3-constraint-quipu-plan-script-rules` 公理，在独立的 `[COMMIT]` 计划中执行 Git 操作，以确保文件系统变更已稳定。使用 Conventional Commits 规范来维护清晰的项目历史。

### 标签
#intent/tooling #flow/ready #priority/medium #comp/build #comp/docs #scope/dx #ai/instruct #task/domain/version-control #task/object/fsm-skating-core #task/action/commit #task/state/end #task/status/completed

---

### Script

#### Acts 1: 暂存并提交变更

我们将把 API 入口修改和 README 文件一同提交。

~~~~~act
git_add
src/fsm_skating/api/main.py
README.md
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(api,docs): parameterize web entry and add comprehensive README

- Modified `fsm_skating.api.main:start` to support `--host`, `--port`, and `--no-reload` arguments via `argparse`. This allows users to easily configure the network interface and port for the Web UI.
- Created a detailed `README.md` documenting the project's FSM-based physics engine, DDD architecture, CLI/Web usage, and visual features.
- Default web service behavior remains 127.0.0.1:8000 for backward compatibility.
~~~~~

### 下一步建议

- **生产环境部署**: 既然现在支持指定 IP，你可以尝试将服务部署到内网服务器，并使用 `--host 0.0.0.0` 让其他设备访问。
- **扩展动作库**: 根据 `README.md` 中的说明，你可以尝试在 `config/moves_config.yaml` 中添加一些自定义的复杂步法。
- **前端增强**: 下一阶段可以考虑为 Web UI 增加保存/加载编排方案到本地存储的功能。
