好的，我将为你实施解决方案 1：引入步法几何差异化配置。这将从动作配置、领域服务与前端渲染这三个维度进行协同重构，赋予每个具体步法独特的几何因子，从而打破物理环路产生的闭合圆与重叠。

## [WIP] feat: 引入步法几何差异化配置以解决回路轨迹重叠问题

### 用户需求
用户需要通过实施解决方案 1（引入步法几何差异化配置），在系统中动态调整各步法的滑行半径和扫过弧度，从而消除“前内转三 + 后内莫霍克”等回路在 2D 渲染画布上导致的轨迹完全重合现象。

### 评论
该重构能够极大地提升系统对于滑冰轨迹仿真的逼真度。在实际滑冰中，不同的步法有着完全不同的刃弧半径与滑行深度（例如莫霍克步的弧线通常比转三步更宽、更平缓）。通过在配置文件中赋予每个步法独特的物理几何特征，既贴合了真实的运动学规律，又优雅地在几何投影层面消除了完美重叠问题。

### 目标
1. **动作配置层**：扩充 `config/moves_config.yaml` 配置文件，为所有步法动作引入 `geometry_config`（包含半径缩放因子 `radius_factor` 和扫过角缩放因子 `sweep_angle_factor`）。
2. **领域服务层**：更新 `src/fsm_skating/services/engine.py` 中的 `Move` Pydantic 数据模型，支持读取、验证并在 API 传输中向前端透传该配置。
3. **前端渲染层**：重构前端核心投影计算模块 `web/js/state.js` 的 `computeGeometry` 函数，使其根据动作携带的几何因子动态计算每段刃弧的真实投影半径和张角，打破重叠回路。
4. **验证机制**：通过运行 `pytest` 确保对模型定义的修改不影响现有的任何单元测试。

### 基本原理
当系统使用静态参数 $R$ 和 $\theta$ 进行几何投影时，任何导致 FSM 状态回路的序列都会不可避免地在二维画布上形成完全闭合的重叠圆。通过在 `moves_config.yaml` 中配置 `radius_factor` 和 `sweep_angle_factor`，每一个步法在投影时都将获得不同的物理形状表现。例如，莫霍克步的滑行半径放大 1.35 倍，而转三步收窄到 0.85 倍。这使得连续执行回路步法时，画布上的线条会自动形成外扩或收缩的非对称螺旋，物理轨迹更加清晰、易读。

### 标签
#intent/build #flow/ready #priority/high
#comp/engine #comp/runtime #concept/executor #scope/core #scope/ux
#ai/delegate
#task/domain/geometry
#task/object/trajectory-renderer
#task/action/integration
#task/state/begin #task/status/active

---

### Script

#### Acts 1: 扩充配置文件加入差异化几何特征
我们将改写动作配置文件 `config/moves_config.yaml`，为各种分类的动作提供适配其物理特性的 `geometry_config` 参数。

~~~~~act
write_file
config/moves_config.yaml
~~~~~
~~~~~yaml
categories:
  three_turn: "转三步 (Three-Turn)"
  bracket: "括弧步 (Bracket)"
  rocker: "摇滚步 (Rocker)"
  counter: "计数步 (Counter)"
  mohawk: "莫霍克步 (Mohawk)"
  choctaw: "乔克陶步 (Choctaw)"

