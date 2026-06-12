import pytest
from fsm_skating.domain.models import (
    State,
    get_opposite_foot,
    get_opposite_direction,
    get_opposite_edge,
    calculate_next_state,
)
from fsm_skating.services.engine import ChoreographyEngine


def test_attribute_flipping():
    """验证基础属性翻转辅助函数"""
    assert get_opposite_foot("L") == "R"
    assert get_opposite_foot("R") == "L"
    assert get_opposite_direction("F") == "B"
    assert get_opposite_direction("B") == "F"
    assert get_opposite_edge("O") == "I"
    assert get_opposite_edge("I") == "O"


def test_calculate_next_state_derivation():
    """验证根据物理条件演算下一个状态的逻辑"""
    start = State.from_string("LFI")

    # 情况 A: 同脚、变向、变刃 (转三步/括弧步的条件)
    # LFI -> LBO
    cond_three_turn = {"same_foot": True, "same_dir": False, "same_edge": False}
    next_state = calculate_next_state(start, cond_three_turn)
    assert str(next_state) == "LBO"

    # 情况 B: 异脚、变向、同刃 (前内莫霍克步的条件)
    # LFI -> RBI
    cond_mohawk = {"same_foot": False, "same_dir": False, "same_edge": True}
    next_state_m = calculate_next_state(start, cond_mohawk)
    assert str(next_state_m) == "RBI"

    # 情况 C: 同脚、同向、变刃 (变刃步的条件)
    # LFI -> LFO
    cond_coe = {"same_foot": True, "same_dir": True, "same_edge": False}
    next_state_c = calculate_next_state(start, cond_coe)
    assert str(next_state_c) == "LFO"


@pytest.fixture
def engine():
    return ChoreographyEngine("config/moves_config.yaml")


def test_verification_ambiguity_flag(engine):
    """验证校验引擎对 DAG 歧义路径（多重候选）的识别能力"""

    # 1. 测试唯一路径序列 (LFO -> LFI 只有变刃步)
    res_unique = engine.verify_sequence("LFO -> LFI")
    assert res_unique.valid is True
    assert res_unique.is_ambiguous is False
    assert len(res_unique.transitions[0].candidate_moves) == 1

    # 2. 测试歧义路径序列 (LFI -> LBO 既可以是转三也可以是括弧)
    # 在 config 中，两者都满足同脚、变向、变刃，且起滑约束匹配
    res_ambiguous = engine.verify_sequence("LFI -> LBO")
    assert res_ambiguous.valid is True
    assert res_ambiguous.is_ambiguous is True
    # 期望至少有两个候选：forward_inside_three_turn 和 forward_inside_bracket
    assert len(res_ambiguous.transitions[0].candidate_moves) >= 2

    # 3. 测试包含一段歧义的长序列
    res_long = engine.verify_sequence("LFO -> LFI -> LBO")
    assert res_long.valid is True
    assert res_long.is_ambiguous is True  # 只要其中有一段有分叉，整个序列就是有歧义的