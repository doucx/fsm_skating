好的，我理解你的需求。为了让 `uv run fsm-skating-web` 指令能够灵活配置运行环境，我们需要修改 API 入口脚本，引入命令行参数解析功能。

我将为你生成一个 `[WIP]` 计划来执行此项改进。

## [WIP] feat(api): 为 Web 服务入口添加 host 与 port 命令行参数支持

### 用户需求
目前 `fsm-skating-web` 命令的运行 IP (`127.0.0.1`) 和端口 (`8000`) 是硬编码的。用户希望能够通过命令行参数（例如 `--host 0.0.0.0 --port 8888`）来指定这些配置。

### 评论
这是一个非常实用的改进。特别是在需要将服务部署到局域网或容器环境时，指定 `0.0.0.0` 是必须的。通过 `argparse` 标准库实现该功能符合 Python 命令行工具的设计惯例。

### 目标
1.  修改 `src/fsm_skating/api/main.py` 中的 `start` 函数。
2.  引入 `argparse` 模块来解析 `--host` 和 `--port` 参数。
3.  保持默认值与现有行为一致（`127.0.0.1:8000`），并透传 `reload` 参数。

### 基本原理
我们在 `start()` 函数内集成 `argparse.ArgumentParser`。当 `uv run fsm-skating-web` 被调用时，`start()` 函数作为 entry point 会首先解析 `sys.argv` 中的参数，然后将结果传递给 `uvicorn.run` 方法。由于 `pyproject.toml` 中已经正确配置了脚本映射，此改动将立即生效。

### 标签
#intent/build #flow/ready #priority/medium #comp/cli #comp/build #scope/ux #ai/instruct #task/domain/cli #task/object/web-entry #task/action/parameterization #task/state/begin

---

### Script

#### Acts 1: 参数化 API 启动入口

我们将对 `src/fsm_skating/api/main.py` 进行补丁操作，重写 `start` 函数以包含参数解析逻辑。

~~~~~act
patch_file
src/fsm_skating/api/main.py
~~~~~
~~~~~python.old
def start():
    """供入口脚本调用，启动 Uvicorn 服务"""
    import uvicorn

    uvicorn.run("fsm_skating.api.main:app", host="127.0.0.1", port=8000, reload=True)
~~~~~
~~~~~python.new
def start():
    """供入口脚本调用，启动 Uvicorn 服务"""
    import uvicorn
    import argparse

    parser = argparse.ArgumentParser(description="❄️ FSM Skating Web 服务启动器")
    parser.add_argument(
        "--host", 
        type=str, 
        default="127.0.0.1", 
        help="绑定 IP 地址 (默认: 127.0.0.1)"
    )
    parser.add_argument(
        "--port", 
        type=int, 
        default=8000, 
        help="监听端口 (默认: 8000)"
    )
    parser.add_argument(
        "--no-reload", 
        action="store_false", 
        dest="reload", 
        default=True, 
        help="禁用热重载模式"
    )
    
    args = parser.parse_args()

    uvicorn.run(
        "fsm_skating.api.main:app", 
        host=args.host, 
        port=args.port, 
        reload=args.reload
    )
~~~~~

### 下一步建议

1.  **功能验证**: 你现在可以尝试运行 `uv run fsm-skating-web --port 9000` 来验证端口是否已成功修改。
2.  **README 更新**: 建议在 `README.md` 中添加关于如何自定义端口和 IP 的说明文档。
3.  **正式提交**: 验证无误后，我们可以生成一个 `[COMMIT]` 计划将此变更提交到 Git。
