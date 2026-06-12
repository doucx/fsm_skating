收到！看到动作库诊断报告中的“缺失方向”和括号未闭合等细节，我们现在开始进行完美修复。

我们将：
1. **修改 `cli.py` 中的括号缺陷**：将 `(ID: {cat_id}` 修正为 `(ID: {cat_id})`。
2. **重写 `moves_config.yaml` 动作库**：将原先通用的 `bracket`、`rocker`、`counter`、`choctaw` 全面“精细化”分解为各自的 `FO`, `FI`, `BO`, `BI` 四向独立动作，并补全 `mohawk` 的 `BO`, `BI` 变体。
3. **升级单元测试 `tests/test_engine.py`**：将测试断言从“部分覆盖”升级为“断言所有 6 大核心步法分类皆达到 100% 全天候完美覆盖”。

以下是本轮修复的计划。

## [WIP] feat: 补全全系列花滑步法边缘变体以达到 100% 覆盖度

### 用户需求
修复诊断器指出的动作覆盖不全问题，将通用的括弧步、摇滚步、计数步、莫霍克步、乔克陶步全面拆解并补齐为 `FO`, `FI`, `BO`, `BI` 变体，使动作库达到 100% 专业覆盖率。同时修复 CLI 输出括号未闭合的问题。

### 评论
这是一次重大的数据升级。精细化这 24 个动作（6大类 × 4向）后，引擎的模拟和评估精度将达到前所未有的竞技水平，彻底消除所有 generic 警告，给选手和教练呈上最精细的难度反馈。

### 目标
1. 修正 `cli.py` 中打印括号缺失的 Bug。
2. 重写 `moves_config.yaml` 以提供完整 24 个方向细分动作，移除 generic 备用动作。
3. 更新测试用例 `tests/test_engine.py`，断言 6 大类别覆盖率全员达到 100%。
4. 运行 `pytest` 跑通测试。

### 基本原理
各步法的 4 种进入边缘变体对应的物理约束映射：
- **前外 (FO)**: `dir: "F", edge: "O"`
- **前内 (FI)**: `dir: "F", edge: "I"`
- **后外 (BO)**: `dir: "B", edge: "O"`
- **后内 (BI)**: `dir: "B", edge: "I"`

### 标签
#intent/build #flow/ready #priority/high
#comp/build #comp/cli #comp/tests #concept/config #scope/core #scope/ux
#ai/delegate
#task/domain/testing
#task/object/library-linter
#task/action/integration
#task/state/continue #task/status/active

---

### Script

#### Acts 1: 完美重写 `moves_config.yaml` 补全 24 个变体动作

我们将动作库完整铺开，为括弧、摇滚、计数、莫霍克、乔克陶补齐 `FO`, `FI`, `BO`, `BI` 所有物理细分。

~~~~~act
write_file
moves_config.yaml
~~~~~
~~~~~yaml
categories:
  three_turn: "转三步 (Three-Turn)"
  bracket: "括弧步 (Bracket)"
  rocker: "摇滚步 (Rocker)"
  counter: "计数步 (Counter)"
  mohawk: "莫霍克步 (Mohawk)"
  choctaw: "乔克陶步 (Choctaw)"

