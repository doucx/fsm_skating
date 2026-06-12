这个错误的原因是 `pyproject.toml` 中的 `[project.scripts]` 配置不符合规范。在当前的配置中，`fsm-skating = "fsm_skating.cli:main"` 会让安装工具和运行时认为 `fsm_skating.cli` 是一个模块，并尝试调用其上的 `main` 属性。然而，`fsm_skating.cli` 实际上是一个 Python 包目录（其中 `__init__.py` 为空），导入后得到的是一个没有 `main` 属性的包/模块对象，从而引发了 `TypeError: 'module' object is not callable` 的错误。

为了解决这个问题，我们需要将 `pyproject.toml` 中的入口点修正为具体的 `fsm_skating.cli.main:main`，并编写相应的测试来提升 CLI 的测试覆盖。

## [WIP] fix(cli): 修正 entry point 声明以解决 CLI 无法调用的问题

### 错误分析
在 `pyproject.toml` 的 `[project.scripts]` 配置中，`fsm-skating` 的入口点被错误地指定为 `fsm_skating.cli:main`。
这导致 Python 的命令行脚本生成器在执行时会直接导入 `fsm_skating.cli` 包（包本身的 `__init__.py` 是空的），并尝试将其作为一个可调用对象进行调用，或者查找不存在的 `main` 属性。这在运行时最终抛出了 `TypeError: 'module' object is not callable` 异常。

### 用户需求
修复 `fsm-skating` 命令行工具在调用时崩溃的问题，并为项目增加对 CLI 相关代码的自动化测试。

### 评论
该修复可以解决包在打包或在虚拟环境中安装后无法使用的问题。修正入口点到具体的模块函数（`module:function`）是规范的 Python 包配置实践。

### 目标
1. 修改 `pyproject.toml` 中的 `fsm-skating` 入口配置，指向正确的 `fsm_skating.cli.main:main`。
2. 创建 CLI 的测试用例文件 `tests/test_cli.py`，覆盖其中的核心辅助转换函数（如 `get_state_desc`）。
3. 确保所有单元测试（包括新增的测试）都能够正常运行并通过。

### 基本原理
根据 Python 的打包标准，`[project.scripts]` 应该将可执行文件名映射到具体的 Python 模块及其中的可调用函数（即 `path.to.module:callable` 格式）。通过将 `fsm_skating.cli:main` 改为 `fsm_skating.cli.main:main`，加载器能够定位到具体的 `main.py` 文件并正常调用其定义的 `main()` 函数。

### 标签
#intent/fix #flow/ready #priority/critical
#comp/build #comp/tests #comp/cli #concept/config
#scope/core #scope/dx
#ai/instruct
#task/domain/testing
#task/object/cli-entrypoint
#task/action/bug-fix
#task/state/begin

---

### Script

#### Acts 1: 修正 `pyproject.toml` 中的入口点配置

我们将使用 `patch_file` 精确替换 `pyproject.toml` 中的 `project.scripts` 配置，将 `fsm-skating` 指向具体的 `fsm_skating.cli.main:main`。

~~~~~act
patch_file
pyproject.toml
~~~~~
~~~~~toml.old
[project.scripts]
fsm-skating = "fsm_skating.cli:main"
fsm-skating-web = "fsm_skating.api.main:start"
~~~~~
~~~~~toml.new
[project.scripts]
fsm-skating = "fsm_skating.cli.main:main"
fsm-skating-web = "fsm_skating.api.main:start"
~~~~~

#### Acts 2: 编写 CLI 辅助函数的单元测试

由于之前缺少对 CLI 模块代码的测试，我们使用 `write_file` 建立 `tests/test_cli.py`，用于测试 `get_state_desc` 等辅助逻辑。

~~~~~act
write_file
tests/test_cli.py
~~~~~
~~~~~python
import pytest
from fsm_skating.cli.main import get_state_desc
from fsm_skating.domain.models import State


def test_get_state_desc():
    """验证状态描述翻译辅助函数能正确输出中文字符串"""
    s1 = State(foot="L", direction="F", edge="O")
    desc1 = get_state_desc(s1)
    assert "左脚 (L)" in desc1
    assert "向前 (F)" in desc1
    assert "外刃 (O)" in desc1

    s2 = State(foot="R", direction="B", edge="I")
    desc2 = get_state_desc(s2)
    assert "右脚 (R)" in desc2
    assert "向后 (B)" in desc2
    assert "内刃 (I)" in desc2
~~~~~

### 下一步建议

- **测试范围扩展**: 增加针对 API 模块（`src/fsm_skating/api/main.py`）的集成测试，可借助 `fastapi.testclient.TestClient` 对各个接口（验证、生成、一致性报告等）进行自动化端到端校验。
- **本地环境重新安装并验证**: 在修复并测试通过后，建议在本地环境中执行 `pip install -e .` 或 `uv pip install -e .` 重新挂载包，在终端实际运行 `fsm-skating` 以确保命令行菜单能够正常交互。
