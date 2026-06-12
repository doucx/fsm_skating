这是一个非常实用的交互增强建议。在花滑编排中，看清“当前进入弧线的方向”以及“动作产生的转体方向”对于判断动作流向的连贯性至关重要。

通过调用我们之前实现的 `get_natural_curvature` 函数，我们可以在 CLI 界面中实时展示：
1. **当前状态的滑行弧线方向**（进入方向）。
2. **每个候选动作自身的转体方向**（CW/CCW）。
3. **完成动作后进入新状态的滑行弧线方向**（退出方向）。

下面是增强 CLI 交互体验的实施计划。

## [WIP] style: 增强 CLI 交互界面，实时显示滑行与动作旋转方向

### 用户需求
在交互式编排的菜单中，实时显示当前状态的滑行弧线方向，并在每个候选动作中明确标识转体方向及其导致的下一步弧线方向。

### 评论
这种“可视化”的文本引导能够极大地降低滑冰者在脑中模拟冰面轨迹的认知负担，使得编排过程更像是在玩一个逻辑严密的拼图游戏，同时也更直观地体现了 ISU 规则中“弧线方向切换”的物理本质。

### 目标
1. 修改 `src/fsm_skating/cli.py` 的 `run_interactive` 函数，显示当前弧线方向。
2. 在候选列表中显示动作的转体方向和目标状态的弧线方向。

### 基本原理
- 当前弧线方向 = `get_natural_curvature(current_state)`。
- 动作转体方向 = `move.get("rotation_dir")`（由引擎计算注入）。
- 下一步弧线方向 = `get_natural_curvature(target_state)`。

### 标签
#intent/tune #flow/ready #priority/medium 
#comp/cli #concept/ui #scope/ux 
#ai/delegate
#task/domain/ui #task/object/command-palette #task/action/refactor #task/state/continue #task/status/active

---

### Script

#### Acts 1: 增强 `src/fsm_skating/cli.py` 交互界面

我们将更新 `run_interactive` 中的界面输出逻辑，引入旋转符号标识。

~~~~~act
patch_file
src/fsm_skating/cli.py
~~~~~
~~~~~python.old
    while True:
        print("\n" + "=" * 45)
        print(f"📍 当前滑行状态: {current_state} ({get_state_desc(current_state)})")
        
        # 实时打印已编排路径
        seq_str = " -> ".join([str(s) for s, _ in path])
        print(f"🐾 已完成链路: {seq_str}")
        
        # 获取当下合规的转移候选
        options = engine.get_possible_transitions(current_state, max_difficulty)
        
        if not options:
            print("[-] ⚠️ 警告：当前状态在难度限制下，没有可行转移路径！")
        else:
            print("⬇️ 可选的下一个动作转移 (已通过排序引擎进行稳定排序):")
            for idx, opt in enumerate(options, 1):
                nxt = opt["target_state"]
                move = opt["move"]
                print(f"  [{idx}] ──▶ {nxt} | {move['name']} (难度: {move['difficulty']})")
~~~~~
~~~~~python.new
    while True:
        from .core import get_natural_curvature
        curr_curve = get_natural_curvature(current_state)
        curr_curve_str = "顺时针 ↻" if curr_curve == "CW" else "逆时针 ↺"

        print("\n" + "=" * 45)
        print(f"📍 当前滑行状态: {current_state} ({get_state_desc(current_state)})")
        print(f"🌀 当前滑行弧线: {curr_curve_str}")
        
        # 实时打印已编排路径
        seq_str = " -> ".join([str(s) for s, _ in path])
        print(f"🐾 已完成链路: {seq_str}")
        
        # 获取当下合规的转移候选
        options = engine.get_possible_transitions(current_state, max_difficulty)
        
        if not options:
            print("[-] ⚠️ 警告：当前状态在难度限制下，没有可行转移路径！")
        else:
            print("⬇️ 可选的下一个动作转移 (已通过排序引擎进行稳定排序):")
            for idx, opt in enumerate(options, 1):
                nxt = opt["target_state"]
                nxt_curve = get_natural_curvature(nxt)
                nxt_curve_str = "↻" if nxt_curve == "CW" else "↺"
                
                move = opt["move"]
                rot_dir = move.get("rotation_dir")
                
                rot_info = ""
                if rot_dir:
                    rot_sym = "↻" if rot_dir == "CW" else "↺"
                    rot_info = f" [转体: {rot_sym} -> 下一步弧线: {nxt_curve_str}]"
                else:
                    rot_info = f" [下一步弧线: {nxt_curve_str}]"

                print(f"  [{idx}] ──▶ {nxt} | {move['name']}{rot_info} (难度: {move['difficulty']})")
~~~~~

### 下一步建议
- **运行验证**: 现在你可以运行 `uv run fsm-skating` 进入第一项功能。你会看到 LBI 状态下，系统会清晰地提示 `🌀 当前滑行弧线: 逆时针 ↺`，并且在选择 `LFO (括弧步)` 时，会明确显示 `[转体: 顺时针 ↻ -> 下一步弧线: 顺时针 ↻]`。
- **色彩增强**: 如果你的终端支持颜色，未来可以考虑使用 `colorama` 或 `rich` 库为 CW (红色) 和 CCW (蓝色) 着色。
- **提交变更**: 如果对显示效果满意，我们可以将此 UI 优化进行提交。
