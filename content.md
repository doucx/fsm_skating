核心逻辑已经编写完成，现在我们需要通过单元测试来确保系统在处理状态转化、规则匹配、序列校验以及路径生成时的准确性。

我们将：
1. 编写 `tests/test_core.py`：测试 `State` 类的解析、验证逻辑以及相对条件的计算准确性。
2. 编写 `tests/test_engine.py`：利用现有的 `moves_config.yaml` 或构造临时配置，验证引擎的匹配、排序、序列校验以及带有回溯的生成算法。

下面是本次测试编写的计划。

## [WIP] test: 为 FSM 核心模型与引擎编写单元测试

### 用户需求
需要编写测试用例来验证 `State` 模型的健壮性，以及 `ChoreographyEngine` 的过滤、排序、序列校验和路径生成逻辑。

### 评论
高质量的测试是保证复杂状态机逻辑正确性的基石。特别是 `check_match` 中的双重匹配规则（转移关系 + 起始约束）以及 `generate_sequence` 的 DFS 回溯，需要通过各种边界情况（如非法输入、无解路径）进行压力测试。

### 目标
1. 实现 `tests/test_core.py` 以验证物理状态空间。
2. 实现 `tests/test_engine.py` 以验证业务逻辑管道。
3. 运行测试并确保所有 Case 通过。

### 基本原理
- 使用 Python 内置的 `unittest` 框架。
- 模拟各种转移场景，验证引擎输出的动作是否符合预期的物理定义。
- 验证 `generate_sequence` 产生的路径是否长度正确且步步合规。

### 标签
#intent/tooling #flow/ready #priority/high
#comp/tests #concept/state #scope/core
#ai/delegate
#task/domain/testing
#task/object/unit-tests
#task/action/implementation
#task/state/continue #task/status/active

---

### Script

#### Acts 1: 编写核心状态模型测试 `tests/test_core.py`

验证状态的初始化、错误处理、字符串解析以及相对滑行条件的计算。

~~~~~act
write_file
tests/test_core.py
~~~~~
~~~~~python
import unittest
from fsm_skating.core import State, get_relative_conditions

class TestCore(unittest.TestCase):
    def test_state_creation(self):
        s = State("L", "F", "O")
        self.assertEqual(str(s), "LFO")
        
        # 测试异常值
        with self.assertRaises(ValueError):
            State("X", "F", "O")
        with self.assertRaises(ValueError):
            State("L", "X", "O")
        with self.assertRaises(ValueError):
            State("L", "F", "X")

    def test_from_string(self):
        s = State.from_string(" rbi ")
        self.assertEqual(s.foot, "R")
        self.assertEqual(s.direction, "B")
        self.assertEqual(s.edge, "I")
        
        with self.assertRaises(ValueError):
            State.from_string("LFOO")

    def test_relative_conditions(self):
        s1 = State.from_string("LFO")
        s2 = State.from_string("LFI")
        conds = get_relative_conditions(s1, s2)
        self.assertTrue(conds["same_foot"])
        self.assertTrue(conds["same_dir"])
        self.assertFalse(conds["same_edge"])

        s3 = State.from_string("RBO")
        conds2 = get_relative_conditions(s1, s3)
        self.assertFalse(conds2["same_foot"])
        self.assertFalse(conds2["same_dir"])
        self.assertTrue(conds2["same_edge"])

if __name__ == "__main__":
    unittest.main()
~~~~~

#### Acts 2: 编写编排引擎测试 `tests/test_engine.py`

验证配置加载、动作匹配、序列校验逻辑以及生成算法。

~~~~~act
write_file
tests/test_engine.py
~~~~~
~~~~~python
import unittest
import os
from fsm_skating.core import State
from fsm_skating.engine import ChoreographyEngine

class TestEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # 确保能找到 moves_config.yaml
        cls.config_path = "moves_config.yaml"
        cls.engine = ChoreographyEngine(cls.config_path)

    def test_transitions_filtering(self):
        # LFO 到 LFI 应该是变刃步 (Change of Edge)
        s_start = State.from_string("LFO")
        transitions = self.engine.get_possible_transitions(s_start)
        
        # 查找目标状态为 LFI 的转移
        lfi_moves = [t for t in transitions if str(t["target_state"]) == "LFI"]
        self.assertTrue(any(m["move"]["id"] == "change_of_edge" for m in lfi_moves))

    def test_start_constraints(self):
        # 前外转三 (Forward Outside Three-Turn) 必须从 F, O 开始
        # LFO -> LBI 满足 conditions (同脚，换向，变刃) 且满足 F, O 约束
        s1 = State.from_string("LFO")
        s2 = State.from_string("LBI")
        moves = [m for m in self.engine.moves if m["id"] == "forward_outside_three_turn"]
        from fsm_skating.engine import check_match
        self.assertTrue(check_match(s1, s2, moves[0]))

        # LFI -> LBO 虽然满足 conditions，但不满足 F, O 约束
        s3 = State.from_string("LFI")
        s4 = State.from_string("LBO")
        self.assertFalse(check_match(s3, s4, moves[0]))

    def test_verify_sequence_valid(self):
        # 测试一个合法的简单序列: 左前外 -> 左后内 (转三) -> 右后内 (交叉步)
        seq = "LFO -> LBI -> RBI"
        result = self.engine.verify_sequence(seq)
        self.assertTrue(result["valid"])
        self.assertEqual(len(result["transitions"]), 2)
        self.assertEqual(result["transitions"][0]["selected_move"]["id"], "forward_outside_three_turn")

    def test_verify_sequence_invalid(self):
        # 原地踏步无效
        res = self.engine.verify_sequence("LFO -> LFO")
        self.assertFalse(res["valid"])
        
        # 物理不可达 (目前我们的 yaml 几乎覆盖了所有转移，构造一个逻辑上没有定义的动作)
        # 假设我们把所有动作删了，那就会不可达。这里测试格式错误。
        res = self.engine.verify_sequence("INVALID -> LFO")
        self.assertFalse(res["valid"])

    def test_generate_sequence(self):
        steps = 5
        max_diff = 3
        path = self.engine.generate_sequence(steps, max_diff)
        
        self.assertIsNotNone(path)
        self.assertEqual(len(path), steps + 1)
        
        # 验证每一步是否合规
        for i in range(len(path) - 1):
            curr_s, move = path[i]
            next_s, _ = path[i+1]
            from fsm_skating.engine import check_match
            self.assertTrue(check_match(curr_s, next_s, move))
            self.assertLessEqual(move["difficulty"], max_diff)

if __name__ == "__main__":
    unittest.main()
~~~~~

### 下一步建议
一旦测试通过，我们将进入最后的开发阶段：
1. 实现 `src/fsm_skating/cli.py` 命令行交互界面。它将提供三个子命令：`manual`（交互式编排）、`verify`（序列校验）和 `generate`（随机生成）。
2. 在 `pyproject.toml` 的 `project.scripts` 中已经定义了入口，我们将确保 CLI 能够正确调用引擎完成任务。
