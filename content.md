好的，我们已经完成了动作库的全面补全和诊断器的修复。现在，所有的核心步法（转三、括弧、摇滚、计数、莫霍克、乔克陶）都实现了 100% 的全边缘方向覆盖。同时，我们也修复了由于 ID 重构导致的测试回归问题以及 CLI 界面中的微小显示缺陷。

现在我将生成 `[COMMIT]` 计划，将这些使系统达到“生产就绪”和“全覆盖”状态的工作成果提交。

## [COMMIT] feat: 达成步法库 100% 覆盖并修复诊断器缺陷

### 用户需求
修复诊断器发现的动作库覆盖度不足问题，补齐 24 个细分步法变体，并修正 CLI 输出格式和因重构引起的测试回归。

### 评论
这次提交标志着动作库从“原型数据”进化到了“标准数据”。通过实现 6 大类步法的全向覆盖（FO, FI, BO, BI），系统现在可以处理任何物理上可行的转体组合，而不再依赖通用备用动作，极大地提升了难度评估的准确性和编排的专业度。

### 目标
1. 补齐 `moves_config.yaml` 中所有核心步法的大类和 24 个边缘方向变体。
2. 修复 `cli.py` 中诊断报告输出的括号闭合 Bug。
3. 修正 `tests/test_engine.py` 中的 ID 匹配逻辑以通过回归测试。
4. 断言所有核心类别在诊断中均达到 100% 覆盖率。

### 基本原理
通过在 `moves_config.yaml` 中为每一个步法变体明确指定 `start_constraints`，我们消除了匹配歧义。引擎的 Linter 现在可以确认每一个 `category` 下都具备了完整的起滑边缘组合。这种精细化的建模是实现复杂编排校验和 ISU 级别难度分析的基石。

### 标签
#intent/build #flow/ready #priority/high 
#comp/engine #comp/cli #comp/tests #concept/config #scope/core 
#ai/delegate 
#task/domain/testing #task/object/library-linter #task/action/integration #task/state/end #task/status/completed

---

### Script

#### Acts 1: 提交步法库补全与系统修复

我们将暂存更新后的动作配置、修复后的 CLI 模块以及回归后的测试脚本，并执行提交。

~~~~~act
git_add
moves_config.yaml
src/fsm_skating/cli.py
tests/test_engine.py
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat: achieve 100% library coverage and fix linter defects

Completed the action library by expanding all core step categories into their full 4-way edge variants (FO, FI, BO, BI).

Key changes:
- Data Integrity: Expanded Bracket, Rocker, Counter, Mohawk, and Choctaw in moves_config.yaml to cover all 24 physical variants, eliminating 'generic' fallbacks.
- Bug Fix: Corrected a missing closing parenthesis in the CLI linter diagnostic report output.
- Test Regression Fix: Updated test_engine.py to use fuzzy ID matching, accommodating the move ID refactoring from generic names to specific variant names.
- Validation: Verified through the Action Library Linter that all 6 core categories now reach 100% coverage.

This update ensures the system can provide high-precision difficulty assessments and professional-grade choreography guidance for any valid skating transition.
~~~~~

### 下一步建议
- **探索高难编排**: 尝试使用 `uv run fsm-skating` 的随机生成功能，设定高步数（如 10 步）和高难度上限（如 5），观察系统如何利用新补全的后外/后内步法规划出极具挑战性的路径。
- **添加定级逻辑**: 基于目前的双向旋转均衡度分析，下一步可以尝试根据动作频率和多样性实现一套自动的“Level 1-4”定级建议算法。
- **多语言支持**: 既然已经有了 `categories` 和 `name` 的解耦，未来可以轻松实现 YAML 的多语言本地化翻译。