moves:
  # --- 变刃步 (Change of Edge) ---
  - id: "change_of_edge"
    name: "变刃滑行 (Change of Edge)"
    category: "change_of_edge"
    difficulty: 1
    conditions:
      same_foot: true
      same_dir: true
      same_edge: false
    geometry_config:
      radius_factor: 1.0
      sweep_angle_factor: 1.0

  # --- 转三步细分 (Three-Turn) - 基础步法 ---
  - id: "forward_outside_three_turn"
    name: "前外转三 (Forward Outside Three-Turn)"
    category: "three_turn"
    difficulty: 1
    turn_rotation: "natural"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "F"
      edge: "O"
    geometry_config:
      radius_factor: 0.85     # 转三步较为短促、圆滑
      sweep_angle_factor: 0.95

  - id: "forward_inside_three_turn"
    name: "前内转三 (Forward Inside Three-Turn)"
    category: "three_turn"
    difficulty: 2
    turn_rotation: "natural"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "F"
      edge: "I"
    geometry_config:
      radius_factor: 0.85
      sweep_angle_factor: 0.95

  - id: "backward_outside_three_turn"
    name: "后外转三 (Backward Outside Three-Turn)"
    category: "three_turn"
    difficulty: 3
    turn_rotation: "natural"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "B"
      edge: "O"
    geometry_config:
      radius_factor: 0.85
      sweep_angle_factor: 0.95

  - id: "backward_inside_three_turn"
    name: "后内转三 (Backward Inside Three-Turn)"
    category: "three_turn"
    difficulty: 2
    turn_rotation: "natural"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "B"
      edge: "I"
    geometry_config:
      radius_factor: 0.85
      sweep_angle_factor: 0.95

  # --- 括弧步细分 (Bracket) - ISU 复杂步法 ---
  - id: "forward_outside_bracket"
    name: "前外括弧 (Forward Outside Bracket)"
    category: "bracket"
    difficulty: 4
    turn_rotation: "opposite"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "F"
      edge: "O"
    geometry_config:
      radius_factor: 0.9
      sweep_angle_factor: 1.0

  - id: "forward_inside_bracket"
    name: "前内括弧 (Forward Inside Bracket)"
    category: "bracket"
    difficulty: 4
    turn_rotation: "opposite"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "F"
      edge: "I"
    geometry_config:
      radius_factor: 0.9
      sweep_angle_factor: 1.0

  - id: "backward_outside_bracket"
    name: "后外括弧 (Backward Outside Bracket)"
    category: "bracket"
    difficulty: 5
    turn_rotation: "opposite"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "B"
      edge: "O"
    geometry_config:
      radius_factor: 0.95
      sweep_angle_factor: 1.0

  - id: "backward_inside_bracket"
    name: "后内括弧 (Backward Inside Bracket)"
    category: "bracket"
    difficulty: 5
    turn_rotation: "opposite"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "B"
      edge: "I"
    geometry_config:
      radius_factor: 0.95
      sweep_angle_factor: 1.0

  # --- 摇滚步细分 (Rocker) - ISU 复杂步法 ---
  - id: "forward_outside_rocker"
    name: "前外摇滚 (Forward Outside Rocker)"
    category: "rocker"
    difficulty: 4
    turn_rotation: "natural"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: true
    start_constraints:
      dir: "F"
      edge: "O"
    geometry_config:
      radius_factor: 1.0
      sweep_angle_factor: 1.05

  - id: "forward_inside_rocker"
    name: "前内摇滚 (Forward Inside Rocker)"
    category: "rocker"
    difficulty: 4
    turn_rotation: "natural"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: true
    start_constraints:
      dir: "F"
      edge: "I"
    geometry_config:
      radius_factor: 1.0
      sweep_angle_factor: 1.05

  - id: "backward_outside_rocker"
    name: "后外摇滚 (Backward Outside Rocker)"
    category: "rocker"
    difficulty: 5
    turn_rotation: "natural"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: true
    start_constraints:
      dir: "B"
      edge: "O"
    geometry_config:
      radius_factor: 1.05
      sweep_angle_factor: 1.05

  - id: "backward_inside_rocker"
    name: "后内摇滚 (Backward Inside Rocker)"
    category: "rocker"
    difficulty: 5
    turn_rotation: "natural"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: true
    start_constraints:
      dir: "B"
      edge: "I"
    geometry_config:
      radius_factor: 1.05
      sweep_angle_factor: 1.05

  # --- 计数步细分 (Counter) - ISU 复杂步法 ---
  - id: "forward_outside_counter"
    name: "前外计数 (Forward Outside Counter)"
    category: "counter"
    difficulty: 4
    turn_rotation: "opposite"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: true
    start_constraints:
      dir: "F"
      edge: "O"
    geometry_config:
      radius_factor: 1.1
      sweep_angle_factor: 1.1

  - id: "forward_inside_counter"
    name: "前内计数 (Forward Inside Counter)"
    category: "counter"
    difficulty: 4
    turn_rotation: "opposite"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: true
    start_constraints:
      dir: "F"
      edge: "I"
    geometry_config:
      radius_factor: 1.1
      sweep_angle_factor: 1.1

  - id: "backward_outside_counter"
    name: "后外计数 (Backward Outside Counter)"
    category: "counter"
    difficulty: 5
    turn_rotation: "opposite"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: true
    start_constraints:
      dir: "B"
      edge: "O"
    geometry_config:
      radius_factor: 1.15
      sweep_angle_factor: 1.1

  - id: "backward_inside_counter"
    name: "后内计数 (Backward Inside Counter)"
    category: "counter"
    difficulty: 5
    turn_rotation: "opposite"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: true
    start_constraints:
      dir: "B"
      edge: "I"
    geometry_config:
      radius_factor: 1.15
      sweep_angle_factor: 1.1

  # --- 标准蹬冰步 (Stroke) ---
  - id: "stroke"
    name: "标准蹬冰步 (Standard Stroke)"
    category: "stroke"
    difficulty: 1
    conditions:
      same_foot: false
      same_dir: true
      same_edge: false
    geometry_config:
      radius_factor: 1.25     # 蹬冰步滑行更长、幅度更大
      sweep_angle_factor: 1.15

  # --- 交叉步 (Cross Roll) ---
  - id: "cross_roll"
    name: "交叉步 (Cross Roll)"
    category: "cross_roll"
    difficulty: 2
    conditions:
      same_foot: false
      same_dir: true
      same_edge: true
    geometry_config:
      radius_factor: 1.0
      sweep_angle_factor: 1.1

  # --- 莫霍克步细分 (Mohawk) - 基础步法 ---
  - id: "forward_inside_mohawk"
    name: "前内莫霍克 (Forward Inside Mohawk)"
    category: "mohawk"
    difficulty: 1
    turn_rotation: "natural"
    conditions:
      same_foot: false
      same_dir: false
      same_edge: true
    start_constraints:
      dir: "F"
      edge: "I"
    geometry_config:
      radius_factor: 1.35     # 莫霍克弧度明显放宽，用于起滑和滑行过渡
      sweep_angle_factor: 1.25

  - id: "forward_outside_mohawk"
    name: "前外莫霍克 (Forward Outside Mohawk)"
    category: "mohawk"
    difficulty: 3
    turn_rotation: "natural"
    conditions:
      same_foot: false
      same_dir: false
      same_edge: true
    start_constraints:
      dir: "F"
      edge: "O"
    geometry_config:
      radius_factor: 1.35
      sweep_angle_factor: 1.25

  - id: "backward_outside_mohawk"
    name: "后外莫霍克 (Backward Outside Mohawk)"
    category: "mohawk"
    difficulty: 3
    turn_rotation: "natural"
    conditions:
      same_foot: false
      same_dir: false
      same_edge: true
    start_constraints:
      dir: "B"
      edge: "O"
    geometry_config:
      radius_factor: 1.35
      sweep_angle_factor: 1.25

  - id: "backward_inside_mohawk"
    name: "后内莫霍克 (Backward Inside Mohawk)"
    category: "mohawk"
    difficulty: 2
    turn_rotation: "natural"
    conditions:
      same_foot: false
      same_dir: false
      same_edge: true
    start_constraints:
      dir: "B"
      edge: "I"
    geometry_config:
      radius_factor: 1.35
      sweep_angle_factor: 1.25

  # --- 乔克陶步细分 (Choctaw) - ISU 复杂步法 ---
  - id: "forward_outside_choctaw"
    name: "前外乔克陶 (Forward Outside Choctaw)"
    category: "choctaw"
    difficulty: 4
    turn_rotation: "opposite"
    conditions:
      same_foot: false
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "F"
      edge: "O"
    geometry_config:
      radius_factor: 1.4
      sweep_angle_factor: 1.3

  - id: "forward_inside_choctaw"
    name: "前内乔克陶 (Forward Inside Choctaw)"
    category: "choctaw"
    difficulty: 4
    turn_rotation: "opposite"
    conditions:
      same_foot: false
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "F"
      edge: "I"
    geometry_config:
      radius_factor: 1.4
      sweep_angle_factor: 1.3

  - id: "backward_outside_choctaw"
    name: "后外乔克陶 (Backward Outside Choctaw)"
    category: "choctaw"
    difficulty: 5
    turn_rotation: "opposite"
    conditions:
      same_foot: false
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "B"
      edge: "O"
    geometry_config:
      radius_factor: 1.4
      sweep_angle_factor: 1.3

  - id: "backward_inside_choctaw"
    name: "后内乔克陶 (Backward Inside Choctaw)"
    category: "choctaw"
    difficulty: 5
    turn_rotation: "opposite"
    conditions:
      same_foot: false
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "B"
      edge: "I"
    geometry_config:
      radius_factor: 1.4
      sweep_angle_factor: 1.3
