好的，我们已经成功引入了花样滑冰旋转方向的物理推导模型，并实现了基于 ISU 规则的双向旋转均衡度分析。这不仅消除了转三与括弧等动作在物理匹配上的歧义，更为编排提供了极具专业价值的定级指导。

现在我将生成 `[COMMIT]` 计划，将这一核心功能增强提交到代码库。

## [COMMIT] feat: 引入绝对旋转方向计算与 ISU 均衡度评估

### 用户需求
区分滑行中的顺时针 (CW) 与逆时针 (CCW) 旋转，从而精确识别物理转移条件相同但转动极性不同的动作（如转三与括弧、摇滚与计数），并为整套编排提供 ISU 旋转双向均衡度合规性分析。

### 评论
此次更新将系统从基础的“动作逻辑库”提升到了“专业竞技辅助工具”的高度。通过力学推导（Curvature + Polarity）实现绝对旋转方向的判定，体现了数学模型与运动力学的完美结合，极大增强了系统的实用价值和专业壁垒。

### 目标
1. 在核心模型中实现滑行弧线自然弯曲方向的几何推导。
2. 在动作配置中引入转动极性（Natural/Opposite）标识。
3. 在匹配引擎中动态注入 CW/CCW 旋转方向。
4. 在 CLI 中实现基于 ISU 标准的旋转均衡度统计与分析报告。

### 基本原理
利用进入状态的“脚、方向、用刃”组合可以唯一确定进入弧线的物理弯曲方向。通过判定动作是顺着圆弧（Natural）转动还是背离圆弧（Opposite）转动，系统可以严密推导出绝对的 CW/CCW 旋转。这不仅区分了动作歧义，还满足了 ISU 对步法难度定级（Level 1-4）中关于“双向转体均衡性”的核心评价指标。

### 标签
#intent/build #flow/ready #priority/high 
#comp/engine #comp/cli #concept/state #scope/core #scope/ux 
#ai/delegate 
#task/domain/ui #task/object/rotation-analysis #task/action/integration #task/state/end #task/status/completed

---

### Script

#### Acts 1: 提交旋转方向区分与 ISU 均衡度分析功能

我们将暂存涉及物理模型、配置库、引擎逻辑、交互界面及测试的所有变更，并执行提交。

~~~~~act
git_add
src/fsm_skating/core.py
src/fsm_skating/engine.py
src/fsm_skating/cli.py
moves_config.yaml
tests/test_engine.py
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat: add absolute rotation inference and ISU balance analysis

Introduced a physics-based model to distinguish between Clockwise (CW) and Counter-Clockwise (CCW) rotations.

Key improvements:
- Physical Inference: Added 'get_natural_curvature' to core.py to derive arc direction from state parameters.
- Disambiguation: Updated moves_config.yaml with 'turn_rotation' (natural vs. opposite) to distinguish Three-turns from Brackets and Rockers from Counters.
- Data Injection: Enhanced the engine to dynamically compute and inject 'rotation_dir' into matched transitions.
- ISU Analytics: Added a comprehensive rotation balance report in the CLI, calculating CW/CCW distribution ratios to assist in ISU Level 4 step sequence planning.
- Testing: Added unit tests to verify the accuracy of rotation direction derivation for complex turns.

This enhancement transforms the FSM from a state transition tracker into a professional skating choreography evaluator.
~~~~~

### 下一步建议
- **执行验证**: 建议再次运行 `uv run fsm-skating` 并选择“交互式手动编排”，观察导出结果中新增的 `[顺时针 ↻]` / `[逆时针 ↺]` 标识以及结尾的 ISU 均衡度分析。
- **扩展定级指标**: 未来可以考虑引入“冰面覆盖率”或“身体姿态多样性”的配置项，进一步丰富定级分析的维度。
- **动作分支**: 现在你可以在 `moves_config.yaml` 中为括弧步等动作添加具体的 `start_constraints`，以进一步细化不同进入方向下的难度分数。
