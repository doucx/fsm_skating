我们现在进入 **第三阶段：API 路由升级与多模式支持**。

在这一阶段，我们将在 FastAPI 路由层中引入全新的接口，正式将动作驱动（Move-Centric）校验引擎暴露给客户端：
1. 升级后端导入声明，公开 `MoveVerificationResponse` 类型。
2. 新增一个 `POST` 请求接口 `/api/verify/moves`，支持接收动作 ID 序列和可选的初始状态，并返回状态链的物理演算和合规性结果。

以下是具体的实施计划。

## [WIP] feat: 在 FastAPI 路由层中新增动作驱动校验接口 (/api/verify/moves)

### 用户需求
我们需要允许前端或其他客户端应用（如 Web 界面或命令行应用）通过标准 HTTP 协议来校验一个动作序列。请求中不需要传递繁琐的刃状态，只需要传递动作 ID 链，后端 API 应当能返回完整的用刃状态演算结果和校验状态。

### 评论
通过标准的 RESTful API 暴露出新算法，可以让沙盒 TUI/Web 与底层物理模型充分解耦。这也使我们的软件可以通过简单的 JSON 格式，与任意第三方冰场电子板、训练统计软件进行网络集成。

### 目标
1. 在 `src/fsm_skating/api/main.py` 中，导入第二阶段定义的 `MoveVerificationResponse`。
2. 声明 `VerifyMovesRequest` Pydantic 请求模型。
3. 创建新的路由方法 `/api/verify/moves`，实现状态码错误控制，调用引擎底层演算并返回校验 JSON。

### 基本原理
1. 声明 `VerifyMovesRequest` 接收参数：`move_ids`（列表型，必需）和 `start_state`（字符型，可选）。
2. 在路由内部，如果接收到了 `start_state`，尝试用 `State.from_string` 进行反序列化，若格式不合规（如 `LXX`）则抛出 HTTP 400 Bad Request 错误。
3. 调用 `engine.verify_move_sequence` 计算物理链条。接口会自动将结果序列化为 `MoveVerificationResponse` 格式返回。

### 标签
#intent/build #flow/ready #priority/high
#comp/interfaces #comp/runtime #scope/api
#ai/instruct
#task/domain/engine
#task/object/api-route-extension
#task/action/implementation
#task/state/continue #task/status/active

---

### Script

#### Acts 1: 在 API 层中引入响应模型与声明请求模型

我们修改 `src/fsm_skating/api/main.py` 的顶部导入部分，并为新接口定义专用的请求体模型。

~~~~~act
patch_file
src/fsm_skating/api/main.py
~~~~~
~~~~~python.old
# 重定向导入路径到新的 DDD 层次结构
from fsm_skating.domain.models import State
from fsm_skating.services.engine import (
    ChoreographyEngine,
    VerificationResponse,
    MoveOption,
    Move,
)
~~~~~
~~~~~python.new
# 重定向导入路径到新的 DDD 层次结构
from fsm_skating.domain.models import State
from fsm_skating.services.engine import (
    ChoreographyEngine,
    VerificationResponse,
    MoveOption,
    Move,
    MoveVerificationResponse,
)
~~~~~

~~~~~act
patch_file
src/fsm_skating/api/main.py
~~~~~
~~~~~python.old
class VerifyRequest(BaseModel):
    sequence: str


class GenerateRequest(BaseModel):
~~~~~
~~~~~python.new
class VerifyRequest(BaseModel):
    sequence: str


class VerifyMovesRequest(BaseModel):
    move_ids: List[str]
    start_state: Optional[str] = None


class GenerateRequest(BaseModel):
~~~~~

#### Acts 2: 声明步法校验接口路由 `/api/verify/moves`

我们在 `/api/verify` 原有状态校验路由下方，追加 `/api/verify/moves` 接口定义。

~~~~~act
patch_file
src/fsm_skating/api/main.py
~~~~~
~~~~~python.old
@app.post("/api/verify", response_model=VerificationResponse)
def verify_sequence(request: VerifyRequest):
    if not engine:
        raise HTTPException(status_code=500, detail="ChoreographyEngine 未成功初始化。")
    return engine.verify_sequence(request.sequence)


@app.get("/api/transitions/{state_str}", response_model=List[MoveOption])
~~~~~
~~~~~python.new
@app.post("/api/verify", response_model=VerificationResponse)
def verify_sequence(request: VerifyRequest):
    if not engine:
        raise HTTPException(status_code=500, detail="ChoreographyEngine 未成功初始化。")
    return engine.verify_sequence(request.sequence)


@app.post("/api/verify/moves", response_model=MoveVerificationResponse)
def verify_moves_sequence(request: VerifyMovesRequest):
    if not engine:
        raise HTTPException(status_code=500, detail="ChoreographyEngine 未成功初始化。")

    start_state_obj = None
    if request.start_state:
        try:
            start_state_obj = State.from_string(request.start_state)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"无效的起始滑行状态: {e}")

    return engine.verify_move_sequence(request.move_ids, start_state_obj)


@app.get("/api/transitions/{state_str}", response_model=List[MoveOption])
~~~~~

### 下一步建议
1. **编写集成测试**：我们可以通过编写测试（或使用 FastAPI 提供的 `TestClient`）对这个网络接口进行端到端校验。
2. **开展第四阶段**：既然网络接口已经准备就绪，我们将进入前端。在前端代码中，我们需要修改 `web/js/api.js`，增加对新接口的网络封装，以便 Web 应用能流畅调用步法校验。
3. **完成前三阶段工作提交**：如果需要，我们可以首先运行全局 pytest 确保之前编写的所有测试通过，再向前端进军。你可以随时告诉我你想如何开始下一步。
