import pytest
from fsm_skating.services.engine import ChoreographyEngine
from fsm_skating.domain.models import State


@pytest.fixture
def engine():
    return ChoreographyEngine("config/moves_config.yaml")


def test_verify_move_sequence_success(engine):
    """
    测试成功的动作序列推导:
    1. 标准蹬冰 (Stroke)
    2. 前内转三 (Forward Inside Three-Turn)
    """
    # LFO 起始
    start = State.from_string("LFO")
    moves = ["stroke", "forward_inside_three_turn"]
    
    res = engine.verify_move_sequence(moves, start_state=start)
    
    assert res.valid is True
    assert len(res.trace) == 2
    
    # 第一步: LFO --(Stroke)--> RFI
    # Stroke 条件: 异脚(F), 同向(T), 变刃(F)
    step1 = res.trace[0]
    assert str(step1.from_state) == "LFO"
    assert step1.move.id == "stroke"
    assert str(step1.to_state) == "RFI"
    
    # 第二步: RFI --(Forward Inside Three-Turn)--> RBO
    # Three-Turn 条件: 同脚(T), 变向(F), 变刃(F)
    # 且 RFI 符合该动作的 Start Constraints (F, I)
    step2 = res.trace[1]
    assert str(step2.from_state) == "RFI"
    assert step2.move.id == "forward_inside_three_turn"
    assert str(step2.to_state) == "RBO"
    
    # 难度: 1 (Stroke) + 3 (FI 3-Turn) = 4
    assert res.total_difficulty == 4


def test_verify_move_sequence_default_start(engine):
    """验证在不提供起始状态时，系统能自动推导"""
    # 首个动作是前外转三，其约束是 F, O。系统应默认给出 LFO。
    moves = ["forward_outside_three_turn"]
    res = engine.verify_move_sequence(moves)
    
    assert res.valid is True
    assert str(res.trace[0].from_state) == "LFO"


def test_verify_move_sequence_failure_constraints(engine):
    """验证动作起滑约束冲突的情况"""
    # 起始于 LBO (后滑)
    start = State.from_string("LBO")
    # 尝试做一个必须前滑起步的动作
    moves = ["forward_outside_three_turn"]
    
    res = engine.verify_move_sequence(moves, start_state=start)
    
    assert res.valid is False
    assert "要求以 'F' 向起滑" in res.error
    assert "当前滑行状态为 'LBO'" in res.error


def test_verify_move_sequence_complex_chain(engine):
    """测试较长且包含异脚变换的复杂链条"""
    # 序列: LFO -> (Stroke) -> RFI -> (FI Mohawk) -> LBI -> (BI Three-Turn) -> LFO
    moves = ["stroke", "forward_inside_mohawk", "backward_inside_three_turn"]
    start = State.from_string("LFO")
    
    res = engine.verify_move_sequence(moves, start_state=start)
    
    assert res.valid is True
    assert str(res.trace[0].to_state) == "RFI"
    assert str(res.trace[1].to_state) == "LBI"
    assert str(res.trace[2].to_state) == "LFO"
    assert res.total_difficulty == 1 + 2 + 4  # 7