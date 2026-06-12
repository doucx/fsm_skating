由于我们将 `moves_config.yaml` 中的通用 ID（如 `bracket`）重构为了具体的 ID（如 `forward_outside_bracket`），导致测试用例中通过完全匹配 ID 来查找动作的逻辑失效了。

我们需要修正 `tests/test_engine.py`，使用模糊匹配（`in`）或者更精确的重构后 ID 来定位动作。

## [WIP] fix: 修复因动作 ID 重构导致的测试断言失败

### 错误分析
在 `test_rotation_direction_inference` 测试中，代码尝试通过 `m["move"]["id"] == "bracket"` 寻找括弧步。但在最新的 `moves_config.yaml` 中，该动作的 ID 已变为 `forward_outside_bracket`。这导致列表推导式返回空列表，从而触发了 `IndexError`。

### 用户需求
修复测试套件，使其能够正确识别重构后的动作 ID。

### 评论
这是一个典型的由于数据结构变更引发的回归问题。通过将精确 ID 匹配改为包含性匹配（`in`），可以增强测试脚本对数据变化的容忍度。

### 目标
1. 修正 `tests/test_engine.py` 中的 ID 查找逻辑。
2. 确保所有 10 个测试用例全部通过。

### 标签
#intent/fix #flow/ready #priority/high 
#comp/tests #scope/core 
#ai/delegate
#task/domain/testing #task/object/test-suite #task/action/fix #task/state/continue

---

### Script

#### Acts 1: 修正 `tests/test_engine.py` 中的 ID 匹配逻辑

我们将精确匹配 `== "bracket"` 修改为模糊匹配 `"bracket" in m["move"]["id"]`。

~~~~~act
patch_file
tests/test_engine.py
~~~~~
~~~~~python.old
    lbi_moves = [r for r in results if str(r["target_state"]) == "LBI"]
    assert len(lbi_moves) >= 2
    
    three_turn = [m for m in lbi_moves if "three_turn" in m["move"]["id"]][0]
    bracket = [m for m in lbi_moves if m["move"]["id"] == "bracket"][0]
    
    assert three_turn["move"]["rotation_dir"] == "CCW"
~~~~~
~~~~~python.new
    lbi_moves = [r for r in results if str(r["target_state"]) == "LBI"]
    assert len(lbi_moves) >= 2
    
    three_turn = [m for m in lbi_moves if "three_turn" in m["move"]["id"]][0]
    bracket = [m for m in lbi_moves if "bracket" in m["move"]["id"]][0]
    
    assert three_turn["move"]["rotation_dir"] == "CCW"
~~~~~

#### Acts 2: 再次执行测试验证

~~~~~act
run_command
~~~~~
~~~~~
uv run pytest
~~~~~

### 下一步建议
测试通过后，我们将得到一个 100% 覆盖率且逻辑完全闭环的系统。你可以尝试运行 `fsm-skating` 查看诊断报告，确认所有 generic 警告均已消失。随后我们可以进行最终提交。
