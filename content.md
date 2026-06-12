你的观察非常及时。

**错误分析**:
这是引入 Pydantic 后的预期副作用。Pydantic 的 `BaseModel` **不支持位置参数**进行初始化（例如 `State("L", "F", "O")`），它强制要求使用**关键字参数**（例如 `State(foot="L", direction="F", edge="O")`）。原有的测试代码仍在使用旧的初始化风格，因此抛出了 `TypeError`。

我将生成一个计划来修复测试用例，使其适配 Pydantic 模型。

## [WIP] fix: 适配 Pydantic 模型的关键字参数初始化以修复测试失败

### 错误分析
在 `tests/test_core.py` 中，`test_state_creation` 和 `test_state_invalid_creation` 直接通过位置参数 `State("L", "F", "O")` 实例化对象。由于 `State` 现在继承自 `pydantic.BaseModel`，其构造函数仅接受一个位置参数（`self`）和若干关键字参数。此外，Pydantic 抛出的校验错误类型是 `ValidationError` 而不是原生的 `ValueError`。

### 用户需求
修复测试套件，确保 `test_core.py` 在 Pydantic 模型下运行通过。

### 评论
单元测试是重构的保护网。虽然 Pydantic 改变了 API 签名，但通过将测试更新为关键字参数，我们不仅修复了错误，还提高了测试代码的可读性。

### 目标
1.  更新 `tests/test_core.py` 中的实例化语句，改用关键字参数。
2.  更新错误捕获逻辑，对于非法状态字段，捕获 `pydantic.ValidationError`。
3.  确保 `State.from_string` 抛出的 `ValueError` 逻辑依然被正确覆盖。

### 基本原理
将 `State(...)` 调用显式化。对于 Pydantic 而言，字段正则匹配 (`pattern`) 失败会在 `__init__` 时触发 `ValidationError`。而自定义的 `from_string` 静态方法内部依然手动抛出 `ValueError`，我们需要分别针对这两者进行断言。

### 标签
#intent/fix #flow/ready #priority/high 
#comp/tests #concept/state #scope/core 
#ai/instruct
#task/domain/testing #task/object/test-suite #task/action/bug-fix
#task/state/continue #task/status/active

---

### Script

#### Acts 1: 修复 `tests/test_core.py`

我们将修改测试用例，使用关键字参数并引入 `ValidationError` 断言。

~~~~~act
write_file
tests/test_core.py
~~~~~
~~~~~python
import pytest
from pydantic import ValidationError
from fsm_skating.core import State, get_relative_conditions

def test_state_creation():
    # Pydantic 必须使用关键字参数
    s = State(foot="L", direction="F", edge="O")
    assert str(s) == "LFO"
    assert s.foot == "L"
    assert s.direction == "F"
    assert s.edge == "O"

def test_state_invalid_creation():
    # 1. 测试字段级别的 Pydantic 校验 (pattern 失败)
    with pytest.raises(ValidationError):
        State(foot="X", direction="F", edge="O")
    
    with pytest.raises(ValidationError):
        State(foot="L", direction="U", edge="O")

    # 2. 测试自定义 factory 方法的逻辑校验
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

### 下一步建议

现在测试应该可以全数通过了。

**接下来的建议步骤（继续重构）：**
- **重构 Engine 返回值模型化**：正如之前提到的，我们需要将 `engine.py` 中的 `get_possible_transitions` 的返回类型从 `List[Dict]` 改为 `List[MoveOption]`（或者一个包含 `MoveOption` 列表的 `TransitionResponse` 模型）。这能让前端通过 API 获取数据时，直接拥有清晰的 JSON Schema。

如果你确认测试已通过，我们可以开始进行 **“第二步：重构 Engine 表现层逻辑”**。
