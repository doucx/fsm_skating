from typing import Dict

class State:
    """
    表示花样滑冰中的一个滑行瞬间状态。
    State = (Foot, Direction, Edge)
    """
    def __init__(self, foot: str, direction: str, edge: str):
        foot = foot.upper()
        direction = direction.upper()
        edge = edge.upper()

        if foot not in ("L", "R"):
            raise ValueError(f"Invalid Foot (脚): '{foot}'. Must be 'L' (左脚) or 'R' (右脚).")
        if direction not in ("F", "B"):
            raise ValueError(f"Invalid Direction (方向): '{direction}'. Must be 'F' (前向) or 'B' (后向).")
        if edge not in ("O", "I"):
            raise ValueError(f"Invalid Edge (用刃): '{edge}'. Must be 'O' (外刃) or 'I' (内刃).")

        self.foot = foot
        self.direction = direction
        self.edge = edge

    @classmethod
    def from_string(cls, s: str) -> "State":
        """
        从简写字符串解析状态。例如: "LFO" -> 左前外刃
        """
        s = s.strip().upper()
        if len(s) != 3:
            raise ValueError(f"Invalid state format: '{s}'. Must be 3 characters, e.g., 'LFO'.")
        return cls(s[0], s[1], s[2])

    def __str__(self) -> str:
        return f"{self.foot}{self.direction}{self.edge}"

    def __repr__(self) -> str:
        return f"State({self.foot}, {self.direction}, {self.edge})"

    def __eq__(self, other) -> bool:
        if not isinstance(other, State):
            return False
        return (self.foot == other.foot and 
                self.direction == other.direction and 
                self.edge == other.edge)

    def __hash__(self) -> int:
        return hash((self.foot, self.direction, self.edge))


def get_relative_conditions(s1: State, s2: State) -> Dict[str, bool]:
    """
    计算从状态 s1 转移到状态 s2 的相对物理条件比对属性：
    - same_foot: 是否同脚
    - same_dir: 是否同向
    - same_edge: 是否同刃
    """
    return {
        "same_foot": s1.foot == s2.foot,
        "same_dir": s1.direction == s2.direction,
        "same_edge": s1.edge == s2.edge,
    }


# 8 个基础状态常量列表
ALL_STATES = [
    State("L", "F", "O"),
    State("L", "F", "I"),
    State("L", "B", "O"),
    State("L", "B", "I"),
    State("R", "F", "O"),
    State("R", "F", "I"),
    State("R", "B", "O"),
    State("R", "B", "I"),
]