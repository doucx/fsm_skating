import pytest
from fsm_skating.services.engine import ChoreographyEngine
from fsm_skating.domain.models import State


@pytest.fixture
def engine():
    return ChoreographyEngine("config/moves_config.yaml")


def test_search_paths_direct(engine):
    """验证直接相邻状态（中间间隔 0 个状态）的检索"""
    start = State.from_string("LFO")
    end = State.from_string("LFI")

    # 间隔 0 个状态意味着刚好有 1 次直接用刃转移
    paths = engine.search_paths(start, end, intermediate_count=0)
    assert len(paths) >= 1
    
    for p in paths:
        assert len(p) == 2
        assert str(p[0][0]) == "LFO"
        assert str(p[1][0]) == "LFI"
        assert p[0][1].id == "change_of_edge"


def test_search_paths_with_intermediates(engine):
    """验证包含 1 个中间状态的转移路径检索"""
    start = State.from_string("LFO")
    end = State.from_string("RBO")

    # 寻找 LFO -> Intermediate -> RBO 路径 (中间 1 个状态，共 2 次转换)
    paths = engine.search_paths(start, end, intermediate_count=1)
    assert len(paths) > 0

    for p in paths:
        assert len(p) == 3
        assert str(p[0][0]) == "LFO"
        assert str(p[2][0]) == "RBO"
        assert p[0][1] is not None
        assert p[1][1] is not None
        assert p[2][1] is None  # 结束节点上动作绑定为空


def test_search_paths_no_solution(engine):
    """验证无合规转移物理动作时的返回情况"""
    start = State.from_string("LFO")
    end = State.from_string("RBO")

    # LFO 直接 1 步转移到 RBO 是不被物理配置允许的（间隔0）
    paths = engine.search_paths(start, end, intermediate_count=0)
    assert len(paths) == 0