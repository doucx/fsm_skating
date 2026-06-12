import pytest

# 引入新的 services 层与 domain 层
from fsm_skating.services.engine import ChoreographyEngine
from fsm_skating.domain.models import State


@pytest.fixture
def engine():
    return ChoreographyEngine("config/moves_config.yaml")


def test_load_config(engine):
    assert len(engine.moves) > 0
    assert engine.moves[0]["id"] == "change_of_edge"


def test_transitions_filtering(engine):
    current = State.from_string("LFO")
    results = engine.get_possible_transitions(current)

    lfi_moves = [r for r in results if str(r.target_state) == "LFI"]
    assert len(lfi_moves) >= 1
    assert lfi_moves[0].move.id == "change_of_edge"


def test_rotation_direction_inference(engine):
    current = State.from_string("LFO")
    results = engine.get_possible_transitions(current)

    lbi_moves = [r for r in results if str(r.target_state) == "LBI"]
    assert len(lbi_moves) >= 2

    three_turn = [m for m in lbi_moves if "three_turn" in m.move.id][0]
    bracket = [m for m in lbi_moves if "bracket" in m.move.id][0]

    assert three_turn.move.rotation_dir == "CCW"
    assert bracket.move.rotation_dir == "CW"


def test_verify_sequence(engine):
    res = engine.verify_sequence("RFI -> LBI")
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
