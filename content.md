分析完全正确。测试失败是因为你之前主动调整并优化了配置文件中部分步法的难度评分，但单元测试文件中的断言（Assertion）仍然保留了修改前的老数值，从而在校验累加难度时出现了不一致。

我将生成一个计划来修正这一不一致性，将测试用例中的预期断言数值同步更新为你当前设定的难度配置。

## [WIP] fix: 修正测试断言难度数值以适配最新的步法难度配置

### 错误分析
通过对单元测试失败日志的分析，根本原因是：
1. **测试断言滞后**：你在之前的重构中，对 `moves_config.yaml` 中的核心动作难度系数进行了调整优化。例如，前内转三（`forward_inside_three_turn`）的难度由原来的 3 降为了 2，前内莫莫克（`forward_inside_mohawk`）由 2 降为了 1，后内转三（`backward_inside_three_turn`）降为了 2。
2. **校验数值冲突**：在我们写入最新的配置文件后，`test_verify_move_sequence_success` 的实际执行总难度变成了 $1 (\text{Stroke}) + 2 (\text{FI 3-Turn}) = 3$，而旧测试断言仍为 $4$；同理，`test_verify_move_sequence_complex_chain` 的实际执行总难度变成了 $1 (\text{Stroke}) + 1 (\text{FI Mohawk}) + 2 (\text{BI 3-Turn}) = 4$，而旧测试断言仍为 $7$。这两处数据由于没有同步更新，从而触发了 `AssertionError`。

### 用户需求
修正 `tests/test_phase2_move_centric.py` 里的断言，使测试用例中期望的总难度分值与当前最新的 `config/moves_config.yaml` 配置物理完全对齐。

### 评论
维护单元测试与业务配置文件的同步一致性是保证系统鲁棒性的必要步骤。难度调整作为业务逻辑变更，应当伴随着测试用例数值的同步演进。

### 目标
1. 将 `test_verify_move_sequence_success` 中的总难度断言从 `4` 修正为符合最新配置的 `3`。
2. 将 `test_verify_move_sequence_complex_chain` 中的总难度断言从 `7` 修正为符合最新配置的 `4`。
3. 重新运行整个测试套件，验证所有 18 项测试用例全部通过。

### 基本原理
直接修改 `tests/test_phase2_move_centric.py` 中对应的硬编码预期值，将其与 `moves_config.yaml` 中配置的各个动作难度求和公式（`1+2=3` 和 `1+1+2=4`）保持物理一致。

### 标签
#intent/fix #flow/ready #priority/high
#comp/tests #concept/executor #scope/core
#ai/delegate
#task/domain/testing
#task/object/test-suite
#task/action/bug-fix
#task/state/begin #task/status/active

---

### Script

#### Acts 1: 修正第一个测试断言 (Stroke + FI Three-Turn)
使用精确匹配替换 `tests/test_phase2_move_centric.py` 中 `test_verify_move_sequence_success` 的难度校验部分。

~~~~~act
patch_file
tests/test_phase2_move_centric.py
~~~~~
~~~~~python.old
    # 第二步: RFI --(Forward Inside Three-Turn)--> RBO
    # Three-Turn 条件: 同脚(T), 变向(F), 变刃(F)
    # 且 RFI 符合该动作的 Start Constraints (F, I)
    step2 = res.trace[1]
    assert str(step2.from_state) == "RFI"
    assert step2.move.id == "forward_inside_three_turn"
    assert str(step2.to_state) == "RBO"

    # 难度: 1 (Stroke) + 3 (FI 3-Turn) = 4
    assert res.total_difficulty == 4
~~~~~
~~~~~python.new
    # 第二步: RFI --(Forward Inside Three-Turn)--> RBO
    # Three-Turn 条件: 同脚(T), 变向(F), 变刃(F)
    # 且 RFI 符合该动作的 Start Constraints (F, I)
    step2 = res.trace[1]
    assert str(step2.from_state) == "RFI"
    assert step2.move.id == "forward_inside_three_turn"
    assert str(step2.to_state) == "RBO"

    # 难度: 1 (Stroke) + 2 (FI 3-Turn) = 3
    assert res.total_difficulty == 3
~~~~~

#### Acts 2: 修正第二个测试断言 (Stroke + FI Mohawk + BI Three-Turn)
使用精确匹配替换 `tests/test_phase2_move_centric.py` 中 `test_verify_move_sequence_complex_chain` 的难度断言部分。

~~~~~act
patch_file
tests/test_phase2_move_centric.py
~~~~~
~~~~~python.old
    res = engine.verify_move_sequence(moves, start_state=start)

    assert res.valid is True
    assert str(res.trace[0].to_state) == "RFI"
    assert str(res.trace[1].to_state) == "LBI"
    assert str(res.trace[2].to_state) == "LFO"
    assert res.total_difficulty == 1 + 2 + 4  # 7
~~~~~
~~~~~python.new
    res = engine.verify_move_sequence(moves, start_state=start)

    assert res.valid is True
    assert str(res.trace[0].to_state) == "RFI"
    assert str(res.trace[1].to_state) == "LBI"
    assert str(res.trace[2].to_state) == "LFO"
    assert res.total_difficulty == 1 + 1 + 2  # 4
~~~~~

#### Acts 3: 重新运行单元测试
再次执行测试套件以完成全部 18 个测试用例的覆盖校验。

~~~~~act
run_command
~~~~~
~~~~~
pytest
~~~~~

### 下一步建议
- **提交代码变更**：当确认 18 个单元测试全部成功通过后，建议生成一个包含 `git add` 和 `git commit` 的计划，以逻辑上完成这一阶段对于“引入步法几何差异化配置”的特性开发和测试修复，锁定工作进度。
