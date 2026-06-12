我们现在将实施 **第二阶段：开发“动作驱动（Move-Centric）”校验核心**。

在这一阶段，我们将在后端服务的核心引擎 `ChoreographyEngine` 中正式加入步法校验功能：
1. 新增 `MoveVerificationDetail` 和 `MoveVerificationResponse` 数据模型，用于精确表示“步法 -> 状态”的演化轨迹。
2. 实现 `verify_move_sequence` 方法，它能自动根据步法物理条件、约束规则完成全段演算和动态定位失败点。

以下是具体的实施计划。

## [WIP] feat: 在核心引擎中实现动作驱动的步法序列校验模块

### 用户需求
我们需要在引擎层提供一种新的校验模式。与以前校验连贯“用刃状态”不同，新模式允许用户直接输入一组特定的花样滑冰动作（如连续做转三步、莫霍克步），由系统自动模拟物理惯性推演状态流（如 LFO -> LBI -> RBO），并在中途出现起滑约束冲突时进行精准预警。

### 评论
这是迈向 ISU 规范和高级编排的核心一步。状态演算器与约束检查机制在此阶段有机地连接在一起，使得系统能够进行双向、对称的高精度推理。

### 目标
1. 在 `src/fsm_skating/services/engine.py` 中，定义用于表示动作推演链路的 Pydantic 模型。
2. 实现 `verify_move_sequence` 核心成员函数，利用第一阶段开发的 `calculate_next_state` 和约束检查逻辑演练滑行路径。
3. 对绝对旋转方向（CW/CCW）进行推导，确保生成的动作明细完美还原出转体的角速度惯性。

### 基本原理
步法驱动校验器的输入为动作 ID 数组（例如 `["stroke", "forward_outside_three_turn"]`）和可选的初始滑行状态 `start_state`。
1. 如果用户未指定 `start_state`，引擎会自动提取第一个动作的 `start_constraints` 并缺省设定合理的用刃（默认左脚）。
2. 在第 $k$ 个动作的校验循环中，先断言 `current_state` 是否契合其 `start_constraints`，不契合则输出精准的定位错误。
3. 校验通过后，使用 `calculate_next_state(current_state, conditions)` 演算出第 $k+1$ 步状态，并记录 `from -> move -> to`。
4. 累加分值，当前状态更新为 `next_state`，继续循环直至序列检验成功。

### 标签
#intent/build #flow/ready #priority/high
#comp/engine #concept/state #concept/executor #scope/api
#ai/instruct
#task/domain/engine
#task/object/move-centric-verification
#task/action/implementation
#task/state/continue #task/status/active

---

### Script

#### Acts 1: 定义动作演算响应与详情 Pydantic 模型

我们向 `src/fsm_skating/services/engine.py` 的数据模型定义区中添加两个新的模型，用于格式化输出动作校验 trace 结果。

~~~~~act
patch_file
src/fsm_skating/services/engine.py
~~~~~
~~~~~python.old
class VerificationResponse(BaseModel):
    valid: bool
    error: Optional[str] = None
    states: Optional[List[State]] = None
    transitions: Optional[List[TransitionDetail]] = None
    total_difficulty: int = 0
    is_ambiguous: bool = False
~~~~~
~~~~~python.new
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
~~~~~

#### Acts 2: 实现 `verify_move_sequence` 状态链推导演算逻辑

我们在 `ChoreographyEngine` 类体内部插入动作校验的主体逻辑代码。

~~~~~act
patch_file
src/fsm_skating/services/engine.py
~~~~~
~~~~~python.old
        is_ambiguous = any(len(t.candidate_moves) > 1 for t in transitions_details)

        return VerificationResponse(
            valid=True,
            states=states,
            transitions=transitions_details,
            total_difficulty=total_difficulty,
            is_ambiguous=is_ambiguous,
        )

    def generate_sequence(
~~~~~
~~~~~python.new
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
            return MoveVerificationResponse(
                valid=False, error="动作 ID 序列不能为空。"
            )

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
                if "dir" in constraints and current_state.direction != constraints["dir"]:
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
            from fsm_skating.domain.models import calculate_next_state, get_natural_curvature

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
~~~~~

### 下一步建议
1. **编写动作校验测试**：我们将对新增的 `verify_move_sequence` 方法编写完整的单元测试用例（覆盖顺畅流转情况以及中途不合规触发预警的情况），以保证逻辑完全准确。
2. **开展第三阶段**：在 API 层（`src/fsm_skating/api/main.py`）增加动作驱动接口路由，接受用户传递动作链并返回状态演化数据。如果你同意，我们现在就可以开始编写针对第二阶段的测试或直接推进第三阶段。
