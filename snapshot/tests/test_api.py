from fastapi.testclient import TestClient
from fsm_skating.api.main import app

client = TestClient(app)


def test_api_verify_sequence_success_unambiguous():
    """测试原有接口在唯一匹配情况下的 ambiguous 字段"""
    response = client.post("/api/verify", json={"sequence": "LFO -> LFI"})
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["is_ambiguous"] is False  # 变刃步是唯一的候选


def test_api_verify_sequence_success_ambiguous():
    """测试原有接口在歧义（多重路径）情况下的 ambiguous 字段"""
    response = client.post("/api/verify", json={"sequence": "LFI -> LBO"})
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["is_ambiguous"] is True  # LFI -> LBO 存在转三与括弧两种方式


def test_api_verify_moves_success():
    """测试新接口的动作路径状态推推演与序列化"""
    payload = {
        "move_ids": ["stroke", "forward_inside_three_turn"],
        "start_state": "LFO"
    }
    response = client.post("/api/verify/moves", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["valid"] is True
    assert data["total_difficulty"] == 4
    assert len(data["trace"]) == 2
    
    # 校验首步演算详情
    step1 = data["trace"][0]
    assert step1["from_state"]["foot"] == "L"
    assert step1["move"]["id"] == "stroke"
    assert step1["to_state"]["foot"] == "R"


def test_api_verify_moves_invalid_start_state():
    """测试输入不合法起始状态时的 HTTP 400 拦截行为"""
    payload = {
        "move_ids": ["stroke"],
        "start_state": "LXX"  # 非法字符
    }
    response = client.post("/api/verify/moves", json=payload)
    assert response.status_code == 400
    assert "无效的起始滑行状态" in response.json()["detail"]


def test_api_verify_moves_physics_conflict():
    """测试物理起滑约束不匹配时，API 应当平滑返回 valid=False 而非抛出 500"""
    payload = {
        "move_ids": ["forward_outside_three_turn"],
        "start_state": "LBO"  # 后滑起滑，但前外转三必须用前滑 'F'
    }
    response = client.post("/api/verify/moves", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert data["valid"] is False
    assert "要求以 'F' 向起滑" in data["error"]