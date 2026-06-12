from typing import Dict
from pydantic import BaseModel, Field, ConfigDict


class State(BaseModel):
    """
    表示花样滑冰中的一个滑行瞬间状态。
    State = (Foot, Direction, Edge)
    """

    model_config = ConfigDict(frozen=True)

    foot: str = Field(..., pattern="^[LR]$")
    direction: str = Field(..., pattern="^[FB]$")
    edge: str = Field(..., pattern="^[OI]$")

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
