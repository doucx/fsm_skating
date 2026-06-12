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