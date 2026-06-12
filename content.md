这是一个非常有前瞻性且极具工程美学的设计！

在专业花滑动作库的设计中，像转三步（Three-Turn）这类核心步法，理应在物理上穷尽 **4 种不同的进入用刃方向**：
- **FO** (Forward Outside, 前外)
- **FI** (Forward Inside, 前内)
- **BO** (Backward Outside, 后外)
- **BI** (Backward Inside, 后内)

如果某个步法（如 Mohawk 莫霍克步）在配置中只实现了部分方向（例如只有前内/前外，缺失后外/后内），这在专业编排中属于“动作库覆盖度缺失”。

为了实现这一“完整性检查诊断器 (Linter)”，我们需要对数据结构和业务进行如下演进：
1. **数据结构重构**：
   - 在 `moves_config.yaml` 顶部，新增一个 `categories` 字典（声明转三、莫霍克等核心大类）。
   - 在每个动作中，添加 `category` 指向大类。
2. **逻辑编写**：
   - 检查器收集大类，并检测该大类在 `moves` 列表中，是否完整实现了 `["FO", "FI", "BO", "BI"]` 四大变体（通过识别 `start_constraints` 得到 `variant`）。
   - 如果没有 `start_constraints`，判定为“通用动作匹配（Fallback）”。
3. **CLI 菜单扩展**：
   - 新增第 4 个主功能菜单项：`4. 动作库完整性诊断 (Action Library Linter)`。

下面是针对该诊断特性的实施计划。

## [WIP] feat: 引入动作库完整性检查器 (Action Library Linter)

### 用户需求
引入步法大类分类模型，提供动作库完整性检查诊断器，自动扫描并分析有哪些核心步法缺失了哪些具体的边缘方向变体（FO, FI, BO, BI），以此促成动作库的完备。

### 评论
该项升级为整个编排系统引入了类似“静态代码分析”或“规范性 Lint”的机制，使得状态机配置的健壮性有了质的提升。它可以清晰指导动作设计者哪些难度需要进一步微调、哪些死角尚未被覆盖。

### 目标
1. **重写** `moves_config.yaml`（因为重构比例 >30%，完全符合 `write_strategy`，我们将完整重写），加入 categories 及各动作大类标记。
2. **在 `engine.py` 中** 编写 `check_library_integrity` 函数，通过物理约束反向推演其变体覆盖度。
3. **在 `cli.py` 中** 新增 `run_linter` 诊断界面，展示漂亮的图形化覆盖率诊断分析报告。
4. **在 `tests/test_engine.py` 中** 编写集成诊断测试，确保检查器的输出结果 100% 准确。

### 基本原理
- 变体推演：若动作约束为 `dir: "F", edge: "O"` ──▶ 标记为已实现 `FO` 变体。
- 检查器自动将实现列表与标准集合 `{"FO", "FI", "BO", "BI"}` 进行对差异计算（Difference），输出精确的 Missing 集合。

### 标签
#intent/build #flow/ready #priority/high
#comp/engine #comp/cli #comp/tests #concept/config #scope/core #scope/dx
#ai/delegate
#task/domain/testing
#task/object/library-linter
#task/action/integration
#task/state/begin #task/status/active

---

### Script

#### Acts 1: 重写 `moves_config.yaml` 引入分类元数据

我们新增 `categories` 节点，并为所有的动作条目关联 `category` 分类（对于非核心转体的基本过渡步，如蹬冰步等，无需列在 categories 中）。

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

  # --- 括弧步 (Bracket) ---
  - id: "bracket"
    name: "括弧步 (Bracket)"
    category: "bracket"
    difficulty: 4
    turn_rotation: "opposite"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: false

  # --- 摇滚步 (Rocker) ---
  - id: "rocker"
    name: "摇滚步 (Rocker)"
    category: "rocker"
    difficulty: 4
    turn_rotation: "natural"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: true

  # --- 计数步 (Counter) ---
  - id: "counter"
    name: "计数步 (Counter)"
    category: "counter"
    difficulty: 4
    turn_rotation: "opposite"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: true

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

  # --- 乔克陶步 (Choctaw) ---
  - id: "choctaw"
    name: "乔克陶步 (Choctaw)"
    category: "choctaw"
    difficulty: 4
    turn_rotation: "opposite"
    conditions:
      same_foot: false
      same_dir: false
      same_edge: false
