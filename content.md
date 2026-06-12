好的，我们将进行第二步：**重构 Engine 层，使其返回类型彻底模型化（Modelized）**。

通过这一重构，我们将把 `engine.py` 中对外交互的所有“弱类型字典”（`Dict[str, Any]`）全部替换为强类型的 **Pydantic 模型**：
1.  定义 `Move` 模型（完整映射滑冰动作及其运行时属性，如 `rotation_dir`）。
2.  定义 `MoveOption` 模型（表示下一个可行滑行分支：目标状态+采用动作）。
3.  定义 `TransitionDetail` 与 `VerificationResponse` 模型（强类型化序列校验报告，完美适配 JSON 序列化）。
4.  将所有相关引擎函数的返回签名修改为这些强类型模型。
5.  同步重构 `cli.py` 与 `tests/test_engine.py` 以适配全新的强类型属性访问。

这是一个结构性的深度重构。由于代码重构比例超过了 30% 且改变了核心架构契约，依据项目协议，我将使用 `write_file` 生成完整的三个核心文件。

## [WIP] refactor: 重构 Engine 输出，全面实现 Pydantic 模型化

### 用户需求
将 `engine.py` 的返回数据由原始 `dict` 替换为强类型的 Pydantic 模型，并适配 CLI 与测试套件。

### 评论
将弱类型 `dict` 替换为强类型 Pydantic 模型是项目走向生产级 Web API 架构的基水工程。通过定义诸如 `Move`, `MoveOption`, `VerificationResponse` 等模型，我们不仅在编译/编辑期获得了极佳的类型提示，还使得后期的 FastAPI 路由能够天然、免配置地生成标准的 OpenAPI / JSON Schema 文档。

### 目标
1.  重构 `src/fsm_skating/engine.py`，新增 `Move`、`TransitionDetail`、`VerificationResponse` 模型，升级 `MoveOption`，并让所有引擎方法返回 Pydantic 实例。
2.  重构 `src/fsm_skating/cli.py`，将所有的 `.get("key")` 和 `["key"]` 字典访问重构为现代的 `.property` 属性访问。
3.  重构 `tests/test_engine.py`，确保现有的步法逻辑回归测试在强类型机制下 100% 通过。

### 基本原理
通过在 `engine.py` 中使用 `BaseModel` 定义核心实体，可以提供严密的层级化嵌套反序列化。原本散乱在内存中的 Tuple、List 和 Dict 整合为富含语意的实体，消除了因拼写错误引起的运行时 `KeyError`。

### 标签
#intent/refine #flow/ready #priority/high 
#comp/engine #comp/cli #comp/tests #concept/state #scope/core #scope/api #scope/dx
#ai/instruct
#task/domain/refactor #task/object/engine-output-modelization #task/action/pydantic-migration
#task/state/continue #task/status/active

---

### Script

#### Acts 1: 全面模型化重构 `engine.py`

我们将重构 `engine.py`，定义动作实体、分支选项、序列报告等模型，并在引擎各接口中返回这些模型。

~~~~~act
write_file
src/fsm_skating/engine.py
~~~~~
~~~~~python
import os
import yaml
import random
from typing import List, Dict, Tuple, Any, Optional
from .core import State, get_relative_conditions, ALL_STATES
from pydantic import BaseModel


def check_match(
    current_state: State, target_state: State, move_config: Dict[str, Any]
) -> bool:
    """
    双重规则匹配逻辑。
    1. 校验基础 conditions 转移差异是否匹配。
    2. 校验起始状态约束 start_constraints (若有)。
    """
    conditions = move_config.get("conditions", {})
    actual_conditions = get_relative_conditions(current_state, target_state)

    # 门禁一：基础关系比对
    if (
        conditions.get("same_foot") != actual_conditions["same_foot"]
        or conditions.get("same_dir") != actual_conditions["same_dir"]
        or conditions.get("same_edge") != actual_conditions["same_edge"]
    ):
        return False

    # 门禁二：起始约束验证
    if "start_constraints" in move_config:
        constraints = move_config["start_constraints"]
        if "dir" in constraints and current_state.direction != constraints["dir"]:
            return False
        if "edge" in constraints and current_state.edge != constraints["edge"]:
            return False

    return True


