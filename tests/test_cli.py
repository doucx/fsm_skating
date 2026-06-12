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