~~~~~

#### Acts 2: 在 `src/fsm_skating/engine.py` 中实现 Linter 校验分析逻辑

在引擎尾部，增加 `check_library_integrity` 方法，通过提取动作起滑约束解析其实现的子变体（如 "FO" 等）。

~~~~~act
patch_file
src/fsm_skating/engine.py
~~~~~
~~~~~python.old
        # 组装返回结果
        result = []
        curr = init_state
        for nxt_state, move in sub_path:
            result.append((curr, move))
            curr = nxt_state
        result.append((curr, None))

        return result
~~~~~
~~~~~python.new
        # 组装返回结果
        result = []
        curr = init_state
        for nxt_state, move in sub_path:
            result.append((curr, move))
            curr = nxt_state
        result.append((curr, None))

        return result

    def check_library_integrity(self) -> Dict[str, Any]:
        """
        检查动作库中各类别动作的覆盖度 (FO, FI, BO, BI)。
        返回各类别已实现和缺失的变体。
        """
        with open(self.config_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        
        categories = data.get("categories", {
            "three_turn": "转三步 (Three-Turn)",
            "bracket": "括弧步 (Bracket)",
            "rocker": "摇滚步 (Rocker)",
            "counter": "计数步 (Counter)",
            "mohawk": "莫霍克步 (Mohawk)",
            "choctaw": "乔克陶步 (Choctaw)"
        })

        required = ["FO", "FI", "BO", "BI"]
        report = {}

        for cat_id, cat_name in categories.items():
            report[cat_id] = {
                "name": cat_name,
                "implemented": [],
                "missing": list(required),
                "generic_count": 0
            }

        # 遍历动作，依据约束反推其对应的特定边缘方向变体
        for move in self.moves:
            cat_id = move.get("category")
            if not cat_id or cat_id not in report:
                continue
            
            constraints = move.get("start_constraints")
            if constraints and "dir" in constraints and "edge" in constraints:
                variant = f"{constraints['dir']}{constraints['edge']}"
                if variant in required:
                    if variant not in report[cat_id]["implemented"]:
                        report[cat_id]["implemented"].append(variant)
                    if variant in report[cat_id]["missing"]:
                        report[cat_id]["missing"].remove(variant)
            else:
                # 若无约束，判定为可通用捕获所有该方向转体动作的 Fallback 规则
                report[cat_id]["generic_count"] += 1

        return report
~~~~~

#### Acts 3: 在 `src/fsm_skating/cli.py` 中编写 TUI 诊断报告及主菜单集成

编写 `run_linter` 诊断报告，并在主控制台中将该功能整合为第 4 菜单选项。

~~~~~act
patch_file
src/fsm_skating/cli.py
~~~~~
~~~~~python.old
def main():
    parser = argparse.ArgumentParser(description="花样滑冰步法智能编排状态机系统 CLI")
~~~~~
~~~~~python.new
def run_linter(engine: ChoreographyEngine):
    """
    4. 动作库完整性诊断模块
    """
    print("\n❄️  进入 [4. 动作库完整性诊断模块] ❄️")
    print("正在扫描动作配置文件中各核心步法的边缘覆盖度 (FO, FI, BO, BI)...")
    
    report = engine.check_library_integrity()
    
    print("\n" + "📊" * 15)
    print("        📊 动作库完整性诊断报告 📊")
    print("📊" * 15)
    
    for cat_id, info in report.items():
        name = info["name"]
        impl = info["implemented"]
        miss = info["missing"]
        generic = info["generic_count"]
        
        total = len(impl)
        percentage = (total / 4) * 100
        
        print(f"\n📁 类别: {name} (ID: {cat_id}")
        print(f"  * 覆盖率: {percentage:.0f}% (已明确实现 {total}/4 个物理滑行变体)")
        
        if impl:
            print(f"  * ✅ 已实现方向: {', '.join(impl)}")
        if miss:
            print(f"  * ❌ 缺失的方向: {', '.join(miss)}")
        if generic > 0:
            print(f"  * ⚠️ 包含 {generic} 个通用备用动作 (未设定起滑方向约束)")
            
        # 诊断建议
        if percentage == 100:
            print("  * 🌟 诊断: 优秀！该类步法具有100%全向覆盖，支持进行高精度的编排和细密难度微调。")
        elif percentage > 0:
            print("  * ⚠️ 诊断: 覆盖度不全。缺失的滑动方向将由通用动作托管，建议补齐具体方向以使难度评级更精准。")
        else:
            if generic > 0:
                print("  * ℹ️ 诊断: 缺少方向细分。目前全部依靠通用动作，建议根据滑行轨迹细分为 FO/FI/BO/BI 变体。")
            else:
                print("  * 🔴 诊断: 极度匮乏！库中暂无此类别下的任何有效动作。")
                
    print("\n" + "📊" * 15 + "\n")


def main():
    parser = argparse.ArgumentParser(description="花样滑冰步法智能编排状态机系统 CLI")
~~~~~

~~~~~act
patch_file
src/fsm_skating/cli.py
~~~~~
~~~~~python.old
    while True:
        print("\n" + "=" * 50)
        print("    ❄️  花样滑冰步法智能编排状态机系统 ⛸️")
        print("=" * 50)
        print("  1. 交互式手动编排模块 (Interactive Choreographer)")
        print("  2. 序列解析与合法性验证模块 (Sequence Verifier)")
        print("  3. 智能随机生成模块 (Auto-Generator)")
        print("  4. 退出系统 (Exit)")
        print("=" * 50)
        choice = input("请选择功能序号 [1-4]: ").strip()

        if choice == "1":
            run_interactive(engine)
        elif choice == "2":
            run_verifier(engine)
        elif choice == "3":
            run_generator(engine)
        elif choice == "4":
            print("\n感谢使用！滑冰愉快！❄️")
            break
        else:
            print("[-] 无效序号，请在 [1-4] 之间进行选择。")
~~~~~
~~~~~python.new
    while True:
        print("\n" + "=" * 50)
        print("    ❄️  花样滑冰步法智能编排状态机系统 ⛸️")
        print("=" * 50)
        print("  1. 交互式手动编排模块 (Interactive Choreographer)")
        print("  2. 序列解析与合法性验证模块 (Sequence Verifier)")
        print("  3. 智能随机生成模块 (Auto-Generator)")
        print("  4. 动作库完整性诊断 (Action Library Linter)")
        print("  5. 退出系统 (Exit)")
        print("=" * 50)
        choice = input("请选择功能序号 [1-5]: ").strip()

        if choice == "1":
            run_interactive(engine)
        elif choice == "2":
            run_verifier(engine)
        elif choice == "3":
            run_generator(engine)
        elif choice == "4":
            run_linter(engine)
        elif choice == "5":
            print("\n感谢使用！滑冰愉快！❄️")
            break
        else:
            print("[-] 无效序号，请在 [1-5] 之间进行选择。")
~~~~~

#### Acts 4: 在 `tests/test_engine.py` 中编写 Linter 单元测试

确保诊断器计算转三步（100%全覆盖）和莫霍克步（2/4覆盖）的逻辑与变体反向分析绝对准确。

~~~~~act
patch_file
tests/test_engine.py
~~~~~
~~~~~python.old
def test_generate_sequence(engine):
    # 测试随机生成 5 步
    path = engine.generate_sequence(steps=5, max_difficulty=3, start_state=State.from_string("LFO"))
    assert path is not None
    assert len(path) == 6 # 5步动作产生 6 个状态
    # 验证生成的每一步是否都真实存在且符合难度要求
    for i in range(len(path) - 1):
        move = path[i][1]
        assert move["difficulty"] <= 3
~~~~~
~~~~~python.new
def test_generate_sequence(engine):
    # 测试随机生成 5 步
    path = engine.generate_sequence(steps=5, max_difficulty=3, start_state=State.from_string("LFO"))
    assert path is not None
    assert len(path) == 6 # 5步动作产生 6 个状态
    # 验证生成的每一步是否都真实存在且符合难度要求
    for i in range(len(path) - 1):
        move = path[i][1]
        assert move["difficulty"] <= 3

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

### 下一步建议
- **执行验证**: 运行 `uv run fsm-skating` 进入功能菜单，选择 `4`。你将看到一个极具洞察力的诊断报告，直观显示三转步 100% 覆盖，而 Mohawk 缺失 `BO`、`BI` 的警告！
- **下一步提交**: 验证无误后，我们生成 `[COMMIT]` 计划将此次富有深度和美感的 Linter 增强性功能提交！
