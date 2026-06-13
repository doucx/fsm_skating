import os
import yaml
import random
from typing import List, Dict, Tuple, Any, Optional
from pydantic import BaseModel

# 引入重构后的领域模型命名空间
from fsm_skating.domain.models import State, get_relative_conditions, ALL_STATES


def check_match(
    current_state: State, target_state: State, move_config: Dict[str, Any]
) -> bool:
    """
    双重规则匹配逻辑。
    """
    conditions = move_config.get("conditions", {})
    actual_conditions = get_relative_conditions(current_state, target_state)

    if (
        conditions.get("same_foot") != actual_conditions["same_foot"]
        or conditions.get("same_dir") != actual_conditions["same_dir"]
        or conditions.get("same_edge") != actual_conditions["same_edge"]
    ):
        return False

    if "start_constraints" in move_config:
        constraints = move_config["start_constraints"]
        if "dir" in constraints and current_state.direction != constraints["dir"]:
            return False
        if "edge" in constraints and current_state.edge != constraints["edge"]:
            return False

    return True


class Move(BaseModel):
    id: str
    name: str
    category: str
    difficulty: int
    turn_rotation: Optional[str] = None
    conditions: Dict[str, bool]
    start_constraints: Optional[Dict[str, str]] = None
    rotation_dir: Optional[str] = None
    geometry_config: Optional[Dict[str, float]] = None  # 新增透传因子字段


class MoveOption(BaseModel):
    target_state: State
    move: Move


class TransitionDetail(BaseModel):
    from_state: State
    to_state: State
    candidate_moves: List[Move]
    selected_move: Move


class VerificationResponse(BaseModel):
    valid: bool
    error: Optional[str] = None
    states: Optional[List[State]] = None
    transitions: Optional[List[TransitionDetail]] = None
    total_difficulty: int = 0
    is_ambiguous: bool = False


class MoveVerificationDetail(BaseModel):
    from_state: State
    move: Move
    to_state: State


class MoveVerificationResponse(BaseModel):
    valid: bool
    error: Optional[str] = None
    trace: Optional[List[MoveVerificationDetail]] = None
    total_difficulty: int = 0


