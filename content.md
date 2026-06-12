我们将按照既定路线图，首先执行 **第一阶段：后端领域层与核心引擎重构（DAG 与状态推导）**。

在这一阶段，我们将通过精确修改代码库来：
1. 在领域模型中添加状态推导演算和翻转的辅助函数。
2. 升级校验响应结构，使其包含歧义性标记（`is_ambiguous`），以便后续前端和校验系统识别是否存在多重路径。

以下是本次修改的详细计划。

## [WIP] refactor: 重构领域模型与校验引擎以支持状态推导与 DAG 路径识别

### 用户需求
系统需要具备通过物理相对条件推导下一个用刃状态的能力，并在验证状态序列时，能够识别出是否存在多重匹配路径（即歧义性/多样性），为后续的 DAG 渲染和动作驱动模式提供底层算法支持。

### 评论
该重构不破坏现有的有状态校验逻辑，而是通过渐进式地丰富领域模型辅助方法和返回模型的元数据来增强系统扩展性。这为构建更高级的步法驱动（Move-Centric）校验打下了坚实的数理基础。

### 目标
1. 在 `src/fsm_skating/domain/models.py` 中引入状态属性（脚、方向、用刃）的翻转辅助函数，并实现 `calculate_next_state` 状态演算器。
2. 在 `src/fsm_skating/services/engine.py` 中升级 `VerificationResponse` 模型，新增 `is_ambiguous` 属性。
3. 调整 `verify_sequence` 校验逻辑，自动计算状态链中是否存在具有多重候选动作的过渡段，并填充 `is_ambiguous` 标志。

### 基本原理
当用户给定一个相对运动条件时，由于用刃状态是有限且完全对称的（L/R, F/B, O/I），我们可以通过对相应属性进行简单的布尔翻转来确定唯一的下一个状态。在校验端，通过检查每个转换步骤中的 `candidate_moves` 长度是否大于 1，可以判定整个序列在此步是否产生了分叉（即 DAG 的多重边），从而计算出 `is_ambiguous` 状态。

### 标签
#intent/refine #flow/ready #priority/high
#comp/engine #concept/state #scope/core
#ai/instruct
#task/domain/engine
#task/object/dag-validation
#task/action/refactor
#task/state/begin #task/status/active

---

### Script

#### Acts 1: 在领域模型中添加状态翻转与演算器

我们首先向 `models.py` 的尾部追加状态翻转和根据条件演算下一个状态的底层辅助函数。

~~~~~act
patch_file
src/fsm_skating/domain/models.py
~~~~~
~~~~~python.old
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
~~~~~
~~~~~python.new
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
~~~~~

#### Acts 2: 升级核心引擎校验模型与歧义性判定算法

接着，我们修改 `engine.py`，向 `VerificationResponse` 添加 `is_ambiguous` 属性，并在验证方法执行结束前计算该值。

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
~~~~~
~~~~~python.new
class VerificationResponse(BaseModel):
    valid: bool
    error: Optional[str] = None
    states: Optional[List[State]] = None
    transitions: Optional[List[TransitionDetail]] = None
    total_difficulty: int = 0
    is_ambiguous: bool = False
~~~~~

~~~~~act
patch_file
src/fsm_skating/services/engine.py
~~~~~
~~~~~python.old
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
~~~~~
~~~~~python.new
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
~~~~~

### 下一步建议
1. **运行现有单元测试**：使用 `pytest` 运行测试套件（如 `tests/test_engine.py`），验证本次对 `VerificationResponse` 增加可选字段的修改是否完全向下兼容，没有破坏现有的校验断言。
2. **编写对偶演算单元测试**：新增针对 `calculate_next_state` 状态推算器以及校验歧义性标志 `is_ambiguous` 的测试用例。
3. **迈向第二阶段**：开始设计并实现动作驱动（Move-Centric）的完整校验方法 `verify_move_sequence`。
