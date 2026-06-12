import os
import yaml
import random
from typing import List, Dict, Tuple, Any, Optional
from .core import State, get_relative_conditions, ALL_STATES

def check_match(current_state: State, target_state: State, move_config: Dict[str, Any]) -> bool:
    """
    双重规则匹配逻辑。
    1. 校验基础 conditions 转移差异是否匹配。
    2. 校验起始状态约束 start_constraints (若有)。
    """
    conditions = move_config.get("conditions", {})
    actual_conditions = get_relative_conditions(current_state, target_state)

    # 门禁一：基础关系比对
    if (conditions.get("same_foot") != actual_conditions["same_foot"] or
        conditions.get("same_dir") != actual_conditions["same_dir"] or
        conditions.get("same_edge") != actual_conditions["same_edge"]):
        return False

    # 门禁二：起始约束验证
    if "start_constraints" in move_config:
        constraints = move_config["start_constraints"]
        if "dir" in constraints and current_state.direction != constraints["dir"]:
            return False
        if "edge" in constraints and current_state.edge != constraints["edge"]:
            return False

    return True


class ChoreographyEngine:
    """
    花样滑冰状态机编排与过滤引擎。
    """
    def __init__(self, config_path: str):
        self.config_path = config_path
        self.moves = self._load_config()

    def _load_config(self) -> List[Dict[str, Any]]:
        if not os.path.exists(self.config_path):
            raise FileNotFoundError(f"Configuration file not found at: {self.config_path}")
        with open(self.config_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return data.get("moves", [])

    def get_possible_transitions(self, current_state: State, max_difficulty: int = 999) -> List[Dict[str, Any]]:
        """
        管道式过滤核心逻辑：
        1. 基础关系比对
        2. YAML 双重规则匹配
        3. 难度过滤器过滤
        4. 稳定排序双键引擎排序
        """
        results = []

        # 遍历其他 7 个潜在的转移目标状态 (原地不转移通常不被定义为物理步法动作)
        for target_state in ALL_STATES:
            if target_state == current_state:
                continue

            for move in self.moves:
                # 校验匹配
                if check_match(current_state, target_state, move):
                    # 难度过滤
                    diff = move.get("difficulty", 0)
                    if diff <= max_difficulty:
                        results.append({
                            "target_state": target_state,
                            "move": move
                        })

        # 排序引擎：根据 (Difficulty, Name) 双键组合进行稳定升序排序
        results.sort(key=lambda x: (x["move"].get("difficulty", 0), x["move"].get("name", "")))
        return results

    def verify_sequence(self, sequence_str: str) -> Dict[str, Any]:
        """
        序列解析与合法性验证模块：
        验证一段类似 "LFO -> LBI -> RFI" 的用刃状态序列，解析出每一个物理动作及难度评分。
        """
        parts = [p.strip().upper() for p in sequence_str.split("->") if p.strip()]
        states: List[State] = []
        for part in parts:
            try:
                states.append(State.from_string(part))
            except ValueError as e:
                return {
                    "valid": False,
                    "error": f"状态字符 '{part}' 格式有误: {str(e)}"
                }

        if len(states) < 2:
            return {
                "valid": False,
                "error": "状态序列中至少需要包含 2 个有效状态才能进行转移校验。"
            }

        transitions_details = []
        total_difficulty = 0

        for i in range(len(states) - 1):
            s_from = states[i]
            s_to = states[i+1]

            if s_from == s_to:
                return {
                    "valid": False,
                    "error": f"第 {i+1} 步转移出现原地停滞 ({s_from} -> {s_to})，这不符合动力学步法转移规则。"
                }

            # 检索所有匹配当前转移的动作
            matched_moves = []
            for move in self.moves:
                if check_match(s_from, s_to, move):
                    matched_moves.append(move)

            if not matched_moves:
                return {
                    "valid": False,
                    "error": f"无法识别的物理转移: 从状态 {s_from} 无法直接通过任何已知动作转移到 {s_to}。"
                }

            # 升序排序匹配的动作列表
            matched_moves.sort(key=lambda m: (m.get("difficulty", 0), m.get("name", "")))

            transitions_details.append({
                "from_state": s_from,
                "to_state": s_to,
                "candidate_moves": matched_moves,
                "selected_move": matched_moves[0]  # 默认推选难度最低且字典序最小的最简动作
            })
            total_difficulty += matched_moves[0].get("difficulty", 0)

        return {
            "valid": True,
            "states": states,
            "transitions": transitions_details,
            "total_difficulty": total_difficulty
        }

    def generate_sequence(self, steps: int, max_difficulty: int, start_state: Optional[State] = None) -> Optional[List[Tuple[State, Optional[Dict[str, Any]]]]]:
        """
        智能随机生成模块：
        生成一段包含指定步数（即 steps 次动作转移，共 steps + 1 个状态）的合规路径。
        使用带有回溯 (DFS) 的算法，避免随机游走陷入局部死胡同。
        
        返回列表结构：[(S0, M1), (S1, M2), ..., (Sn, None)] 
        其中 S_i 为当前状态，M_i+1 为转移到下一个状态所采用的动作，末尾元素无后续动作为 None。
        """
        if steps <= 0:
            return []

        # 若未提供起始状态，随机从 8 个基础状态中挑选一个
        init_state = start_state if start_state else random.choice(ALL_STATES)

        def dfs(curr_state: State, remaining_steps: int) -> Optional[List[Tuple[State, Dict[str, Any]]]]:
            if remaining_steps == 0:
                return []

            # 获取当前状态可行候选
            options = self.get_possible_transitions(curr_state, max_difficulty)
            if not options:
                return None

            # 引入随机性：对当前候选动作进行随机打乱
            shuffled_options = list(options)
            random.shuffle(shuffled_options)

            for opt in shuffled_options:
                nxt_state = opt["target_state"]
                move = opt["move"]

                sub_path = dfs(nxt_state, remaining_steps - 1)
                if sub_path is not None:
                    # 递归链成功建立
                    return [(nxt_state, move)] + sub_path

            return None

        sub_path = dfs(init_state, steps)
        if sub_path is None:
            return None

        # 组装返回结果
        result = []
        curr = init_state
        for nxt_state, move in sub_path:
            result.append((curr, move))
            curr = nxt_state
        result.append((curr, None))

        return result