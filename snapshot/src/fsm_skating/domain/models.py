from typing import Dict, Any
from pydantic import BaseModel, Field, ConfigDict, model_serializer, model_validator


class State(BaseModel):
    """
    表示花样滑冰中的一个滑行瞬间状态。
    State = (Foot, Direction, Edge)
    """

    model_config = ConfigDict(frozen=True)

    foot: str = Field(..., pattern="^[LR]$")
    direction: str = Field(..., pattern="^[FB]$")
    edge: str = Field(..., pattern="^[OI]$")

    @model_serializer
    def serialize_model(self) -> str:
        """
        使 Pydantic 在转 JSON 时直接输出 "LFO" 字符串，而不是 {"foot":...}
        """
        return f"{self.foot}{self.direction}{self.edge}"

    @model_validator(mode="before")
    @classmethod
    def validate_before(cls, value: Any) -> Any:
        """
        允许在输入校验前从字符串、字典或已有对象实例化
        """
        if isinstance(value, str):
            s = value.strip().upper()
            if len(s) != 3:
                raise ValueError(
                    f"Invalid state format: '{s}'. Must be 3 characters, e.g., 'LFO'."
                )
            return {"foot": s[0], "direction": s[1], "edge": s[2]}
        return value

    @classmethod
    def from_string(cls, s: str) -> "State":
        """
        从简写字符串解析状态。例如: "LFO" -> 左前外刃
        """
        s = s.strip().upper()
        if len(s) != 3:
            raise ValueError(
                f"Invalid state format: '{s}'. Must be 3 characters, e.g., 'LFO'."
            )
        return cls(foot=s[0], direction=s[1], edge=s[2])

    def __str__(self) -> str:
        return f"{self.foot}{self.direction}{self.edge}"

    def __repr__(self) -> str:
        return f"State(foot='{self.foot}', direction='{self.direction}', edge='{self.edge}')"


def get_relative_conditions(s1: State, s2: State) -> Dict[str, bool]:
    """
    计算从状态 s1 转移到状态 s2 的相对物理条件。
    """
    return {
        "same_foot": s1.foot == s2.foot,
        "same_dir": s1.direction == s2.direction,
        "same_edge": s1.edge == s2.edge,
    }


def get_natural_curvature(state: State) -> str:
    """
    推导当前状态滑行轨迹的自然圆弧弯曲方向。
    """
    if state.foot == "L":
        if state.direction == "F":
            return "CCW" if state.edge == "O" else "CW"
        else:  # B
            return "CW" if state.edge == "O" else "CCW"
    else:  # R
        if state.direction == "F":
            return "CW" if state.edge == "O" else "CCW"
        else:  # B
            return "CCW" if state.edge == "O" else "CW"


# 8 个基础状态常量列表
ALL_STATES = [
    State(foot="L", direction="F", edge="O"),
    State(foot="L", direction="F", edge="I"),
    State(foot="L", direction="B", edge="O"),
    State(foot="L", direction="B", edge="I"),
    State(foot="R", direction="F", edge="O"),
    State(foot="R", direction="F", edge="I"),
    State(foot="R", direction="B", edge="O"),
    State(foot="R", direction="B", edge="I"),
]


def get_opposite_foot(foot: str) -> str:
    return "R" if foot == "L" else "L"


def get_opposite_direction(direction: str) -> str:
    return "B" if direction == "F" else "F"


def get_opposite_edge(edge: str) -> str:
    return "I" if edge == "O" else "O"


def calculate_next_state(current_state: State, conditions: dict) -> State:
    """
    根据相对运动物理条件计算并推导下一个滑行状态。
    """
    next_foot = (
        current_state.foot
        if conditions.get("same_foot", True)
        else get_opposite_foot(current_state.foot)
    )
    next_dir = (
        current_state.direction
        if conditions.get("same_dir", True)
        else get_opposite_direction(current_state.direction)
    )
    next_edge = (
        current_state.edge
        if conditions.get("same_edge", True)
        else get_opposite_edge(current_state.edge)
    )
    return State(foot=next_foot, direction=next_dir, edge=next_edge)