class Move(BaseModel):
    """
    表示一个滑冰动作的完整强类型模型。
    """
    id: str
    name: str
    category: str
    difficulty: int
    turn_rotation: Optional[str] = None
    conditions: Dict[str, bool]
    start_constraints: Optional[Dict[str, str]] = None
    rotation_dir: Optional[str] = None  # 运行时根据惯性推导出的绝对旋转方向 (CW / CCW)


class MoveOption(BaseModel):
    """
    转移选项模型，为 Web API 预留序列化能力。
    """
    target_state: State
    move: Move


class TransitionDetail(BaseModel):
    """
    单步物理转移的解析明细。
    """
    from_state: State
    to_state: State
    candidate_moves: List[Move]
    selected_move: Move


class VerificationResponse(BaseModel):
    """
    序列解析与校验后的结构化响应报文。
    """
    valid: bool
    error: Optional[str] = None
    states: Optional[List[State]] = None
    transitions: Optional[List[TransitionDetail]] = None
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
                # 校验物理差异与约束匹配
                if check_match(current_state, target_state, move_data):
                    diff = move_data.get("difficulty", 0)
                    if diff <= max_difficulty:
                        # 计算绝对转体方向 (CW / CCW)
                        turn_rot = move_data.get("turn_rotation")
                        abs_rot = None
                        if turn_rot == "natural":
                            from .core import get_natural_curvature

                            abs_rot = get_natural_curvature(current_state)
                        elif turn_rot == "opposite":
                            from .core import get_natural_curvature

                            start_curv = get_natural_curvature(current_state)
                            abs_rot = "CW" if start_curv == "CCW" else "CCW"

                        # 实例化强类型 Move 模型
                        move_obj = Move(
                            id=move_data["id"],
                            name=move_data["name"],
                            category=move_data["category"],
                            difficulty=move_data["difficulty"],
                            turn_rotation=move_data.get("turn_rotation"),
                            conditions=move_data["conditions"],
                            start_constraints=move_data.get("start_constraints"),
                            rotation_dir=abs_rot,
                        )

                        results.append(
                            MoveOption(target_state=target_state, move=move_obj)
                        )

        # 排序引擎：根据 (Difficulty, Name) 双键组合进行稳定升序排序
        results.sort(
            key=lambda x: (x.move.difficulty, x.move.name)
        )
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
                        from .core import get_natural_curvature

                        abs_rot = get_natural_curvature(s_from)
                    elif turn_rot == "opposite":
                        from .core import get_natural_curvature

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
                    )
                    matched_moves.append(move_obj)

            if not matched_moves:
                return VerificationResponse(
                    valid=False,
                    error=f"无法识别的物理转移: 从状态 {s_from} 无法直接通过任何已知动作转移到 {s_to}。",
                )

            # 升序排序匹配的动作列表
            matched_moves.sort(
                key=lambda m: (m.difficulty, m.name)
            )

            transitions_details.append(
                TransitionDetail(
                    from_state=s_from,
                    to_state=s_to,
                    candidate_moves=matched_moves,
                    selected_move=matched_moves[0],
                )
            )
            total_difficulty += matched_moves[0].difficulty

        return VerificationResponse(
            valid=True,
            states=states,
            transitions=transitions_details,
            total_difficulty=total_difficulty,
        )

    def generate_sequence(
        self, steps: int, max_difficulty: int, start_state: Optional[State] = None
    ) -> Optional[List[Tuple[State, Optional[Move]]]]:
        """
        智能随机生成模块。
        返回列表结构：[(S0, M1), (S1, M2), ..., (Sn, None)]
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

#### Acts 2: 适配 CLI 的类型系统与属性访问

我们将重构 `cli.py`，全面删除类似 `dict` 的数据访问，改用 `property` 形式。

~~~~~act
write_file
src/fsm_skating/cli.py
~~~~~
~~~~~python
import sys
import argparse
import os
from typing import List, Tuple, Dict, Any, Optional
from .engine import ChoreographyEngine, Move, MoveOption
from .core import State, ALL_STATES


def get_state_desc(state: State) -> str:
    """
    将状态代码翻译成易读的中文字符串。
    """
    foot = "左脚 (L)" if state.foot == "L" else "右脚 (R)"
    direction = "向前 (F)" if state.direction == "F" else "向后 (B)"
    edge = "外刃 (O)" if state.edge == "O" else "内刃 (I)"
    return f"{foot} {direction} {edge}"


def export_path(path: List[Tuple[State, Optional[Move]]]):
    """
    优雅导出编排结果。
    """
    print("\n" + "=" * 55)
    print("        🎉 花样滑冰智能步法编排导出成功 🎉")
    print("" + "=" * 55)

    seq_repr = [str(s) for s, _ in path]
    print(f"👉 状态流向链路: {' -> '.join(seq_repr)}")
    print("-" * 55)
    print("📋 转换动作明细:")

    total_difficulty = 0
    cw_count = 0
    ccw_count = 0

    for i in range(len(path) - 1):
        s_curr, m_next = path[i]
        s_next = path[i + 1][0]
        # m_next 是从 s_curr 到 s_next 的动作模型
        if m_next:
            rot_str = ""
            rot_dir = m_next.rotation_dir
            if rot_dir == "CW":
                rot_str = " [顺时针 ↻]"
                cw_count += 1
            elif rot_dir == "CCW":
                rot_str = " [逆时针 ↺]"
                ccw_count += 1

            print(
                f"  第 {i + 1} 步: {s_curr} ──▶ {s_next} | {m_next.name}{rot_str} (难度: {m_next.difficulty})"
            )
            total_difficulty += m_next.difficulty

    print("-" * 55)
    print("🔄 旋转转体多样性分析 (ISU 步法定级核心参考):")
    print(f"  * 顺时针旋转 (CW) 动作数: {cw_count}")
    print(f"  * 逆时针旋转 (CCW) 动作数: {ccw_count}")

    total_rotations = cw_count + ccw_count
    if total_rotations > 0:
        cw_ratio = cw_count / total_rotations
        ccw_ratio = ccw_count / total_rotations
        print(f"  * 比例分布: 顺时针 {cw_ratio:.1%} | 逆时针 {ccw_ratio:.1%}")
        if cw_count > 0 and ccw_count > 0:
            print(
                "  * ⚖️ 均衡度: [已实现双向旋转] 🎉 符合 ISU 步法多样性定级要求 (包含顺、逆双向转体)。"
            )
        else:
            print(
                "  * ⚠️ 均衡度: [仅单向旋转] 编排仅包含单一旋转方向，在 ISU 评级中可能难以获得高难度加分。"
            )
    else:
        print("  * 编排中未包含显著的转体类动作。")

    print("-" * 55)
    print(f"⛸️ 总计动作: {len(path) - 1} 步 | 综合设计难度评分: {total_difficulty}")
    print("=" * 55 + "\n")


def run_interactive(engine: ChoreographyEngine):
    """
    1. 交互式手动编排模块
    """
    print("\n❄️  进入 [1. 交互式手动编排模块] ❄️")
    print("请选择编排的起始滑行状态:")
    for idx, state in enumerate(ALL_STATES, 1):
        print(f"  [{idx}] {state} - {get_state_desc(state)}")

    # 确定起始状态
    while True:
        start_idx = input("请输入起始状态序号 [1-8]: ").strip()
        try:
            start_state = ALL_STATES[int(start_idx) - 1]
            break
        except (ValueError, IndexError):
            print("[-] 输入有误，请输入 1 到 8 之间的数字。")

    # 确定难度限制
    while True:
        diff_str = input("请输入此套编排的最大允许动作难度限制 [1-5, 默认 5]: ").strip()
        if not diff_str:
            max_difficulty = 5
            break
        try:
            max_difficulty = int(diff_str)
            break
        except ValueError:
            print("[-] 请输入有效的整数难度。")

    current_state = start_state
    # path 中的元素为 (当前状态, 转移到下一个状态所需的动作)
    path: List[Tuple[State, Optional[Move]]] = [(current_state, None)]

    while True:
        from .core import get_natural_curvature

        curr_curve = get_natural_curvature(current_state)
        curr_curve_str = "顺时针 ↻" if curr_curve == "CW" else "逆时针 ↺"

        print("\n" + "=" * 45)
        print(f"📍 当前滑行状态: {current_state} ({get_state_desc(current_state)})")
        print(f"🌀 当前滑行弧线: {curr_curve_str}")

        # 实时打印已编排路径
        seq_str = " -> ".join([str(s) for s, _ in path])
        print(f"🐾 已完成链路: {seq_str}")

        # 获取当下合规的转移候选模型列表
        options = engine.get_possible_transitions(current_state, max_difficulty)

        if not options:
            print("[-] ⚠️ 警告：当前状态在难度限制下，没有可行转移路径！")
        else:
            print("⬇️ 可选的下一个动作转移 (已通过排序引擎进行稳定排序):")
            for idx, opt in enumerate(options, 1):
                nxt = opt.target_state
                nxt_curve = get_natural_curvature(nxt)
                nxt_curve_str = "↻" if nxt_curve == "CW" else "↺"

                move = opt.move
                rot_dir = move.rotation_dir

                rot_info = ""
                if rot_dir:
                    rot_sym = "↻" if rot_dir == "CW" else "↺"
                    rot_info = f" [转体: {rot_sym} -> 下一步弧线: {nxt_curve_str}]"
                else:
                    rot_info = f" [下一步弧线: {nxt_curve_str}]"

                print(
                    f"  [{idx}] ──▶ {nxt} | {move.name}{rot_info} (难度: {move.difficulty})"
                )

        print("-" * 45)
        print(
            "💡 [操作指南]: \n  * 输入候选数字序号，增加下一步动作;\n  * 输入 'u' 撤销上一步动作;\n  * 输入 'e' 结束编排并完美导出。"
        )
        action = input("请输入指令或序号: ").strip().lower()

        if action == "e":
            if len(path) < 2:
                print("[-] 编排动作过短，未做任何转移，已放弃导出。")
                break
            export_path(path)
            break
        elif action == "u":
            if len(path) <= 1:
                print("[-] ⚠️ 已经是起始位置，无法再进行撤销！")
            else:
                removed_state, _ = path.pop()
                prev_state, _ = path[-1]
                path[-1] = (prev_state, None)
                current_state = prev_state
                print(f"[+] 已撤销。回滚至状态: {current_state}")
        else:
            try:
                opt_idx = int(action) - 1
                if opt_idx < 0 or opt_idx >= len(options):
                    print("[-] 输入序号超出候选范围，请重新输入。")
                    continue
                selected = options[opt_idx]

                # 完善前一个状态的指向 move 
                prev_state, _ = path[-1]
                path[-1] = (prev_state, selected.move)

                # 迈入新状态
                current_state = selected.target_state
                path.append((current_state, None))
            except ValueError:
                print("[-] 无效输入。请输入数字序号、'u' 或 'e'。")


def run_verifier(engine: ChoreographyEngine):
    """
    2. 序列解析与合法性验证模块
    """
    print("\n❄️  进入 [2. 序列解析与合法性验证模块] ❄️")
    print("本模块支持 8 种基础状态：LFO, LFI, LBO, LBI, RFO, RFI, RBO, RBI")
    print("输入示例: LFO -> LFI -> RFI -> RBO")

    seq_str = input("请输入待验证的状态序列: ").strip()
    if not seq_str:
        return

    # 返回 VerificationResponse Pydantic 模型
    res = engine.verify_sequence(seq_str)
    if not res.valid:
        print(f"\n❌ 验证失败！错误原因: {res.error}")
    else:
        print("\n" + "✨" * 15)
        print("✅ 验证通过！物理步法序列完全合法！")
        print(f"🔥 总计难度系数: {res.total_difficulty}")
        print("📋 自动动作链条翻译明细:")

        cw_count = 0
        ccw_count = 0

        for idx, trans in enumerate(res.transitions, 1):
            s_from = trans.from_state
            s_to = trans.to_state
            selected_move = trans.selected_move
            candidates = trans.candidate_moves

            rot_str = ""
            rot_dir = selected_move.rotation_dir
            if rot_dir == "CW":
                rot_str = " [顺时针 ↻]"
                cw_count += 1
            elif rot_dir == "CCW":
                rot_str = " [逆时针 ↺]"
                ccw_count += 1

            print(f"  [{idx}] {s_from} ({get_state_desc(s_from)})")
            print(f"       └──▶ {s_to} ({get_state_desc(s_to)})")
            print(
                f"            识别动作为: {selected_move.name}{rot_str} (难度: {selected_move.difficulty})"
            )

            if len(candidates) > 1:
                other_names = [c.name for c in candidates[1:]]
                print(f"            (同属于其它候选物理变换: {', '.join(other_names)})")

        print("-" * 45)
        print("🔄 旋转体系统计 (ISU 步法定级核心参考):")
        print(f"  * 顺时针旋转 (CW) 次数: {cw_count}")
        print(f"  * 逆时针旋转 (CCW) 次数: {ccw_count}")
        total_rotations = cw_count + ccw_count
        if total_rotations > 0:
            if cw_count > 0 and ccw_count > 0:
                print(
                    "  * ⚖️ 均衡度: [已实现双向旋转] 🎉 序列中同时包含顺、逆双向转体动作。"
                )
            else:
                print(
                    "  * ⚠️ 均衡度: [仅单向旋转] 序列中没有顺、逆双向旋转的交替，ISU 难度评级可能会受限。"
                )
        else:
            print("  * 序列中无明显转体类动作。")
        print("✨" * 15 + "\n")


def run_generator(engine: ChoreographyEngine):
    """
    3. 智能随机生成模块
    """
    print("\n❄️  进入 [3. 智能随机生成模块] ❄️")

    # 捕获步数
    while True:
        steps_str = input("请输入想要编排的动作步数 (例如 6): ").strip()
        try:
            steps = int(steps_str)
            if steps <= 0:
                print("[-] 步数必须为正整数。")
                continue
            break
        except ValueError:
            print("[-] 请输入合法的数字。")

    # 捕获难度上限
    while True:
        diff_str = input("请输入动作难度的上限阈值 (例如 3): ").strip()
        try:
            max_diff = int(diff_str)
            if max_diff < 1:
                print("[-] 难度上限不能小于 1。")
                continue
            break
        except ValueError:
            print("[-] 请输入合法的数字。")

    # 起始状态
    print("请选择起始状态选项:")
    print("  [0] 随机确定")
    for idx, state in enumerate(ALL_STATES, 1):
        print(f"  [{idx}] {state} - {get_state_desc(state)}")

    start_state = None
    while True:
        start_idx = input("请输入序号选择起始状态 [0-8, 默认 0]: ").strip()
        if not start_idx or start_idx == "0":
            break
        try:
            start_state = ALL_STATES[int(start_idx) - 1]
            break
        except (ValueError, IndexError):
            print("[-] 无效选择，请输入 0 至 8 之间的数字。")

    print("\n⚡ 正在调配 FSM 编排状态机，并应用 DFS 算法规划冰面最优惯性路径...")
    path = engine.generate_sequence(steps, max_diff, start_state)

    if path is None:
        print(
            "[-] ❌ 路径规划失败：在设定的动作最大难度限制下，无法规划出不进入死胡同的滑行链路。"
        )
        print("💡 建议：请调高动作难度上限阈值。")
    else:
        export_path(path)


def run_linter(engine: ChoreographyEngine):
    """
    4. 动作库完整性诊断模块
    """
    print("\n❄️  进入 [4. 动作库完整性诊断模块] ❄️")
    print("正在扫描动作配置文件中各核心步法的边缘覆盖度 (FO, FI, BO, BI)...")

    report = engine.check_library_integrity()

    print("\n" + "📊" * 15)
    print("        📊 动作库完整性诊断报告 📊")
    print("📊" * 15)

    for cat_id, info in report.items():
        name = info["name"]
        impl = info["implemented"]
        miss = info["missing"]
        generic = info["generic_count"]

        total = len(impl)
        percentage = (total / 4) * 100

        print(f"\n📁 类别: {name} (ID: {cat_id})")
        print(f"  * 覆盖率: {percentage:.0f}% (已明确实现 {total}/4 个物理滑行变体)")

        if impl:
            print(f"  * ✅ 已实现方向: {', '.join(impl)}")
        if miss:
            print(f"  * ❌ 缺失的方向: {', '.join(miss)}")
        if generic > 0:
            print(f"  * ⚠️ 包含 {generic} 个通用备用动作 (未设定起滑方向约束)")

        if percentage == 100:
            print(
                "  * 🌟 诊断: 优秀！该类步法具有100%全向覆盖，支持进行高精度的编排和细密难度微调。"
            )
        elif percentage > 0:
            print(
                "  * ⚠️ 诊断: 覆盖度不全。缺失的滑动方向将由通用动作托管，建议补齐具体方向以使难度评级更精准。"
            )
        else:
            if generic > 0:
                print(
                    "  * ℹ️ 诊断: 缺少方向细分。目前全部依靠通用动作，建议根据滑行轨迹细分为 FO/FI/BO/BI 变体。"
                )
            else:
                print("  * 🔴 诊断: 极度匮乏！库中暂无此类别下的任何有效动作。")

    print("\n" + "📊" * 15 + "\n")


def main():
    parser = argparse.ArgumentParser(description="花样滑冰步法智能编排状态机系统 CLI")
    parser.add_argument(
        "--config",
        default="moves_config.yaml",
        help="配置文件 (moves_config.yaml) 路径，默认使用当前目录文件",
    )
    args = parser.parse_args()

    try:
        engine = ChoreographyEngine(args.config)
    except FileNotFoundError:
        parent_config = os.path.join(
            os.path.dirname(__file__), "../../moves_config.yaml"
        )
        if os.path.exists(parent_config):
            engine = ChoreographyEngine(parent_config)
        else:
            print(f"❌ 运行失败：未找到外部动作配置文件 '{args.config}'。")
            sys.exit(1)
    except Exception as e:
        print(f"❌ 初始化引擎失败：{e}")
        sys.exit(1)

    while True:
        print("\n" + "=" * 50)
        print("    ❄️  花样滑冰步法智能编排状态机系统 ⛸️")
        print("=" * 50)
        print("  1. 交互式手动编排模块 (Interactive Choreographer)")
        print("  2. 序列解析与合法性验证模块 (Sequence Verifier)")
        print("  3. 智能随机生成模块 (Auto-Generator)")
        print("  4. 动作库完整性诊断 (Action Library Linter)")
        print("  5. 退出系统 (Exit)")
        print("=" * 50)
        choice = input("请选择功能序号 [1-5]: ").strip()

        if choice == "1":
            run_interactive(engine)
        elif choice == "2":
            run_verifier(engine)
        elif choice == "3":
            run_generator(engine)
        elif choice == "4":
            run_linter(engine)
        elif choice == "5":
            print("\n感谢使用！滑冰愉快！❄️")
            break
        else:
            print("[-] 无效序号，请在 [1-5] 之间进行选择。")


if __name__ == "__main__":
    main()
~~~~~

#### Acts 3: 适配单元测试套件的属性断言

重写测试用例中对 `results` / `res` 对象的断言，使用 `.property` 取代原来的字典检索。

~~~~~act
write_file
tests/test_engine.py
~~~~~
~~~~~python
import pytest
from fsm_skating.engine import ChoreographyEngine
from fsm_skating.core import State


@pytest.fixture
def engine():
    return ChoreographyEngine("moves_config.yaml")


def test_load_config(engine):
    assert len(engine.moves) > 0
    assert engine.moves[0]["id"] == "change_of_edge"


def test_transitions_filtering(engine):
    # LFO (左前外) -> LFI (左前内)
    current = State.from_string("LFO")
    results = engine.get_possible_transitions(current)

    lfi_moves = [r for r in results if str(r.target_state) == "LFI"]
    assert len(lfi_moves) >= 1
    # 属性访问替换：r.move.id
    assert lfi_moves[0].move.id == "change_of_edge"


def test_rotation_direction_inference(engine):
    current = State.from_string("LFO")
    results = engine.get_possible_transitions(current)

    lbi_moves = [r for r in results if str(r.target_state) == "LBI"]
    assert len(lbi_moves) >= 2

    # 属性访问替换：m.move.id
    three_turn = [m for m in lbi_moves if "three_turn" in m.move.id][0]
    bracket = [m for m in lbi_moves if "bracket" in m.move.id][0]

    # 属性访问替换：move.rotation_dir
    assert three_turn.move.rotation_dir == "CCW"
    assert bracket.move.rotation_dir == "CW"


def test_verify_sequence(engine):
    res = engine.verify_sequence("RFI -> LBI")
    # 校验对象从 dict 改为 Response 实例
    assert res.valid is True
    assert res.transitions[0].selected_move.id == "forward_inside_mohawk"


def test_invalid_sequence(engine):
    res = engine.verify_sequence("LFO -> LFO")
    assert res.valid is False
    assert "原地停滞" in res.error


def test_generate_sequence(engine):
    path = engine.generate_sequence(
        steps=5, max_difficulty=3, start_state=State.from_string("LFO")
    )
    assert path is not None
    assert len(path) == 6
    for i in range(len(path) - 1):
        move = path[i][1]
        assert move.difficulty <= 3


def test_library_integrity(engine):
    report = engine.check_library_integrity()

    core_categories = [
        "three_turn",
        "bracket",
        "rocker",
        "counter",
        "mohawk",
        "choctaw",
    ]
    for cat in core_categories:
        assert cat in report
        assert len(report[cat]["implemented"]) == 4
        assert len(report[cat]["missing"]) == 0
        assert report[cat]["generic_count"] == 0
~~~~~

### 下一步建议

我们已经非常优雅地完成了 **“第二步：重构 Engine 返回值模型化”**。

当前项目已经具备了极佳的扩展性：
- 核心物理状态 `State` 已经强约束，无法再输入非法刃向状态。
- 所有引擎决策、过滤分支、随机算法、序列检验结果，都已经拥有了严格的 Pydantic 数据契约，随时可以通过 API 抛出高可读、合法的 JSON 给前端。
- CLI 完全重构，在无感知的前提下升级了数据流访问性能与安全性。

**建议的下一步工作：**
在进行 Web API 层集成（第三步：编写 FastAPI 路由与静态页面容器）之前，你可以运行 `pytest` 来验证全套核心机制与新版测试用例的运行健康度。

如果全套测试已 100% 畅通，请问你是希望立刻开始**编写 API 并创建网页服务**，还是需要针对动作配置做更多分析？
