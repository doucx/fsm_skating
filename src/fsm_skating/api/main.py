import os
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# 重定向导入路径到新的 DDD 层次结构
from fsm_skating.domain.models import State
from fsm_skating.services.engine import (
    ChoreographyEngine,
    VerificationResponse,
    MoveOption,
    Move,
)

app = FastAPI(
    title="❄️ FSM Skating API",
    description="花样滑冰步法智能编排与校验计算核心 REST API 端口",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

config_path = os.path.join(os.path.dirname(__file__), "../../../moves_config.yaml")
if not os.path.exists(config_path):
    config_path = "moves_config.yaml"

try:
    engine = ChoreographyEngine(config_path)
except Exception as e:
    print(f"[-] WARNING: 初始化 ChoreographyEngine 失败，请检查配置文件路径。错误: {e}")
    engine = None


class VerifyRequest(BaseModel):
    sequence: str


class GenerateRequest(BaseModel):
    steps: int
    max_difficulty: int = 5
    start_state: Optional[str] = None


class GeneratedStep(BaseModel):
    state: State
    move: Optional[Move] = None


@app.post("/api/verify", response_model=VerificationResponse)
def verify_sequence(request: VerifyRequest):
    if not engine:
        raise HTTPException(status_code=500, detail="ChoreographyEngine 未成功初始化。")
    return engine.verify_sequence(request.sequence)


@app.get("/api/transitions/{state_str}", response_model=List[MoveOption])
def get_transitions(state_str: str, max_difficulty: int = Query(5, ge=1, le=5)):
    if not engine:
        raise HTTPException(status_code=500, detail="ChoreographyEngine 未成功初始化。")
    try:
        state = State.from_string(state_str)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"无效的状态代码: {e}")

    return engine.get_possible_transitions(state, max_difficulty)


@app.post("/api/generate", response_model=List[GeneratedStep])
def generate_sequence(request: GenerateRequest):
    if not engine:
        raise HTTPException(status_code=500, detail="ChoreographyEngine 未成功初始化。")

    start_state_obj = None
    if request.start_state:
        try:
            start_state_obj = State.from_string(request.start_state)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"无效的起始滑行状态: {e}")

    path = engine.generate_sequence(
        request.steps, request.max_difficulty, start_state_obj
    )
    if path is None:
        raise HTTPException(
            status_code=422,
            detail="在给定的动作最大难度限制下，无法规划出不进入死胡同的滑行链路。请尝试调大难度上限。",
        )

    return [GeneratedStep(state=s, move=m) for s, m in path]


@app.get("/api/integrity")
def get_integrity_report():
    if not engine:
        raise HTTPException(status_code=500, detail="ChoreographyEngine 未成功初始化。")
    return engine.check_library_integrity()


web_dir = os.path.join(os.path.dirname(__file__), "../../../web")
if os.path.exists(web_dir):
    app.mount("/", StaticFiles(directory=web_dir, html=True), name="static")


def start():
    """供入口脚本调用，启动 Uvicorn 服务"""
    import uvicorn

    uvicorn.run("fsm_skating.api.main:app", host="127.0.0.1", port=8000, reload=True)
