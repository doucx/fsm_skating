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