moves:
  # --- 变刃步 (Change of Edge) ---
  - id: "change_of_edge"
    name: "变刃滑行 (Change of Edge)"
    category: "change_of_edge"
    difficulty: 1
    conditions:
      same_foot: true
      same_dir: true
      same_edge: false

  # --- 转三步细分 (Three-Turn) ---
  - id: "forward_outside_three_turn"
    name: "前外转三 (Forward Outside Three-Turn)"
    category: "three_turn"
    difficulty: 2
    turn_rotation: "natural"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "F"
      edge: "O"

  - id: "forward_inside_three_turn"
    name: "前内转三 (Forward Inside Three-Turn)"
    category: "three_turn"
    difficulty: 3
    turn_rotation: "natural"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "F"
      edge: "I"

  - id: "backward_outside_three_turn"
    name: "后外转三 (Backward Outside Three-Turn)"
    category: "three_turn"
    difficulty: 5
    turn_rotation: "natural"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "B"
      edge: "O"

  - id: "backward_inside_three_turn"
    name: "后内转三 (Backward Inside Three-Turn)"
    category: "three_turn"
    difficulty: 4
    turn_rotation: "natural"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "B"
      edge: "I"

  # --- 括弧步细分 (Bracket) ---
  - id: "forward_outside_bracket"
    name: "前外括弧 (Forward Outside Bracket)"
    category: "bracket"
    difficulty: 4
    turn_rotation: "opposite"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "F"
      edge: "O"

  - id: "forward_inside_bracket"
    name: "前内括弧 (Forward Inside Bracket)"
    category: "bracket"
    difficulty: 4
    turn_rotation: "opposite"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "F"
      edge: "I"

  - id: "backward_outside_bracket"
    name: "后外括弧 (Backward Outside Bracket)"
    category: "bracket"
    difficulty: 5
    turn_rotation: "opposite"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "B"
      edge: "O"

  - id: "backward_inside_bracket"
    name: "后内括弧 (Backward Inside Bracket)"
    category: "bracket"
    difficulty: 5
    turn_rotation: "opposite"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "B"
      edge: "I"

  # --- 摇滚步细分 (Rocker) ---
  - id: "forward_outside_rocker"
    name: "前外摇滚 (Forward Outside Rocker)"
    category: "rocker"
    difficulty: 4
    turn_rotation: "natural"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: true
    start_constraints:
      dir: "F"
      edge: "O"

  - id: "forward_inside_rocker"
    name: "前内摇滚 (Forward Inside Rocker)"
    category: "rocker"
    difficulty: 4
    turn_rotation: "natural"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: true
    start_constraints:
      dir: "F"
      edge: "I"

  - id: "backward_outside_rocker"
    name: "后外摇滚 (Backward Outside Rocker)"
    category: "rocker"
    difficulty: 5
    turn_rotation: "natural"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: true
    start_constraints:
      dir: "B"
      edge: "O"

  - id: "backward_inside_rocker"
    name: "后内摇滚 (Backward Inside Rocker)"
    category: "rocker"
    difficulty: 5
    turn_rotation: "natural"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: true
    start_constraints:
      dir: "B"
      edge: "I"

  # --- 计数步细分 (Counter) ---
  - id: "forward_outside_counter"
    name: "前外计数 (Forward Outside Counter)"
    category: "counter"
    difficulty: 4
    turn_rotation: "opposite"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: true
    start_constraints:
      dir: "F"
      edge: "O"

  - id: "forward_inside_counter"
    name: "前内计数 (Forward Inside Counter)"
    category: "counter"
    difficulty: 4
    turn_rotation: "opposite"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: true
    start_constraints:
      dir: "F"
      edge: "I"

  - id: "backward_outside_counter"
    name: "后外计数 (Backward Outside Counter)"
    category: "counter"
    difficulty: 5
    turn_rotation: "opposite"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: true
    start_constraints:
      dir: "B"
      edge: "O"

  - id: "backward_inside_counter"
    name: "后内计数 (Backward Inside Counter)"
    category: "counter"
    difficulty: 5
    turn_rotation: "opposite"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: true
    start_constraints:
      dir: "B"
      edge: "I"

  # --- 标准蹬冰步 (Stroke) ---
  - id: "stroke"
    name: "标准蹬冰步 (Standard Stroke)"
    category: "stroke"
    difficulty: 1
    conditions:
      same_foot: false
      same_dir: true
      same_edge: false

  # --- 交叉步 (Cross Roll) ---
  - id: "cross_roll"
    name: "交叉步 (Cross Roll)"
    category: "cross_roll"
    difficulty: 2
    conditions:
      same_foot: false
      same_dir: true
      same_edge: true

  # --- 莫霍克步细分 (Mohawk) ---
  - id: "forward_inside_mohawk"
    name: "前内莫霍克 (Forward Inside Mohawk)"
    category: "mohawk"
    difficulty: 2
    turn_rotation: "natural"
    conditions:
      same_foot: false
      same_dir: false
      same_edge: true
    start_constraints:
      dir: "F"
      edge: "I"

  - id: "forward_outside_mohawk"
    name: "前外莫霍克 (Forward Outside Mohawk)"
    category: "mohawk"
    difficulty: 3
    turn_rotation: "natural"
    conditions:
      same_foot: false
      same_dir: false
      same_edge: true
    start_constraints:
      dir: "F"
      edge: "O"

  - id: "backward_outside_mohawk"
    name: "后外莫霍克 (Backward Outside Mohawk)"
    category: "mohawk"
    difficulty: 4
    turn_rotation: "natural"
    conditions:
      same_foot: false
      same_dir: false
      same_edge: true
    start_constraints:
      dir: "B"
      edge: "O"

  - id: "backward_inside_mohawk"
    name: "后内莫霍克 (Backward Inside Mohawk)"
    category: "mohawk"
    difficulty: 4
    turn_rotation: "natural"
    conditions:
      same_foot: false
      same_dir: false
      same_edge: true
    start_constraints:
      dir: "B"
      edge: "I"

  # --- 乔克陶步细分 (Choctaw) ---
  - id: "forward_outside_choctaw"
    name: "前外乔克陶 (Forward Outside Choctaw)"
    category: "choctaw"
    difficulty: 4
    turn_rotation: "opposite"
    conditions:
      same_foot: false
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "F"
      edge: "O"

  - id: "forward_inside_choctaw"
    name: "前内乔克陶 (Forward Inside Choctaw)"
    category: "choctaw"
    difficulty: 4
    turn_rotation: "opposite"
    conditions:
      same_foot: false
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "F"
      edge: "I"

  - id: "backward_outside_choctaw"
    name: "后外乔克陶 (Backward Outside Choctaw)"
    category: "choctaw"
    difficulty: 5
    turn_rotation: "opposite"
    conditions:
      same_foot: false
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "B"
      edge: "O"

  - id: "backward_inside_choctaw"
    name: "后内乔克陶 (Backward Inside Choctaw)"
    category: "choctaw"
    difficulty: 5
    turn_rotation: "opposite"
    conditions:
      same_foot: false
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "B"
      edge: "I"
