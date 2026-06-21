已收到指令，我将严格遵循 ACA 运行时协议和 Quipu 文件修改策略。由于在 `services/engine.py` 中引入 A* 算法需要跨越多处进行修改（新增头文件引入、新增数据类、修改初始化函数并预构建距离矩阵、重写搜索算法主干），修改点分布超过 3 处，我将采用 `write_file` 操作进行全量覆盖替换，以确保结构的完整和稳健。

## [WIP] feat(engine): 引入 A* 启发式搜索算法优化高难度步法路径检索

### 用户需求
1. 将 `search_paths` 方法的底层算法从深度优先搜索 (DFS) 升级为 A* (A-Star) 启发式搜索算法。
2. 引入 `ChoreoSearchNode` 状态节点以跟踪动作多样性和转体平衡度的历史特征。
3. 利用广度优先搜索 (BFS) 在引擎初始化时预计算状态间的**最短物理距离矩阵**，用于可达性绝对剪枝。
4. 设计以距离、平衡度、动作多样性和总难度为复合因素的启发函数 $h(n)$，引导算法更快收敛到高质量的滑行方案。

### 评论
这是一次将“盲目寻路”升级为“受约束的多目标规划”的关键架构演进。DFS 虽然实现简单，但在具有深度约束或苛刻难度要求的编排搜索中极易引发组合爆炸或返回低质量（高度重复）的路径。引入 A* 和领域驱动的启发函数后，系统具备了前瞻性的剪枝能力，从而保证检索出来的高难度步法在“多样性”和“方向平衡”上天然契合 ISU 的裁判定级规范。

### 目标
1. 修改 `src/fsm_skating/services/engine.py` 文件，导入 `heapq` 库和 `dataclasses` 模块。
2. 定义 `ChoreoSearchNode` 数据类，用于在优先级队列中存储状态上下文。
3. 在 `ChoreographyEngine.__init__` 中新增并调用 `_build_distance_matrix` 预计算距离矩阵。
4. 完全重写 `search_paths` 方法，利用启发函数计算 `f_score`，并在 `Closed Set` 集合中引入多维 Hash 防止同等物理状态下的优劣路径互相覆盖。

### 基本原理
通过引入基于距离、平衡、多样性的 Penalty (惩罚值)，我们将复杂的 ISU 编排规则映射为了纯粹的数学代价值。$g(n)$ 鼓励动作难度（难度越高代价抵扣越多），而 $h(n)$ 会精确惩罚偏科的动作分布。`Closed Set` 的判断键中加入了 `categories_used` 和 `cw_count` 等特征的 Hash 值，确保即使物理滑行状态相同，包含不同动作历史和旋转成分的路径也不会被错误地剪枝，从而保障了结果解空间的多样性。

### 标签
#intent/build #flow/ready #priority/high
#comp/engine #concept/executor #scope/core
#ai/instruct 
#task/domain/core #task/object/search-algorithm #task/action/implementation #task/state/begin

---

### Script

#### Acts 1: 全量更新编排引擎文件，部署 A* 寻路算法

我们将重写 `services/engine.py`，完整保留此前的配置加载、路径生成和校验功能，同时植入全新的 `ChoreoSearchNode` 数据类、矩阵预计算函数和 `search_paths` 寻路逻辑。

~~~~~act
write_file
src/fsm_skating/services/engine.py
~~~~~
~~~~~python
import os
import yaml
import random
import heapq
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Any, Optional, Set
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
    geometry_config: Optional[Dict[str, float]] = None


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


@dataclass(order=True)
class ChoreoSearchNode:
    f_score: float
    current_state: State = field(compare=False)
    path_depth: int = field(compare=False)
    path: List[Tuple[State, Optional[Move]]] = field(compare=False)
    accumulated_difficulty: int = field(compare=False)
    categories_used: Set[str] = field(compare=False)
    cw_count: int = field(compare=False)
    ccw_count: int = field(compare=False)


