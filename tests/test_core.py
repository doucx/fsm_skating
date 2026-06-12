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
