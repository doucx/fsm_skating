import pytest
from fsm_skating.engine import ChoreographyEngine
from fsm_skating.core import State


@pytest.fixture
def engine():
    return ChoreographyEngine("moves_config.yaml")


def test_load_config(engine):
    assert len(engine.moves) > 0
    assert engine.moves[0]["id"] == "change_of_edge"


def test_transitions_filtering(engine):
    # LFO (左前外) -> LFI (左前内)
    current = State.from_string("LFO")
    results = engine.get_possible_transitions(current)

    lfi_moves = [r for r in results if str(r.target_state) == "LFI"]
    assert len(lfi_moves) >= 1
    # 属性访问替换：r.move.id
    assert lfi_moves[0].move.id == "change_of_edge"


def test_rotation_direction_inference(engine):
    current = State.from_string("LFO")
    results = engine.get_possible_transitions(current)

    lbi_moves = [r for r in results if str(r.target_state) == "LBI"]
    assert len(lbi_moves) >= 2

    # 属性访问替换：m.move.id
    three_turn = [m for m in lbi_moves if "three_turn" in m.move.id][0]
    bracket = [m for m in lbi_moves if "bracket" in m.move.id][0]

    # 属性访问替换：move.rotation_dir
    assert three_turn.move.rotation_dir == "CCW"
    assert bracket.move.rotation_dir == "CW"


def test_verify_sequence(engine):
    res = engine.verify_sequence("RFI -> LBI")
    # 校验对象从 dict 改为 Response 实例
    assert res.valid is True
    assert res.transitions[0].selected_move.id == "forward_inside_mohawk"


def test_invalid_sequence(engine):
    res = engine.verify_sequence("LFO -> LFO")
    assert res.valid is False
    assert "原地停滞" in res.error


def test_generate_sequence(engine):
    path = engine.generate_sequence(
        steps=5, max_difficulty=3, start_state=State.from_string("LFO")
    )
    assert path is not None
    assert len(path) == 6
    for i in range(len(path) - 1):
        move = path[i][1]
        assert move.difficulty <= 3


def test_library_integrity(engine):
    report = engine.check_library_integrity()

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
        assert len(report[cat]["implemented"]) == 4
        assert len(report[cat]["missing"]) == 0
        assert report[cat]["generic_count"] == 0