class ChoreographyEngine:
    """
    花样滑冰状态机编排与过滤引擎。
    """

    def __init__(self, config_path: str):
        self.config_path = config_path
        config_data = self._load_config_data()
        self.moves = config_data.get("moves", [])
        self.categories = config_data.get("categories", {})
        self.distance_matrix = self._build_distance_matrix()

    def _build_distance_matrix(self) -> Dict[str, Dict[str, float]]:
        """
        BFS 预计算任意两状态间的最短步数，用于 A* 算法的启发式可达性绝对剪枝。
        """
        matrix = {str(s): {str(target): float('inf') for target in ALL_STATES} for s in ALL_STATES}
        
        for start in ALL_STATES:
            queue = [(start, 0)]
            matrix[str(start)][str(start)] = 0
            visited = {str(start)}
            
            while queue:
                curr, dist = queue.pop(0)
                options = self.get_possible_transitions(curr)
                for opt in options:
                    nxt_str = str(opt.target_state)
                    if nxt_str not in visited:
                        visited.add(nxt_str)
                        matrix[str(start)][nxt_str] = dist + 1
                        queue.append((opt.target_state, dist + 1))
                        
        return matrix

    def _load_config_data(self) -> Dict[str, Any]:
        if not os.path.exists(self.config_path):
            raise FileNotFoundError(
                f"Configuration file not found at: {self.config_path}"
            )
        with open(self.config_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return data if data else {}

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

        move_db = {m["id"]: m for m in self.moves}

        current_state = start_state
        if not current_state:
            first_move_data = move_db.get(move_ids[0])
            if not first_move_data:
                return MoveVerificationResponse(
                    valid=False, error=f"无法识别序列起始处的动作 ID: {move_ids[0]}"
                )
            constraints = first_move_data.get("start_constraints", {})
            dir_c = constraints.get("dir", "F")
            edge_c = constraints.get("edge", "O")
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

            from fsm_skating.domain.models import calculate_next_state

            conditions = move_data["conditions"]
            next_state = calculate_next_state(current_state, conditions)

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
        categories = (
            self.categories
            if self.categories
            else {
                "three_turn": "转三步 (Three-Turn)",
                "bracket": "括弧步 (Bracket)",
                "rocker": "摇滚步 (Rocker)",
                "counter": "计数步 (Counter)",
                "mohawk": "莫霍克步 (Mohawk)",
                "choctaw": "乔克陶步 (Choctaw)",
            }
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

    def search_paths(
        self,
        start_state: State,
        end_state: State,
        intermediate_count: int,
        max_difficulty: int = 5,
        max_results: int = 10,
    ) -> List[List[Tuple[State, Optional[Move]]]]:
        """
        使用 A* 算法检索物理轨迹，综合评估距离、难度、旋转平衡度和类别多样性，
        使高难度搜索时能更快收敛到高质量的最优滑行路线。
        """
        target_steps = intermediate_count + 1
        results: List[List[Tuple[State, Optional[Move]]]] = []
        
        # 启发函数特征权重配置 (调节偏好)
        C_STEP = 10.0      # 单步执行的基础惩罚代价
        C_DIFF = 3.0       # 动作难度奖励抵扣乘数 (鼓励高难度)
        C_BALANCE = 15.0   # 旋转平衡度失调的惩罚因子
        C_DIVERSITY = 20.0 # 动作类别缺乏多样性的惩罚因子
        TARGET_CATEGORIES = 4
        
        open_set = []
        node_id = 0
        
        init_node = ChoreoSearchNode(
            f_score=0.0,
            current_state=start_state,
            path_depth=0,
            path=[(start_state, None)],
            accumulated_difficulty=0,
            categories_used=set(),
            cw_count=0,
            ccw_count=0
        )
        
        heapq.heappush(open_set, (init_node.f_score, node_id, init_node))
        closed_set = set()
        
        while open_set and len(results) < max_results:
            _, _, curr = heapq.heappop(open_set)
            
            # 达成深度条件判定
            if curr.path_depth == target_steps:
                if curr.current_state == end_state:
                    results.append(curr.path)
                continue
                
            # 使用包含丰富历史特征的复合 Key 作为防重复回溯验证，
            # 确保不抹杀“途径不同但到达同一物理状态”的优质路径。
            state_key = (
                curr.current_state,
                curr.path_depth,
                frozenset(curr.categories_used),
                curr.cw_count,
                curr.ccw_count
            )
            if state_key in closed_set:
                continue
            closed_set.add(state_key)
            
            options = self.get_possible_transitions(curr.current_state, max_difficulty)
            
            for opt in options:
                next_state = opt.target_state
                move = opt.move
                
                remaining_steps = target_steps - (curr.path_depth + 1)
                min_dist = self.distance_matrix[str(next_state)][str(end_state)]
                
                # 1. 物理可达性快速剪枝: 剩余步数小于理论最短物理步距，直接砍掉此分支
                if remaining_steps < min_dist:
                    continue
                    
                # 2. 演化累积特征
                next_categories = curr.categories_used.copy()
                next_categories.add(move.category)
                
                next_cw = curr.cw_count + (1 if move.rotation_dir == "CW" else 0)
                next_ccw = curr.ccw_count + (1 if move.rotation_dir == "CCW" else 0)
                
                # 构建下一步的路径流
                next_path = curr.path[:-1] + [(curr.current_state, move), (next_state, None)]
                
                # 3. 计算实际代价 g(n)
                g_score = (curr.path_depth + 1) * C_STEP - (curr.accumulated_difficulty + move.difficulty) * C_DIFF
                
                # 4. 计算前瞻启发代价 h(n)
                # 4a. 距离启发代价
                h_dist = remaining_steps * C_STEP
                
                # 4b. 旋转平衡度启发代价
                bal_diff = abs(next_cw - next_ccw)
                min_final_bal_diff = max(0, bal_diff - remaining_steps)
                h_bal = min_final_bal_diff * C_BALANCE
                
                # 4c. 多样性启发代价
                missing_cats = max(0, TARGET_CATEGORIES - len(next_categories) - remaining_steps)
                h_div = missing_cats * C_DIVERSITY
                
                # 综合预估最优值
                f_score = g_score + h_dist + h_bal + h_div
                
                next_node = ChoreoSearchNode(
                    f_score=f_score,
                    current_state=next_state,
                    path_depth=curr.path_depth + 1,
                    path=next_path,
                    accumulated_difficulty=curr.accumulated_difficulty + move.difficulty,
                    categories_used=next_categories,
                    cw_count=next_cw,
                    ccw_count=next_ccw
                )
                
                node_id += 1
                heapq.heappush(open_set, (f_score, node_id, next_node))
                
        return results
~~~~~

### 下一步建议
我们已经完成了搜索算法底层从 DFS 到 A* 启发式的替换和 `distance_matrix` 的预计算机制。下一步应当：
1. **执行后端测试验证**：运行 `pytest tests/` 确保这部分修改没有影响原有的数据结构并测试其在高难度查询参数下的搜索表现。如果测试套件有因重构 `search_paths` 输出顺序变化引起的失败，应当进行修复适配。
2. **测试前端 Web 集成**：重启 FastAPI 服务并在浏览器端体验 `搜索路径` 面板（设置较高的步数限制），通过前端输出的渲染卡片验证“旋转平衡度”与“难度总和”是否有显著的质量飞跃。
