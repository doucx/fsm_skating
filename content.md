好的。为了确保系统的健壮性并拥抱现代 Python 开发流程，我们将：
1. **引入 `uv` 管理器**：通过在 `pyproject.toml` 中添加 `dev-dependencies` 并配置 `uv` 环境，利用其极速的包管理能力。
2. **编写 `pytest` 测试套件**：
   - `tests/test_core.py`：测试状态解析、非法输入拦截及物理关系计算。
   - `tests/test_engine.py`：测试引擎加载、动作匹配、序列合法性校验以及基于 DFS 的随机路径生成。

下面是本次实施的计划。

## [WIP] test: 添加核心逻辑测试并引入 uv 管理项目

### 用户需求
使用 `pytest` 编写测试，并引入 `uv` 作为项目管理工具，以提升开发效率和测试的覆盖率。

### 评论
`uv` 是目前 Python 生态中最快的包管理器之一，且完美支持 `pyproject.toml` 标准。结合 `pytest` 的参数化测试功能，我们可以高效地验证 8 个状态之间的 56 种潜在转移关系是否符合白皮书中的物理定义。

### 目标
1. 修改 `pyproject.toml` 以包含测试依赖并适配 `uv`。
2. 编写 `tests/test_core.py` 验证 `State` 物理模型。
3. 编写 `tests/test_engine.py` 验证核心编排引擎算法。
4. 提供 `README.md` 说明如何使用 `uv` 运行测试。

### 基本原理
1. 在 `pyproject.toml` 中增加 `[dependency-groups]` (PEP 735 风格) 或 `[tool.uv]` 的 `dev-dependencies`。
2. `pytest` 通过 `monkeypatch` 或直接加载本地 `moves_config.yaml` 来进行集成测试。

### 标签
#intent/tooling #flow/ready #priority/high 
#comp/build #comp/tests #scope/dx #scope/core
#ai/delegate
#task/domain/testing
#task/object/test-suite-and-uv
#task/action/integration
#task/state/continue #task/status/active

---

### Script

#### Acts 1: 更新 `pyproject.toml` 以支持 `uv` 和开发依赖

我们将添加 `pytest` 到开发依赖中。

~~~~~act
patch_file
pyproject.toml
~~~~~
~~~~~toml
    "pyyaml>=6.0",
]

[project.scripts]
~~~~~
~~~~~toml
    "pyyaml>=6.0",
]

[tool.uv]
dev-dependencies = [
    "pytest>=7.0",
]

[project.scripts]
~~~~~

#### Acts 2: 编写物理模型测试 `tests/test_core.py`

验证状态的正确解析和物理差异比对逻辑。

~~~~~act
write_file
tests/test_core.py
~~~~~
~~~~~python
import pytest
from fsm_skating.core import State, get_relative_conditions

def test_state_creation():
    s = State("L", "F", "O")
    assert str(s) == "LFO"
    assert s.foot == "L"
    assert s.direction == "F"
    assert s.edge == "O"

def test_state_invalid_creation():
    with pytest.raises(ValueError, match="Invalid Foot"):
        State("X", "F", "O")
    with pytest.raises(ValueError, match="Invalid Direction"):
        State("L", "U", "O")
    with pytest.raises(ValueError, match="Invalid state format"):
        State.from_string("LF")

def test_relative_conditions():
    s1 = State.from_string("LFO")
    s2 = State.from_string("LBI")
    conds = get_relative_conditions(s1, s2)
    assert conds["same_foot"] is True
    assert conds["same_dir"] is False
    assert conds["same_edge"] is False

    s3 = State.from_string("RFO")
    conds2 = get_relative_conditions(s1, s3)
    assert conds2["same_foot"] is False
    assert conds2["same_dir"] is True
    assert conds2["same_edge"] is True
~~~~~

#### Acts 3: 编写引擎逻辑测试 `tests/test_engine.py`

验证加载配置、动作过滤匹配、序列校验和路径生成。

~~~~~act
write_file
tests/test_engine.py
~~~~~
~~~~~python
import pytest
import os
from fsm_skating.engine import ChoreographyEngine
from fsm_skating.core import State

@pytest.fixture
def engine():
    # 假设 moves_config.yaml 在项目根目录
    return ChoreographyEngine("moves_config.yaml")

def test_load_config(engine):
    assert len(engine.moves) > 0
    assert engine.moves[0]["id"] == "change_of_edge"

def test_transitions_filtering(engine):
    # LFO (左前外) 
    # 转移到 LFI (左前内) 应该是 变刃滑行 (Change of Edge), 难度 1
    current = State.from_string("LFO")
    results = engine.get_possible_transitions(current)
    
    # 寻找目标为 LFI 的动作
    lfi_moves = [r for r in results if str(r["target_state"]) == "LFI"]
    assert len(lfi_moves) >= 1
    assert lfi_moves[0]["move"]["id"] == "change_of_edge"

def test_verify_sequence(engine):
    # 前内莫霍克 (RFI -> LBI) 是 conditions: foot=False, dir=False, edge=True, start: F, I
    res = engine.verify_sequence("RFI -> LBI")
    assert res["valid"] is True
    assert res["transitions"][0]["selected_move"]["id"] == "forward_inside_mohawk"

def test_invalid_sequence(engine):
    # 原地停滞校验
    res = engine.verify_sequence("LFO -> LFO")
    assert res["valid"] is False
    assert "原地停滞" in res["error"]

def test_generate_sequence(engine):
    # 测试随机生成 5 步
    path = engine.generate_sequence(steps=5, max_difficulty=3, start_state=State.from_string("LFO"))
    assert path is not None
    assert len(path) == 6 # 5步动作产生 6 个状态
    # 验证生成的每一步是否都真实存在且符合难度要求
    for i in range(len(path) - 1):
        move = path[i][1]
        assert move["difficulty"] <= 3
~~~~~

#### Acts 4: 创建 `README.md` 说明 `uv` 使用方法

~~~~~act
write_file
README.md
~~~~~
~~~~~markdown
# 花样滑冰步法智能编排状态机 (FSM Skating)

基于有限状态机 (FSM) 的花滑步法智能编排引擎。

## 开发与管理 (使用 uv)

本项目使用 [uv](https://github.com/astral-sh/uv) 进行管理。

### 1. 安装环境与依赖
```bash
uv sync
```

### 2. 运行测试
```bash
uv run pytest
```

### 3. 安装项目为可编辑模式
```bash
uv pip install -e .
```

### 4. 运行程序 (待 CLI 完成后)
```bash
uv run fsm-skating
```
~~~~~

### 下一步建议
1. 在测试通过后，我们将实现 `src/fsm_skating/cli.py`。
2. CLI 将包含三个子模块：
   - `interactive`：手动编排模式。
   - `verify`：序列校验模式。
   - `generate`：自动随机生成模式。
3. 完善程序的异常处理和用户交互体验。
