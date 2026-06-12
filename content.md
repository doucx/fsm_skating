我们现在将创建一个端到端（E2E）接口集成测试文件 `tests/test_api.py`。

这个测试集将利用 FastAPI 的 `TestClient` 来模拟网络客户端，对我们刚刚扩展的 API 进行网络层面的集成验证，包括：
1. 原有状态验证接口 `/api/verify` 返回新增的歧义标志（`is_ambiguous`）。
2. 新动作驱动接口 `/api/verify/moves` 的正常推导（HTTP 200）。
3. 传递不合规起始状态格式时的错误拦截（HTTP 400）。
4. 物理约束不匹配时的平滑失败（HTTP 200，但 `valid=False`）。

以下是具体的实施计划。

## [WIP] test: 创建 FastAPI 路由层端到端接口集成测试文件 (test_api.py)

### 用户需求
需要对 HTTP API 接口在网络层面的输入输出模型进行自动化检测，确保新增的路由功能能够被前端通过 HTTP 协议流畅、安全地调用。

### 评论
接口集成测试是保障 API 稳定性的重要手段，尤其是能验证 Pydantic 模型到 JSON 序列化/反序列化的全链路行为。这对于后续联调前端 Web 界面有极大的保障。

### 目标
1. 新建 `tests/test_api.py`。
2. 编写 `/api/verify` 集成测试，验证歧义属性 `is_ambiguous` 的序列化是否正确。
3. 编写 `/api/verify/moves` 正常校验与参数无效拦截的测试。
4. 验证当动作链内部产生物理冲突时，API 是否能够返回合法的 JSON 状态，而不是崩溃抛出 HTTP 500。

### 基本原理
我们将使用 FastAPI 官方自带的 `fastapi.testclient.TestClient`，在测试环境下实例化整个 Web App，从而发起模拟的 `POST` 网络请求，对 HTTP 响应的状态码（`status_code`）和响应 JSON 数据体进行断言。

### 标签
#intent/tooling #flow/ready #priority/medium
#comp/interfaces #comp/tests #scope/api
#ai/instruct
#task/domain/testing
#task/object/api-integration-tests
#task/action/implementation
#task/state/continue #task/status/active

---

### Script

#### Acts 1: 创建 API 网络层集成测试文件

我们将新建 `tests/test_api.py` 并编写覆盖各种网络请求场景的测试代码。

~~~~~act
write_file
tests/test_api.py
~~~~~
~~~~~python
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
~~~~~

### 下一步建议
1. **运行全部测试用例**：我们在终端执行全局测试 `pytest`，确保我们前三个阶段（领域层、引擎层、API 网络层）开发的所有新特性及原有历史用例全部以 100% 成功率通过。
2. **开展第四阶段（前端适配）**：
    *   修改 Web 服务端的静态 API 文件（`web/js/api.js`）来封装对新接口 `/api/verify/moves` 的 POST 交互请求。
    *   在 HTML/JS 逻辑中，我们需要规划如何在界面中让用户能够切换至动作校验模式。

如果你准备好了，我们可以开始前端层面的集成工作。
