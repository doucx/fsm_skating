import pytest
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


def test_rotation_direction_inference(engine):
    # LFO (自然弯曲 CCW) -> LBI
    # 1. 前外转三 (turn_rotation: natural) 应当推导出 CCW 旋转
    # 2. 括弧步 (turn_rotation: opposite) 应当推导出 CW 旋转
    current = State.from_string("LFO")
    results = engine.get_possible_transitions(current)

    lbi_moves = [r for r in results if str(r["target_state"]) == "LBI"]
    assert len(lbi_moves) >= 2

    three_turn = [m for m in lbi_moves if "three_turn" in m["move"]["id"]][0]
    bracket = [m for m in lbi_moves if "bracket" in m["move"]["id"]][0]

    assert three_turn["move"]["rotation_dir"] == "CCW"
    assert bracket["move"]["rotation_dir"] == "CW"


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
    path = engine.generate_sequence(
        steps=5, max_difficulty=3, start_state=State.from_string("LFO")
    )
    assert path is not None
    assert len(path) == 6  # 5步动作产生 6 个状态
    # 验证生成的每一步是否都真实存在且符合难度要求
    for i in range(len(path) - 1):
        move = path[i][1]
        assert move["difficulty"] <= 3


def test_library_integrity(engine):
    report = engine.check_library_integrity()

    # 断言 6 大类别均被引擎正常捕获并加载
    core_categories = [
        "three_turn",
        "bracket",
        "rocker",
        "counter",
        "mohawk",
        "choctaw",
    ]
    for cat in core_categories:
        assert cat in report
        # 断言每一个分类都已经实现 100% 全边缘方向 (FO, FI, BO, BI) 覆盖
        assert len(report[cat]["implemented"]) == 4
        assert len(report[cat]["missing"]) == 0
        # 此时不应该再有依赖 generic 通用动作兜底的情况
        assert report[cat]["generic_count"] == 0
