分析错误原因，测试 `test_search_paths_no_solution` 失败是因为我的物理建模假设出现了偏差。在 `moves_config.yaml` 的配置中，`LFO` 到 `RBO` 实际上是可以通过 **前外莫霍克步 (Forward Outside Mohawk)** 直接一步转移完成的（满足异脚、变向、同刃且起滑约束匹配）。因此，`paths` 返回了 1 条结果，导致断言失败。

为了修复此测试，我们将搜索条件改为一个在低难度限制下确实无法一步达到的转换：例如 `LFO` 到 `RFO`（交叉步），该动作的难度为 2。如果我们限制 `max_difficulty=1`，则该路径将不复存在。

---

## [WIP] fix: 修正路径搜索单元测试中的物理逻辑假设错误

### 错误分析

**错误原因**: 
在 `test_search_paths_no_solution` 中，我错误地假设从 `LFO` 到 `RBO` 没有直接转移路径。然而根据 `config/moves_config.yaml`：
1. `forward_outside_mohawk` 动作定义的条件是：`same_foot: false`, `same_dir: false`, `same_edge: true`。
2. 从 `LFO` 到 `RBO` 的物理变换恰好是：异脚 (L->R)、变向 (F->B)、同刃 (O->O)。
3. 该动作的难度评级为 3。

因此，在默认 `max_difficulty=5` 的情况下，引擎正确地识别出了这一步法，导致 `len(paths) == 1` 而不是预期的 `0`。

**解决方案**:
我们将测试用例改为搜索从 `LFO` 到 `RFO` 的路径。
- `LFO` 到 `RFO` 对应 **交叉步 (Cross Roll)**，难度为 2。
- 如果我们设置 `max_difficulty=1`，引擎将过滤掉难度为 2 的动作，从而使 1 步之内的搜索结果为空，这符合测试“无合规路径”的本意。

### 用户需求
修复由于物理规则计算失误导致的单元测试失败，确保路径搜索功能的验证逻辑严谨。

### 评论
单元测试反映了系统对物理规则的忠实执行。通过使用难度阈值来创造“死胡同”是验证搜索算法边界条件的正确方法。

### 目标
1. 修改 `tests/test_search.py` 中的 `test_search_paths_no_solution` 逻辑。
2. 引入 `max_difficulty` 限制，确保在 1 步之内无法找到目标路径。
3. 重新运行测试，确保全量通过。

### 基本原理
利用状态机中的难度权重过滤机制，人为阻断特定的物理转移链路。`LFO` (左前外) 到 `RFO` (右前外) 需要改变支撑脚但保持方向和边缘，这在库中对应的 `cross_roll` 动作为 2 级难度。设置搜索上限为 1 级可确保该路径被逻辑阻断。

### 标签
#intent/fix #flow/ready #priority/high #comp/tests #concept/executor #scope/dx #ai/refine #task/domain/testing #task/object/path-search-test #task/action/bug-fix #task/state/continue

---

### Script

#### Acts 1: 修正 `tests/test_search.py` 中的测试逻辑

我们将使用难度过滤来确保路径搜索返回空结果。

~~~~~act
patch_file
tests/test_search.py
~~~~~
~~~~~python.old
def test_search_paths_no_solution(engine):
    """验证无合规转移物理动作时的返回情况"""
    start = State.from_string("LFO")
    end = State.from_string("RBO")

    # LFO 直接 1 步转移到 RBO 是不被物理配置允许的（间隔0）
    paths = engine.search_paths(start, end, intermediate_count=0)
    assert len(paths) == 0
~~~~~
~~~~~python.new
def test_search_paths_no_solution(engine):
    """验证无合规转移物理动作时的返回情况"""
    start = State.from_string("LFO")
    # LFO -> RFO 对应 Cross Roll (难度 2)
    end = State.from_string("RFO")

    # 当限制最大难度为 1 时，LFO 无法在 1 步内转移到 RFO (间隔0)
    paths = engine.search_paths(start, end, intermediate_count=0, max_difficulty=1)
    assert len(paths) == 0
~~~~~

### 下一步建议
- **测试通过后提交**：如果本次测试顺利通过，建议将目前的修改进行 Git 提交，标志着路径搜索核心逻辑的稳定。
- **性能压测**：可以尝试增加一个 `test_search_long_path`，搜索间隔为 4 或 5 的路径，观察 DFS 算法在较深层级下的响应耗时。