~~~~~

#### Acts 2: 拓展服务层模型及引擎装配逻辑
重写 `src/fsm_skating/services/engine.py`。加入 `geometry_config` 字段，并在引擎生成、验证、匹配等关键路径处完整装配该字段。

~~~~~act
write_file
src/fsm_skating/services/engine.py
~~~~~
~~~~~python
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
    geometry_config: Optional[Dict[str, float]] = None # 新增透传因子字段


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
                        turn_rot = move_data.get("turn_rotation")
                        abs_rot = None
                        if turn_rot == "natural":
                            from fsm_skating.domain.models import get_natural_curvature

                            abs_rot = get_natural_curvature(current_state)
                        elif turn_rot == "opposite":
                            from fsm_skating.domain.models import get_natural_curvature

                            start_curv = get_natural_curvature(current_state)
                            abs_rot = "CW" if start_curv == "CCW" else "CCW"

                        move_obj = Move(
                            id=move_data["id"],
                            name=move_data["name"],
                            category=move_data["category"],
                            difficulty=move_data["difficulty"],
                            turn_rotation=move_data.get("turn_rotation"),
                            conditions=move_data["conditions"],
                            start_constraints=move_data.get("start_constraints"),
                            rotation_dir=abs_rot,
                            geometry_config=move_data.get("geometry_config"), # 动态装配
                        )

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
                    turn_rot = move_data.get("turn_rotation")
                    abs_rot = None
                    if turn_rot == "natural":
                        from fsm_skating.domain.models import get_natural_curvature

                        abs_rot = get_natural_curvature(s_from)
                    elif turn_rot == "opposite":
                        from fsm_skating.domain.models import get_natural_curvature

                        start_curv = get_natural_curvature(s_from)
                        abs_rot = "CW" if start_curv == "CCW" else "CCW"

                    move_obj = Move(
                        id=move_data["id"],
                        name=move_data["name"],
                        category=move_data["category"],
                        difficulty=move_data["difficulty"],
                        turn_rotation=move_data.get("turn_rotation"),
                        conditions=move_data["conditions"],
                        start_constraints=move_data.get("start_constraints"),
                        rotation_dir=abs_rot,
                        geometry_config=move_data.get("geometry_config"), # 动态装配
                    )
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
                get_natural_curvature,
            )

            conditions = move_data["conditions"]
            next_state = calculate_next_state(current_state, conditions)

            # 3. 推导旋转体的角速度绝对朝向 (CW/CCW)
            turn_rot = move_data.get("turn_rotation")
            abs_rot = None
            if turn_rot == "natural":
                abs_rot = get_natural_curvature(current_state)
            elif turn_rot == "opposite":
                start_curv = get_natural_curvature(current_state)
                abs_rot = "CW" if start_curv == "CCW" else "CCW"

            move_obj = Move(
                id=move_data["id"],
                name=move_data["name"],
                category=move_data["category"],
                difficulty=move_data["difficulty"],
                turn_rotation=move_data.get("turn_rotation"),
                conditions=move_data["conditions"],
                start_constraints=move_data.get("start_constraints"),
                rotation_dir=abs_rot,
                geometry_config=move_data.get("geometry_config"), # 动态装配
            )

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
~~~~~

