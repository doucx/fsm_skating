import sys
import argparse
from typing import List, Tuple, Dict, Any, Optional
from .engine import ChoreographyEngine
from .core import State, ALL_STATES

def get_state_desc(state: State) -> str:
    """
    将状态代码翻译成易读的中文字符串。
    """
    foot = "左脚 (L)" if state.foot == "L" else "右脚 (R)"
    direction = "向前 (F)" if state.direction == "F" else "向后 (B)"
    edge = "外刃 (O)" if state.edge == "O" else "内刃 (I)"
    return f"{foot} {direction} {edge}"


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


def run_interactive(engine: ChoreographyEngine):
    """
    1. 交互式手动编排模块
    """
    print("\n❄️  进入 [1. 交互式手动编排模块] ❄️")
    print("请选择编排的起始滑行状态:")
    for idx, state in enumerate(ALL_STATES, 1):
        print(f"  [{idx}] {state} - {get_state_desc(state)}")
    
    # 确定起始状态
    while True:
        start_idx = input("请输入起始状态序号 [1-8]: ").strip()
        try:
            start_state = ALL_STATES[int(start_idx) - 1]
            break
        except (ValueError, IndexError):
            print("[-] 输入有误，请输入 1 到 8 之间的数字。")

    # 确定难度限制
    while True:
        diff_str = input("请输入此套编排的最大允许动作难度限制 [1-5, 默认 5]: ").strip()
        if not diff_str:
            max_difficulty = 5
            break
        try:
            max_difficulty = int(diff_str)
            break
        except ValueError:
            print("[-] 请输入有效的整数难度。")

    current_state = start_state
    # path 中的元素为 (当前状态, 转移到下一个状态所需的动作)
    # 最后一个状态对应的 move 为 None
    path: List[Tuple[State, Optional[Dict[str, Any]]]] = [(current_state, None)]

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

        print("-" * 45)
        print("💡 [操作指南]: \n  * 输入候选数字序号，增加下一步动作;\n  * 输入 'u' 撤销上一步动作;\n  * 输入 'e' 结束编排并完美导出。")
        action = input("请输入指令或序号: ").strip().lower()

        if action == "e":
            if len(path) < 2:
                print("[-] 编排动作过短，未做任何转移，已放弃导出。")
                break
            export_path(path)
            break
        elif action == "u":
            if len(path) <= 1:
                print("[-] ⚠️ 已经是起始位置，无法再进行撤销！")
            else:
                removed_state, _ = path.pop()
                # 重新修正前一个状态的下一个转移 move 为 None
                prev_state, _ = path[-1]
                path[-1] = (prev_state, None)
                current_state = prev_state
                print(f"[+] 已撤销。回滚至状态: {current_state}")
        else:
            try:
                opt_idx = int(action) - 1
                if opt_idx < 0 or opt_idx >= len(options):
                    print("[-] 输入序号超出候选范围，请重新输入。")
                    continue
                selected = options[opt_idx]
                
                # 完善前一个状态的指向 move
                prev_state, _ = path[-1]
                path[-1] = (prev_state, selected["move"])
                
                # 迈入新状态
                current_state = selected["target_state"]
                path.append((current_state, None))
            except ValueError:
                print("[-] 无效输入。请输入数字序号、'u' 或 'e'。")


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


def run_generator(engine: ChoreographyEngine):
    """
    3. 智能随机生成模块
    """
    print("\n❄️  进入 [3. 智能随机生成模块] ❄️")
    
    # 捕获步数
    while True:
        steps_str = input("请输入想要编排的动作步数 (例如 6): ").strip()
        try:
            steps = int(steps_str)
            if steps <= 0:
                print("[-] 步数必须为正整数。")
                continue
            break
        except ValueError:
            print("[-] 请输入合法的数字。")

    # 捕获难度上限
    while True:
        diff_str = input("请输入动作难度的上限阈值 (例如 3): ").strip()
        try:
            max_diff = int(diff_str)
            if max_diff < 1:
                print("[-] 难度上限不能小于 1。")
                continue
            break
        except ValueError:
            print("[-] 请输入合法的数字。")

    # 起始状态
    print("请选择起始状态选项:")
    print("  [0] 随机确定")
    for idx, state in enumerate(ALL_STATES, 1):
        print(f"  [{idx}] {state} - {get_state_desc(state)}")
    
    start_state = None
    while True:
        start_idx = input("请输入序号选择起始状态 [0-8, 默认 0]: ").strip()
        if not start_idx or start_idx == "0":
            break
        try:
            start_state = ALL_STATES[int(start_idx) - 1]
            break
        except (ValueError, IndexError):
            print("[-] 无效选择，请输入 0 至 8 之间的数字。")

    print("\n⚡ 正在调配 FSM 编排状态机，并应用 DFS 算法规划冰面最优惯性路径...")
    path = engine.generate_sequence(steps, max_diff, start_state)
    
    if path is None:
        print("[-] ❌ 路径规划失败：在设定的动作最大难度限制下，无法规划出不进入死胡同的滑行链路。")
        print("💡 建议：请调高动作难度上限阈值。")
    else:
        # 将结构转化为 export 形式需要的 List[(State, Optional[Dict])]
        export_path(path)


def main():
    parser = argparse.ArgumentParser(description="花样滑冰步法智能编排状态机系统 CLI")
    parser.add_argument(
        "--config", 
        default="moves_config.yaml", 
        help="配置文件 (moves_config.yaml) 路径，默认使用当前目录文件"
    )
    args = parser.parse_args()

    # 初始化配置
    try:
        engine = ChoreographyEngine(args.config)
    except FileNotFoundError:
        # 兜底寻找
        parent_config = os.path.join(os.path.dirname(__file__), "../../moves_config.yaml")
        if os.path.exists(parent_config):
            engine = ChoreographyEngine(parent_config)
        else:
            print(f"❌ 运行失败：未找到外部动作配置文件 '{args.config}'。")
            sys.exit(1)
    except Exception as e:
        print(f"❌ 初始化引擎失败：{e}")
        sys.exit(1)

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


if __name__ == "__main__":
    main()