这是一个极具深度且切中花滑规则核心（ISU 难度评级）的优秀建议！

在花滑规则中，**顺时针 (CW)** 和 **逆时针 (CCW)** 双向旋转的均衡性是提升接续步定级（Level 1-4）的关键要素之一。由于转三步/括弧步、摇滚步/计数步等动作具有对称性的几何轨道，我们可以通过推导其**起始状态的物理圆弧偏倚（弯曲方向）**，结合动作本身的**相对转体机制（同向/反向）**，完全精确地计算出每一次转体在真实物理世界中的**绝对旋转方向 (CW/CCW)**。

绝对旋转方向数学推导
1. **起始弧线弯曲方向 (Entry Curvature)**：
   - 依据脚 ($F$)、滑行方向 ($D$)、用刃 ($E$) 综合判定：
     - **LFO / RFI / LBI / RBO** 的自然圆弧轨迹是 **逆时针 (CCW)** 弯曲。
     - **RFO / LFI / LBO / RBI** 的自然圆弧轨迹是 **顺时针 (CW)** 弯曲。
2. **转体转动极性 (Turn Rotation polarity)**：
   - **自然旋转 (`natural`)**：与起刃弧线方向一致（例如转三步 Three-Turn、摇滚步 Rocker、莫霍克步 Mohawk）。
   - **背刃旋转 (`opposite`)**：与起刃弧线方向相反（例如括弧步 Bracket、计数步 Counter、乔克陶步 Choctaw）。

通过 `起始弧线弯曲方向` + `转体转动极性`，我们即可精确输出本次转移是 `CW` 还是 `CCW`，并能直接计算出编排中 CW/CCW 的分布比例。

下面是实现该功能的扩展计划。

## [WIP] feat: 引入旋转方向区分及 ISU 旋转均衡度评估

### 用户需求
区分转三与括弧、摇滚与计数等转移条件相同但转体方向不同的动作，并在编排/校验完成后，评估是否符合 ISU 的双向旋转定级标准。

### 评论
这个改进将系统从一个简单的“状态转换器”提升到了“专业编排合规评估器”的高度。通过引入绝对旋转方向的几何计算，我们不仅能准确区分物理特征相同的动作，还能给出极具专业指导意义的 ISU 定级参考。

### 目标
1. 修改 `src/fsm_skating/core.py`，增加 `get_natural_curvature(state)` 物理推导函数。
2. 修改 `moves_config.yaml`，为相关转体动作引入 `turn_rotation: "natural" | "opposite"` 属性。
3. 修改 `src/fsm_skating/engine.py`，在动作匹配和校验管道中，计算并注入绝对旋转方向 `rotation_dir` (CW / CCW)。
4. 修改 `src/fsm_skating/cli.py`，增加 ISU 旋转方向均衡度统计分析展示。
5. 运行测试，更新验证。

### 基本原理
绝对旋转方向的推导关系：
- 若 `turn_rotation == "natural"`：绝对旋转 = 起始弧线方向。
- 若 `turn_rotation == "opposite"`：绝对旋转 = 翻转起始弧线方向。

### 标签
#intent/build #flow/ready #priority/high
#comp/engine #comp/cli #concept/state #scope/core #scope/ux
#ai/delegate
#task/domain/ui
#task/object/sqlite-backend
#task/action/integration
#task/state/begin #task/status/active

---

### Script

#### Acts 1: 在 `src/fsm_skating/core.py` 中实现自然滑行弧线方向计算

我们增加 `get_natural_curvature` 物理几何计算函数。

~~~~~act
patch_file
src/fsm_skating/core.py
~~~~~
~~~~~python.old
def get_relative_conditions(s1: State, s2: State) -> Dict[str, bool]:
    """
    计算从状态 s1 转移到状态 s2 的相对物理条件比对属性：
    - same_foot: 是否同脚
    - same_dir: 是否同向
    - same_edge: 是否同刃
    """
    return {
        "same_foot": s1.foot == s2.foot,
        "same_dir": s1.direction == s2.direction,
        "same_edge": s1.edge == s2.edge,
    }


