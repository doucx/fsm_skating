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