class ChoreographyEngine:
    """
    花样滑冰状态机编排与过滤引擎。
    """

    def __init__(self, config_path: str):
        self.config_path = config_path
        self.moves = self._load_config()

    def _load_config(self) -> List[Dict[str, Any]]:
        if not os.path.exists(self.config_path):
            raise FileNotFoundError(
                f"Configuration file not found at: {self.config_path}"
            )
        with open(self.config_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return data.get("moves", [])

    def _build_move(self, move_data: Dict[str, Any], current_state: State) -> Move:
        from fsm_skating.domain.models import get_natural_curvature

        turn_rot = move_data.get("turn_rotation")
        abs_rot = None
        if turn_rot == "natural":
            abs_rot = get_natural_curvature(current_state)
        elif turn_rot == "opposite":
            start_curv = get_natural_curvature(current_state)
            abs_rot = "CW" if start_curv == "CCW" else "CCW"

        return Move(
            id=move_data["id"],
            name=move_data["name"],
            category=move_data["category"],
            difficulty=move_data["difficulty"],
            turn_rotation=move_data.get("turn_rotation"),
            conditions=move_data["conditions"],
            start_constraints=move_data.get("start_constraints"),
            rotation_dir=abs_rot,
            geometry_config=move_data.get("geometry_config"),
        )

    def get_possible_transitions(
        self, current_state: State, max_difficulty: int = 999
    ) -> List[MoveOption]:
        """
        管道式过滤核心逻辑：获取当前滑行状态下合规的下一个转移分支。
        """
        results: List[MoveOption] = []

        for target_state in ALL_STATES:
            if target_state == current_state:
                continue

            for move_data in self.moves:
                if check_match(current_state, target_state, move_data):
                    diff = move_data.get("difficulty", 0)
                    if diff <= max_difficulty:
                        move_obj = self._build_move(move_data, current_state)

                        results.append(
                            MoveOption(target_state=target_state, move=move_obj)
                        )

        results.sort(key=lambda x: (x.move.difficulty, x.move.name))
        return results

    def verify_sequence(self, sequence_str: str) -> VerificationResponse:
        """
        验证用刃状态序列，解析出每一个物理动作及难度评分。
        """
        parts = [p.strip().upper() for p in sequence_str.split("->") if p.strip()]
        states: List[State] = []
        for part in parts:
            try:
                states.append(State.from_string(part))
            except ValueError as e:
                return VerificationResponse(
                    valid=False,
                    error=f"状态字符 '{part}' 格式有误: {str(e)}",
                )

        if len(states) < 2:
            return VerificationResponse(
                valid=False,
                error="状态序列中至少需要包含 2 个有效状态才能进行转移校验。",
            )

        transitions_details: List[TransitionDetail] = []
        total_difficulty = 0

        for i in range(len(states) - 1):
            s_from = states[i]
            s_to = states[i + 1]

            if s_from == s_to:
                return VerificationResponse(
                    valid=False,
                    error=f"第 {i + 1} 步转移出现原地停滞 ({s_from} -> {s_to})，这不符合动力学步法转移规则。",
                )

            matched_moves: List[Move] = []
            for move_data in self.moves:
                if check_match(s_from, s_to, move_data):
                    move_obj = self._build_move(move_data, s_from)
                    matched_moves.append(move_obj)

            if not matched_moves:
                return VerificationResponse(
                    valid=False,
                    error=f"无法识别的物理转移: 从状态 {s_from} 无法直接通过任何已知动作转移到 {s_to}。",
                )

            matched_moves.sort(key=lambda m: (m.difficulty, m.name))

            transitions_details.append(
                TransitionDetail(
                    from_state=s_from,
                    to_state=s_to,
                    candidate_moves=matched_moves,
                    selected_move=matched_moves[0],
                )
            )
            total_difficulty += matched_moves[0].difficulty

        is_ambiguous = any(len(t.candidate_moves) > 1 for t in transitions_details)

        return VerificationResponse(
            valid=True,
            states=states,
            transitions=transitions_details,
            total_difficulty=total_difficulty,
            is_ambiguous=is_ambiguous,
        )

    def verify_move_sequence(
        self, move_ids: List[str], start_state: Optional[State] = None
    ) -> MoveVerificationResponse:
        """
        动作驱动校验器：输入动作 ID 序列，自动演化滑行状态并进行全段物理合法性校验。
        """
        if not move_ids:
            return MoveVerificationResponse(valid=False, error="动作 ID 序列不能为空。")

        # 缓存配置字典，便于 O(1) 检索
        move_db = {m["id"]: m for m in self.moves}

        # 确定起始滑行状态
        current_state = start_state
        if not current_state:
            # 尝试推导首个动作的缺省起滑状态
            first_move_data = move_db.get(move_ids[0])
            if not first_move_data:
                return MoveVerificationResponse(
                    valid=False, error=f"无法识别序列起始处的动作 ID: {move_ids[0]}"
                )
            constraints = first_move_data.get("start_constraints", {})
            dir_c = constraints.get("dir", "F")
            edge_c = constraints.get("edge", "O")
            # 缺省选用左脚（L），完全符合标准的编排惯例
            current_state = State(foot="L", direction=dir_c, edge=edge_c)

        trace_details: List[MoveVerificationDetail] = []
        total_difficulty = 0

        for idx, move_id in enumerate(move_ids):
            move_data = move_db.get(move_id)
            if not move_data:
                return MoveVerificationResponse(
                    valid=False,
                    error=f"在第 {idx + 1} 步检测到未知动作 ID: '{move_id}'",
                )

            # 1. 起滑方向与用刃约束检查
            constraints = move_data.get("start_constraints")
            if constraints:
                if (
                    "dir" in constraints
                    and current_state.direction != constraints["dir"]
                ):
                    return MoveVerificationResponse(
                        valid=False,
                        error=f"第 {idx + 1} 步动作校验失败：动作 '{move_data['name']}' 要求以 '{constraints['dir']}' 向起滑，但当前滑行状态为 '{current_state}'。",
                    )
                if "edge" in constraints and current_state.edge != constraints["edge"]:
                    return MoveVerificationResponse(
                        valid=False,
                        error=f"第 {idx + 1} 步动作校验失败：动作 '{move_data['name']}' 要求以 '{constraints['edge']}' 内外刃起滑，但当前滑行状态为 '{current_state}'。",
                    )

            # 2. 调用第一阶段新引入的状态推导核心演算下一个状态
            from fsm_skating.domain.models import (
                calculate_next_state,
            )

            conditions = move_data["conditions"]
            next_state = calculate_next_state(current_state, conditions)

            # 3. 统一推导旋转体并构建 Move 对象
            move_obj = self._build_move(move_data, current_state)

            trace_details.append(
                MoveVerificationDetail(
                    from_state=current_state,
                    move=move_obj,
                    to_state=next_state,
                )
            )
            total_difficulty += move_obj.difficulty
            current_state = next_state

        return MoveVerificationResponse(
            valid=True,
            trace=trace_details,
            total_difficulty=total_difficulty,
        )

    def generate_sequence(
        self, steps: int, max_difficulty: int, start_state: Optional[State] = None
    ) -> Optional[List[Tuple[State, Optional[Move]]]]:
        """
        智能随机生成模块。
        """
        if steps <= 0:
            return []

        init_state = start_state if start_state else random.choice(ALL_STATES)

        def dfs(
            curr_state: State, remaining_steps: int
        ) -> Optional[List[Tuple[State, Move]]]:
            if remaining_steps == 0:
                return []

            options = self.get_possible_transitions(curr_state, max_difficulty)
            if not options:
                return None

            shuffled_options = list(options)
            random.shuffle(shuffled_options)

            for opt in shuffled_options:
                nxt_state = opt.target_state
                move = opt.move

                sub_path = dfs(nxt_state, remaining_steps - 1)
                if sub_path is not None:
                    return [(nxt_state, move)] + sub_path

            return None

        sub_path = dfs(init_state, steps)
        if sub_path is None:
            return None

        result: List[Tuple[State, Optional[Move]]] = []
        curr = init_state
        for nxt_state, move in sub_path:
            result.append((curr, move))
            curr = nxt_state
        result.append((curr, None))

        return result

    def check_library_integrity(self) -> Dict[str, Any]:
        """
        检查动作库中各类别动作的覆盖度 (FO, FI, BO, BI)。
        """
        with open(self.config_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        categories = data.get(
            "categories",
            {
                "three_turn": "转三步 (Three-Turn)",
                "bracket": "括弧步 (Bracket)",
                "rocker": "摇滚步 (Rocker)",
                "counter": "计数步 (Counter)",
                "mohawk": "莫霍克步 (Mohawk)",
                "choctaw": "乔克陶步 (Choctaw)",
            },
        )

        required = ["FO", "FI", "BO", "BI"]
        report = {}

        for cat_id, cat_name in categories.items():
            report[cat_id] = {
                "name": cat_name,
                "implemented": [],
                "missing": list(required),
                "generic_count": 0,
            }

        for move in self.moves:
            cat_id = move.get("category")
            if not cat_id or cat_id not in report:
                continue

            constraints = move.get("start_constraints")
            if constraints and "dir" in constraints and "edge" in constraints:
                variant = f"{constraints['dir']}{constraints['edge']}"
                if variant in required:
                    if variant not in report[cat_id]["implemented"]:
                        report[cat_id]["implemented"].append(variant)
                    if variant in report[cat_id]["missing"]:
                        report[cat_id]["missing"].remove(variant)
            else:
                report[cat_id]["generic_count"] += 1

        return report