~~~~~

#### Acts 2: 修复 `src/fsm_skating/cli.py` 括号未闭合问题

我们将 `(ID: {cat_id}` 修改为 `(ID: {cat_id})`。

~~~~~act
patch_file
src/fsm_skating/cli.py
~~~~~
~~~~~python.old
    for cat_id, info in report.items():
        name = info["name"]
        impl = info["implemented"]
        miss = info["missing"]
        generic = info["generic_count"]
        
        total = len(impl)
        percentage = (total / 4) * 100
        
        print(f"\n📁 类别: {name} (ID: {cat_id}")
        print(f"  * 覆盖率: {percentage:.0f}% (已明确实现 {total}/4 个物理滑行变体)")
~~~~~
~~~~~python.new
    for cat_id, info in report.items():
        name = info["name"]
        impl = info["implemented"]
        miss = info["missing"]
        generic = info["generic_count"]
        
        total = len(impl)
        percentage = (total / 4) * 100
        
        print(f"\n📁 类别: {name} (ID: {cat_id})")
        print(f"  * 覆盖率: {percentage:.0f}% (已明确实现 {total}/4 个物理滑行变体)")
~~~~~

#### Acts 3: 升级测试文件 `tests/test_engine.py`

修改测试中的覆盖率断言，使其严格约束 6 大类全部达到 100% 满覆盖率，并且不再有 generic 通用垫底动作。

~~~~~act
patch_file
tests/test_engine.py
~~~~~
~~~~~python.old
def test_library_integrity(engine):
    report = engine.check_library_integrity()
    assert "three_turn" in report
    assert "mohawk" in report
    
    # three_turn 应该是 100% 覆盖 (FO, FI, BO, BI)
    assert len(report["three_turn"]["implemented"]) == 4
    assert len(report["three_turn"]["missing"]) == 0
    
    # mohawk 应该是部分覆盖 (只有 FO, FI)
    assert "FO" in report["mohawk"]["implemented"]
    assert "FI" in report["mohawk"]["implemented"]
    assert "BO" in report["mohawk"]["missing"]
    assert "BI" in report["mohawk"]["missing"]
~~~~~
~~~~~python.new
def test_library_integrity(engine):
    report = engine.check_library_integrity()
    
    # 断言 6 大类别均被引擎正常捕获并加载
    core_categories = ["three_turn", "bracket", "rocker", "counter", "mohawk", "choctaw"]
    for cat in core_categories:
        assert cat in report
        # 断言每一个分类都已经实现 100% 全边缘方向 (FO, FI, BO, BI) 覆盖
        assert len(report[cat]["implemented"]) == 4
        assert len(report[cat]["missing"]) == 0
        # 此时不应该再有依赖 generic 通用动作兜底的情况
        assert report[cat]["generic_count"] == 0
~~~~~

### 下一步建议
- **执行验证**: 运行 `uv run fsm-skating` 进入功能菜单选择 `4`。你会发现，所有的 6 大步法全都被标记为 **🌟 诊断: 优秀！该类步法具有100%全向覆盖...** 并且覆盖率全部显示 **100%**！
- **最终提交**: 确认无误后，我们将生成 `[COMMIT]` 计划，将这次标志着系统动作数据库全面健全的伟大小结进行 Git 归档。