# 8 个基础状态常量列表
ALL_STATES = [
~~~~~
~~~~~python.new
def get_relative_conditions(s1: State, s2: State) -> Dict[str, bool]:
    """
    计算从状态 s1 转移到状态 s2 的相对物理条件比对属性：
    - same_foot: 是否同脚
    - same_dir: 是否同向
    - same_edge: 是否同刃
    """
    return {
        "same_foot": s1.foot == s2.foot,
        "same_dir": s1.direction == s2.direction,
        "same_edge": s1.edge == s2.edge,
    }


def get_natural_curvature(state: State) -> str:
    """
    根据滑行的物理力学，推导当前状态滑行轨迹的自然圆弧弯曲方向 (Curvature)：
    - LFO / RFI / LBI / RBO 的圆弧弯曲为逆时针 (CCW)
    - RFO / LFI / LBO / RBI 的圆弧弯曲为顺时针 (CW)
    """
    if state.foot == "L":
        if state.direction == "F":
            return "CCW" if state.edge == "O" else "CW"
        else:  # B
            return "CW" if state.edge == "O" else "CCW"
    else:  # R
        if state.direction == "F":
            return "CW" if state.edge == "O" else "CCW"
        else:  # B
            return "CCW" if state.edge == "O" else "CW"


# 8 个基础状态常量列表
ALL_STATES = [
~~~~~

#### Acts 2: 升级 `moves_config.yaml` 引入转体方向标识

更新转三、括弧、摇滚、计数、莫霍克、乔克陶动作的 `turn_rotation`。

~~~~~act
patch_file
moves_config.yaml
~~~~~
~~~~~yaml.old
  # --- 转三步细分 (Three-Turn) ---
  - id: "forward_outside_three_turn"
    name: "前外转三 (Forward Outside Three-Turn)"
    difficulty: 2
    conditions:
      same_foot: true
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "F"
      edge: "O"

  - id: "forward_inside_three_turn"
    name: "前内转三 (Forward Inside Three-Turn)"
    difficulty: 3
    conditions:
      same_foot: true
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "F"
      edge: "I"

  - id: "backward_outside_three_turn"
    name: "后外转三 (Backward Outside Three-Turn)"
    difficulty: 5
    conditions:
      same_foot: true
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "B"
      edge: "O"

  - id: "backward_inside_three_turn"
    name: "后内转三 (Backward Inside Three-Turn)"
    difficulty: 4
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
    difficulty: 4
    conditions:
      same_foot: true
      same_dir: false
      same_edge: false
    # 括弧步的物理转移状态条件与转三步相同，只是旋转方向不同。
    # 这里我们允许不加 start_constraints，作为一个通用匹配项。

  # --- 摇滚步 (Rocker) ---
  - id: "rocker"
    name: "摇滚步 (Rocker)"
    difficulty: 4
    conditions:
      same_foot: true
      same_dir: false
      same_edge: true

  # --- 计数步 (Counter) ---
  - id: "counter"
    name: "计数步 (Counter)"
    difficulty: 4
    conditions:
      same_foot: true
      same_dir: false
      same_edge: true
~~~~~
~~~~~yaml.new
  # --- 转三步细分 (Three-Turn) ---
  - id: "forward_outside_three_turn"
    name: "前外转三 (Forward Outside Three-Turn)"
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
    difficulty: 4
    turn_rotation: "opposite"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: false
    # 括弧步的物理转移状态条件与转三步相同，只是旋转方向不同。
    # 这里我们允许不加 start_constraints，作为一个通用匹配项。

  # --- 摇滚步 (Rocker) ---
  - id: "rocker"
    name: "摇滚步 (Rocker)"
    difficulty: 4
    turn_rotation: "natural"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: true

  # --- 计数步 (Counter) ---
  - id: "counter"
    name: "计数步 (Counter)"
    difficulty: 4
    turn_rotation: "opposite"
    conditions:
      same_foot: true
      same_dir: false
      same_edge: true
~~~~~

~~~~~act
patch_file
moves_config.yaml
~~~~~
~~~~~yaml.old
  # --- 莫霍克步细分 (Mohawk) ---
  - id: "forward_inside_mohawk"
    name: "前内莫霍克 (Forward Inside Mohawk)"
    difficulty: 2
    conditions:
      same_foot: false
      same_dir: false
      same_edge: true
    start_constraints:
      dir: "F"
      edge: "I"

  - id: "forward_outside_mohawk"
    name: "前外莫霍克 (Forward Outside Mohawk)"
    difficulty: 3
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
    difficulty: 4
    conditions:
      same_foot: false
      same_dir: false
      same_edge: false
~~~~~
~~~~~yaml.new
  # --- 莫霍克步细分 (Mohawk) ---
  - id: "forward_inside_mohawk"
    name: "前内莫霍克 (Forward Inside Mohawk)"
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
    difficulty: 4
    turn_rotation: "opposite"
    conditions:
      same_foot: false
      same_dir: false
      same_edge: false
~~~~~

#### Acts 3: 在 `src/fsm_skating/engine.py` 匹配算法中计算并注入绝对转动方向

我们在 `get_possible_transitions` 和 `verify_sequence` 中自动推导并追加 `rotation_dir` 变量。

~~~~~act
patch_file
src/fsm_skating/engine.py
~~~~~
~~~~~python.old
            for move in self.moves:
                # 校验匹配
                if check_match(current_state, target_state, move):
                    # 难度过滤
                    diff = move.get("difficulty", 0)
                    if diff <= max_difficulty:
                        results.append({
                            "target_state": target_state,
                            "move": move
                        })

        # 排序引擎：根据 (Difficulty, Name) 双键组合进行稳定升序排序
        results.sort(key=lambda x: (x["move"].get("difficulty", 0), x["move"].get("name", "")))
        return results
~~~~~
~~~~~python.new
            for move in self.moves:
                # 校验匹配
                if check_match(current_state, target_state, move):
                    # 难度过滤
                    diff = move.get("difficulty", 0)
                    if diff <= max_difficulty:
                        # 计算绝对转体方向 (CW / CCW)
                        turn_rot = move.get("turn_rotation")
                        abs_rot = None
                        if turn_rot == "natural":
                            from .core import get_natural_curvature
                            abs_rot = get_natural_curvature(current_state)
                        elif turn_rot == "opposite":
                            from .core import get_natural_curvature
                            start_curv = get_natural_curvature(current_state)
                            abs_rot = "CW" if start_curv == "CCW" else "CCW"

                        # 复制一份动作配置，注入计算得到的绝对旋转方向
                        move_with_rot = dict(move)
                        move_with_rot["rotation_dir"] = abs_rot

                        results.append({
                            "target_state": target_state,
                            "move": move_with_rot
                        })

        # 排序引擎：根据 (Difficulty, Name) 双键组合进行稳定升序排序
        results.sort(key=lambda x: (x["move"].get("difficulty", 0), x["move"].get("name", "")))
        return results
~~~~~

~~~~~act
patch_file
src/fsm_skating/engine.py
~~~~~
~~~~~python.old
            # 检索所有匹配当前转移的动作
            matched_moves = []
            for move in self.moves:
                if check_match(s_from, s_to, move):
                    matched_moves.append(move)

            if not matched_moves:
                return {
                    "valid": False,
                    "error": f"无法识别的物理转移: 从状态 {s_from} 无法直接通过任何已知动作转移到 {s_to}。"
                }

            # 升序排序匹配的动作列表
            matched_moves.sort(key=lambda m: (m.get("difficulty", 0), m.get("name", "")))
~~~~~
~~~~~python.new
            # 检索所有匹配当前转移的动作
            matched_moves = []
            for move in self.moves:
                if check_match(s_from, s_to, move):
                    # 计算绝对转体方向 (CW / CCW)
                    turn_rot = move.get("turn_rotation")
                    abs_rot = None
                    if turn_rot == "natural":
                        from .core import get_natural_curvature
                        abs_rot = get_natural_curvature(s_from)
                    elif turn_rot == "opposite":
                        from .core import get_natural_curvature
                        start_curv = get_natural_curvature(s_from)
                        abs_rot = "CW" if start_curv == "CCW" else "CCW"

                    move_with_rot = dict(move)
                    move_with_rot["rotation_dir"] = abs_rot
                    matched_moves.append(move_with_rot)

            if not matched_moves:
                return {
                    "valid": False,
                    "error": f"无法识别的物理转移: 从状态 {s_from} 无法直接通过任何已知动作转移到 {s_to}。"
                }

            # 升序排序匹配的动作列表
            matched_moves.sort(key=lambda m: (m.get("difficulty", 0), m.get("name", "")))
~~~~~

#### Acts 4: 修改 `src/fsm_skating/cli.py` 展示 ISU 旋转双向均衡分析

在导出模块和校验模块中，统计并输出 CW 和 CCW 转动次数及其均衡度分析。

~~~~~act
patch_file
src/fsm_skating/cli.py
~~~~~
~~~~~python.old
def export_path(path: List[Tuple[State, Optional[Dict[str, Any]]]]):
    """
    优雅导出编排结果。
    """
    print("\n" + "=" * 55)
    print("        🎉 花样滑冰智能步法编排导出成功 🎉")
    print("" + "=" * 55)
    
    seq_repr = [str(s) for s, _ in path]
    print(f"👉 状态流向链路: {' -> '.join(seq_repr)}")
    print("-" * 55)
    print("📋 转换动作明细:")
    
    total_difficulty = 0
    for i in range(len(path) - 1):
        s_curr, m_next = path[i]
        s_next = path[i+1][0]
        # m_next 是从 s_curr 到 s_next 的动作
        if m_next:
            print(f"  第 {i+1} 步: {s_curr} ──▶ {s_next} | {m_next['name']} (难度: {m_next['difficulty']})")
            total_difficulty += m_next["difficulty"]
    
    print("-" * 55)
    print(f"⛸️ 总计动作: {len(path) - 1} 步 | 综合设计难度评分: {total_difficulty}")
    print("=" * 55 + "\n")
~~~~~
~~~~~python.new
def export_path(path: List[Tuple[State, Optional[Dict[str, Any]]]]):
    """
    优雅导出编排结果。
    """
    print("\n" + "=" * 55)
    print("        🎉 花样滑冰智能步法编排导出成功 🎉")
    print("" + "=" * 55)
    
    seq_repr = [str(s) for s, _ in path]
    print(f"👉 状态流向链路: {' -> '.join(seq_repr)}")
    print("-" * 55)
    print("📋 转换动作明细:")
    
    total_difficulty = 0
    cw_count = 0
    ccw_count = 0

    for i in range(len(path) - 1):
        s_curr, m_next = path[i]
        s_next = path[i+1][0]
        # m_next 是从 s_curr 到 s_next 的动作
        if m_next:
            rot_str = ""
            rot_dir = m_next.get("rotation_dir")
            if rot_dir == "CW":
                rot_str = " [顺时针 ↻]"
                cw_count += 1
            elif rot_dir == "CCW":
                rot_str = " [逆时针 ↺]"
                ccw_count += 1
                
            print(f"  第 {i+1} 步: {s_curr} ──▶ {s_next} | {m_next['name']}{rot_str} (难度: {m_next['difficulty']})")
            total_difficulty += m_next["difficulty"]
    
    print("-" * 55)
    print("🔄 旋转转体多样性分析 (ISU 步法定级核心参考):")
    print(f"  * 顺时针旋转 (CW) 动作数: {cw_count}")
    print(f"  * 逆时针旋转 (CCW) 动作数: {ccw_count}")
    
    total_rotations = cw_count + ccw_count
    if total_rotations > 0:
        cw_ratio = cw_count / total_rotations
        ccw_ratio = ccw_count / total_rotations
        print(f"  * 比例分布: 顺时针 {cw_ratio:.1%} | 逆时针 {ccw_ratio:.1%}")
        if cw_count > 0 and ccw_count > 0:
            print("  * ⚖️ 均衡度: [已实现双向旋转] 🎉 符合 ISU 步法多样性定级要求 (包含顺、逆双向转体)。")
        else:
            print("  * ⚠️ 均衡度: [仅单向旋转] 编排仅包含单一旋转方向，在 ISU 评级中可能难以获得高难度加分。")
    else:
        print("  * 编排中未包含显著的转体类动作。")

    print("-" * 55)
    print(f"⛸️ 总计动作: {len(path) - 1} 步 | 综合设计难度评分: {total_difficulty}")
    print("=" * 55 + "\n")
~~~~~

~~~~~act
patch_file
src/fsm_skating/cli.py
~~~~~
~~~~~python.old
def run_verifier(engine: ChoreographyEngine):
    """
    2. 序列解析与合法性验证模块
    """
    print("\n❄️  进入 [2. 序列解析与合法性验证模块] ❄️")
    print("本模块支持 8 种基础状态：LFO, LFI, LBO, LBI, RFO, RFI, RBO, RBI")
    print("输入示例: LFO -> LFI -> RFI -> RBO")
    
    seq_str = input("请输入待验证的状态序列: ").strip()
    if not seq_str:
        return

    res = engine.verify_sequence(seq_str)
    if not res["valid"]:
        print(f"\n❌ 验证失败！错误原因: {res['error']}")
    else:
        print("\n" + "✨" * 15)
        print("✅ 验证通过！物理步法序列完全合法！")
        print(f"🔥 总计难度系数: {res['total_difficulty']}")
        print("📋 自动动作链条翻译明细:")
        
        for idx, trans in enumerate(res["transitions"], 1):
            s_from = trans["from_state"]
            s_to = trans["to_state"]
            selected_move = trans["selected_move"]
            candidates = trans["candidate_moves"]
            
            print(f"  [{idx}] {s_from} ({get_state_desc(s_from)})")
            print(f"       └──▶ {s_to} ({get_state_desc(s_to)})")
            print(f"            识别动作为: {selected_move['name']} (难度: {selected_move['difficulty']})")
            
            if len(candidates) > 1:
                other_names = [c["name"] for c in candidates[1:]]
                print(f"            (同属于其它候选物理变换: {', '.join(other_names)})")
        print("✨" * 15 + "\n")
~~~~~
~~~~~python.new
def run_verifier(engine: ChoreographyEngine):
    """
    2. 序列解析与合法性验证模块
    """
    print("\n❄️  进入 [2. 序列解析与合法性验证模块] ❄️")
    print("本模块支持 8 种基础状态：LFO, LFI, LBO, LBI, RFO, RFI, RBO, RBI")
    print("输入示例: LFO -> LFI -> RFI -> RBO")
    
    seq_str = input("请输入待验证的状态序列: ").strip()
    if not seq_str:
        return

    res = engine.verify_sequence(seq_str)
    if not res["valid"]:
        print(f"\n❌ 验证失败！错误原因: {res['error']}")
    else:
        print("\n" + "✨" * 15)
        print("✅ 验证通过！物理步法序列完全合法！")
        print(f"🔥 总计难度系数: {res['total_difficulty']}")
        print("📋 自动动作链条翻译明细:")
        
        cw_count = 0
        ccw_count = 0

        for idx, trans in enumerate(res["transitions"], 1):
            s_from = trans["from_state"]
            s_to = trans["to_state"]
            selected_move = trans["selected_move"]
            candidates = trans["candidate_moves"]
            
            rot_str = ""
            rot_dir = selected_move.get("rotation_dir")
            if rot_dir == "CW":
                rot_str = " [顺时针 ↻]"
                cw_count += 1
            elif rot_dir == "CCW":
                rot_str = " [逆时针 ↺]"
                ccw_count += 1

            print(f"  [{idx}] {s_from} ({get_state_desc(s_from)})")
            print(f"       └──▶ {s_to} ({get_state_desc(s_to)})")
            print(f"            识别动作为: {selected_move['name']}{rot_str} (难度: {selected_move['difficulty']})")
            
            if len(candidates) > 1:
                other_names = [c["name"] for c in candidates[1:]]
                print(f"            (同属于其它候选物理变换: {', '.join(other_names)})")
        
        print("-" * 45)
        print("🔄 旋转体系统计 (ISU 步法定级核心参考):")
        print(f"  * 顺时针旋转 (CW) 次数: {cw_count}")
        print(f"  * 逆时针旋转 (CCW) 次数: {ccw_count}")
        total_rotations = cw_count + ccw_count
        if total_rotations > 0:
            if cw_count > 0 and ccw_count > 0:
                print("  * ⚖️ 均衡度: [已实现双向旋转] 🎉 序列中同时包含顺、逆双向转体动作。")
            else:
                print("  * ⚠️ 均衡度: [仅单向旋转] 序列中没有顺、逆双向旋转的交替，ISU 难度评级可能会受限。")
        else:
            print("  * 序列中无明显转体类动作。")
        print("✨" * 15 + "\n")
~~~~~

#### Acts 5: 更新测试文件 `tests/test_engine.py` 验证旋转方向注入的正确性

添加断言，验证转三步在 LFO 触发时，能正确推导出 `CCW`。

~~~~~act
patch_file
tests/test_engine.py
~~~~~
~~~~~python.old
def test_transitions_filtering(engine):
    # LFO (左前外) 
    # 转移到 LFI (左前内) 应该是 变刃滑行 (Change of Edge), 难度 1
    current = State.from_string("LFO")
    results = engine.get_possible_transitions(current)
    
    # 寻找目标为 LFI 的动作
    lfi_moves = [r for r in results if str(r["target_state"]) == "LFI"]
    assert len(lfi_moves) >= 1
    assert lfi_moves[0]["move"]["id"] == "change_of_edge"
~~~~~
~~~~~python.new
def test_transitions_filtering(engine):
    # LFO (左前外) 
    # 转移到 LFI (左前内) 应该是 变刃滑行 (Change of Edge), 难度 1
    current = State.from_string("LFO")
    results = engine.get_possible_transitions(current)
    
    # 寻找目标为 LFI 的动作
    lfi_moves = [r for r in results if str(r["target_state"]) == "LFI"]
    assert len(lfi_moves) >= 1
    assert lfi_moves[0]["move"]["id"] == "change_of_edge"

def test_rotation_direction_inference(engine):
    # LFO (自然弯曲 CCW) -> LBI 
    # 1. 前外转三 (turn_rotation: natural) 应当推导出 CCW 旋转
    # 2. 括弧步 (turn_rotation: opposite) 应当推导出 CW 旋转
    current = State.from_string("LFO")
    results = engine.get_possible_transitions(current)
    
    lbi_moves = [r for r in results if str(r["target_state"]) == "LBI"]
    assert len(lbi_moves) >= 2
    
    three_turn = [m for m in lbi_moves if "three_turn" in m["move"]["id"]][0]
    bracket = [m for m in lbi_moves if m["move"]["id"] == "bracket"][0]
    
    assert three_turn["move"]["rotation_dir"] == "CCW"
    assert bracket["move"]["rotation_dir"] == "CW"
~~~~~

#### Acts 6: 执行测试以校验模型推导准确性

我们通过 `uv run pytest` 进行测试套件自动化重跑。

~~~~~act
run_command
~~~~~
~~~~~
uv run pytest
~~~~~

### 下一步建议
1. 我们完成了绝对旋转方向（CW/CCW）的底层几何计算、动作区分与评估。
2. 可以执行 `git status` 了解目前代码库的变动。
3. 随后，我们在下一步把这套卓越的新功能（ISU 旋转均衡度检测）打包提交。
