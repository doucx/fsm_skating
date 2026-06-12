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