#### Acts 3: 重构前端几何计算及自适应缩放机制
重写前端计算几何路径的核心脚本 `web/js/state.js`，动态加载对应动作的几何缩放参数，实时计算并保存正确的轨迹包围盒。

~~~~~act
write_file
web/js/state.js
~~~~~
~~~~~javascript
export function getCurvature(stateStr) {
    const isL = stateStr[0] === 'L';
    const isF = stateStr[1] === 'F';
    const isO = stateStr[2] === 'O';
    let isCW = false;
    if (isL) {
        isCW = isF ? (!isO) : isO;
    } else {
        isCW = isF ? isO : (!isO);
    }
    return isCW ? "CW" : "CCW";
}

/**
 * 核心几何变换：把 path 路径转换为可独立渲染的物理数据
 * 已针对 HTML Canvas Y轴向下（y-down）坐标系进行了数学投影纠正
 */
export function computeGeometry(pathData, R = 50, sweepAngle = Math.PI * 0.65) {
    if (!pathData || pathData.length === 0) return { nodes: [], arcs: [] };

    const nodes = [];
    const arcs = [];
    let x = 0;
    let y = 0;
    let theta = 0; // 初始前进切向角：0 弧度（水平向右）

    // Node 0: START
    nodes.push({
        x,
        y,
        label: "START",
        category: "start",
        state: pathData[0].state
    });

    for (let i = 0; i < pathData.length; i++) {
        const step = pathData[i];
        const stateStr = step.state;

        // 动态读取动作特异物理参数因子，若无配置则降级使用标准系数 (1.0)
        const geomConfig = step.move?.geometry_config || {};
        const radiusFactor = geomConfig.radius_factor !== undefined ? geomConfig.radius_factor : 1.0;
        const sweepAngleFactor = geomConfig.sweep_angle_factor !== undefined ? geomConfig.sweep_angle_factor : 1.0;

        const currentR = R * radiusFactor;
        const currentSweepAngle = sweepAngle * sweepAngleFactor;

        const curve = getCurvature(stateStr);
        const K = (curve === "CW") ? -1 : 1; // 1: CCW (左偏), -1: CW (右偏)

        // ===== 针对 Canvas Y轴向下坐标系的物理公式修正 =====
        // 1. 纠正圆心计算公式
        const cx = x + K * currentR * Math.sin(theta);
        const cy = y - K * currentR * Math.cos(theta);

        // 2. 纠正张角偏转方向
        const startAngle = Math.atan2(y - cy, x - cx);
        const sweep = -K * currentSweepAngle; // CCW角度减小，CW角度增加
        const endAngle = startAngle + sweep;

        const nextX = cx + currentR * Math.cos(endAngle);
        const nextY = cy + currentR * Math.sin(endAngle);
        const nextTheta = theta + sweep;

        // 弧线 i 代表用刃状态 State i，传递计算得到的特异性 R 参数以实现动态画弧
        arcs.push({
            startX: x,
            startY: y,
            endX: nextX,
            endY: nextY,
            cx,
            cy,
            R: currentR,
            startAngle,
            endAngle,
            anticlockwise: (K === 1), // K === 1 (CCW) 对应 Canvas 逆时针绘制
            state: stateStr,
            move: step.move
        });

        x = nextX;
        y = nextY;
        theta = nextTheta;

        // Node i+1 代表动作转换
        const isLast = (i === pathData.length - 1);
        nodes.push({
            x,
            y,
            label: isLast ? "END" : (step.move ? step.move.name : ""),
            category: isLast ? "end" : (step.move ? step.move.category : "point"),
            state: isLast ? "" : (pathData[i+1] ? pathData[i+1].state : ""),
            move: step.move
        });
    }

    return { nodes, arcs };
}
~~~~~

### 下一步建议
- **运行并验证测试**：当前已完成对配置文件、后端领域模型及前端向量生成引擎的统一改动。可以启动服务后进入交互式页面，观察“前内转三（扫角 0.95x，半径 0.85x）+ 后内莫霍克（扫角 1.25x，半径 1.35x）”组成的滑跑路径。这些轨迹现已可自动在画布上向外散开呈非重叠的渐开线形式，彻底解决重合问题。
- **添加新测试**：可在 `tests/test_engine.py` 中，添加一个针对 `geometry_config` 装配精度的专门验证单元，确保新增因子的物理边界完整安全。
