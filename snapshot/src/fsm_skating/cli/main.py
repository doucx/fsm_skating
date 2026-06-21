import sys
import argparse
import os
from typing import List, Tuple, Optional

# 更新引入声明，分别引入领域层模型与服务层引擎
from fsm_skating.domain.models import State, ALL_STATES
from fsm_skating.services.engine import ChoreographyEngine, Move


def get_state_desc(state: State) -> str:
    """
    将状态代码翻译成易读的中文字符串。
    """
    foot = "左脚 (L)" if state.foot == "L" else "右脚 (R)"
    direction = "向前 (F)" if state.direction == "F" else "向后 (B)"
    edge = "外刃 (O)" if state.edge == "O" else "内刃 (I)"
    return f"{foot} {direction} {edge}"


def print_rotation_diversity_report(cw_count: int, ccw_count: int):
    """
    打印旋转转体多样性报告 (ISU 步法定级核心参考)
    """
    print("-" * 55)
    print("🔄 旋转转体多样性分析 (ISU 步法定级核心参考):")
    print(f"  * 顺时针旋转 (CW) 动作数/次数: {cw_count}")
    print(f"  * 逆时针旋转 (CCW) 动作数/次数: {ccw_count}")

    total_rotations = cw_count + ccw_count
    if total_rotations > 0:
        cw_ratio = cw_count / total_rotations
        ccw_ratio = ccw_count / total_rotations
        print(f"  * 比例分布: 顺时针 {cw_ratio:.1%} | 逆时针 {ccw_ratio:.1%}")
        if cw_count > 0 and ccw_count > 0:
            print(
                "  * ⚖️ 均衡度: [已实现双向旋转] 🎉 符合 ISU 步法多样性定级要求 (包含顺、逆双向转体)。"
            )
        else:
            print(
                "  * ⚠️ 均衡度: [仅单向旋转] 编排仅包含单一旋转方向，在 ISU 评级中可能难以获得高难度加分。"
            )
    else:
        print("  * 编排中未包含显著的转体类动作。")


def export_path(path: List[Tuple[State, Optional[Move]]]):
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
        s_next = path[i + 1][0]
        if m_next:
            rot_str = ""
            rot_dir = m_next.rotation_dir
            if rot_dir == "CW":
                rot_str = " [顺时针 ↻]"
                cw_count += 1
            elif rot_dir == "CCW":
                rot_str = " [逆时针 ↺]"
                ccw_count += 1

            print(
                f"  第 {i + 1} 步: {s_curr} ──▶ {s_next} | {m_next.name}{rot_str} (难度: {m_next.difficulty})"
            )
            total_difficulty += m_next.difficulty

    print_rotation_diversity_report(cw_count, ccw_count)

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

    while True:
        start_idx = input("请输入起始状态序号 [1-8]: ").strip()
        try:
            start_state = ALL_STATES[int(start_idx) - 1]
            break
        except (ValueError, IndexError):
            print("[-] 输入有误，请输入 1 到 8 之间的数字。")

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
    path: List[Tuple[State, Optional[Move]]] = [(current_state, None)]

    while True:
        # 指向领域层，计算弯曲性质
        from fsm_skating.domain.models import get_natural_curvature

        curr_curve = get_natural_curvature(current_state)
        curr_curve_str = "顺时针 ↻" if curr_curve == "CW" else "逆时针 ↺"

        print("\n" + "=" * 45)
        print(f"📍 当前滑行状态: {current_state} ({get_state_desc(current_state)})")
        print(f"🌀 当前滑行弧线: {curr_curve_str}")

        seq_str = " -> ".join([str(s) for s, _ in path])
        print(f"🐾 已完成链路: {seq_str}")

        options = engine.get_possible_transitions(current_state, max_difficulty)

        if not options:
            print("[-] ⚠️ 警告：当前状态在难度限制下，没有可行转移路径！")
        else:
            print("⬇️ 可选的下一个动作转移 (已通过排序引擎进行稳定排序):")
            for idx, opt in enumerate(options, 1):
                nxt = opt.target_state
                nxt_curve = get_natural_curvature(nxt)
                nxt_curve_str = "↻" if nxt_curve == "CW" else "↺"

                move = opt.move
                rot_dir = move.rotation_dir

                rot_info = ""
                if rot_dir:
                    rot_sym = "↻" if rot_dir == "CW" else "↺"
                    rot_info = f" [转体: {rot_sym} -> 下一步弧线: {nxt_curve_str}]"
                else:
                    rot_info = f" [下一步弧线: {nxt_curve_str}]"

                print(
                    f"  [{idx}] ──▶ {nxt} | {move.name}{rot_info} (难度: {move.difficulty})"
                )

        print("-" * 45)
        print(
            "💡 [操作指南]: \n  * 输入候选数字序号，增加下一步动作;\n  * 输入 'u' 撤销上一步动作;\n  * 输入 'e' 结束编排并完美导出。"
        )
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

                prev_state, _ = path[-1]
                path[-1] = (prev_state, selected.move)

                current_state = selected.target_state
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
    if not res.valid:
        print(f"\n❌ 验证失败！错误原因: {res.error}")
    else:
        print("\n" + "✨" * 15)
        print("✅ 验证通过！物理步法序列完全合法！")
        print(f"🔥 总计难度系数: {res.total_difficulty}")
        print("📋 自动动作链条翻译明细:")

        cw_count = 0
        ccw_count = 0

        for idx, trans in enumerate(res.transitions, 1):
            s_from = trans.from_state
            s_to = trans.to_state
            selected_move = trans.selected_move
            candidates = trans.candidate_moves

            rot_str = ""
            rot_dir = selected_move.rotation_dir
            if rot_dir == "CW":
                rot_str = " [顺时针 ↻]"
                cw_count += 1
            elif rot_dir == "CCW":
                rot_str = " [逆时针 ↺]"
                ccw_count += 1

            print(f"  [{idx}] {s_from} ({get_state_desc(s_from)})")
            print(f"       └──▶ {s_to} ({get_state_desc(s_to)})")
            print(
                f"            识别动作为: {selected_move.name}{rot_str} (难度: {selected_move.difficulty})"
            )

            if len(candidates) > 1:
                other_names = [c.name for c in candidates[1:]]
                print(f"            (同属于其它候选物理变换: {', '.join(other_names)})")

        print_rotation_diversity_report(cw_count, ccw_count)
        print("✨" * 15 + "\n")


def run_generator(engine: ChoreographyEngine):
    """
    3. 智能随机生成模块
    """
    print("\n❄️  进入 [3. 智能随机生成模块] ❄️")

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

    print("\n⚡ 正在调配 FSM 编排状态机，规划冰面最优惯性路径...")
    path = engine.generate_sequence(steps, max_diff, start_state)

    if path is None:
        print(
            "[-] ❌ 路径规划失败：在设定的动作最大难度限制下，无法规划出不进入死胡同的滑行链路。"
        )
        print("💡 建议：请调高动作难度上限阈值。")
    else:
        export_path(path)


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

        print(f"\n📁 类别: {name} (ID: {cat_id})")
        print(f"  * 覆盖率: {percentage:.0f}% (已明确实现 {total}/4 个物理滑行变体)")

        if impl:
            print(f"  * ✅ 已实现方向: {', '.join(impl)}")
        if miss:
            print(f"  * ❌ 缺失的方向: {', '.join(miss)}")
        if generic > 0:
            print(f"  * ⚠️ 包含 {generic} 个通用备用动作 (未设定起滑方向约束)")

        if percentage == 100:
            print(
                "  * 🌟 诊断: 优秀！该类步法具有100%全向覆盖，支持进行高精度的编排和细密难度微调。"
            )
        elif percentage > 0:
            print(
                "  * ⚠️ 诊断: 覆盖度不全。缺失的滑动方向将由通用动作托管，建议补齐具体方向以使难度评级更精准。"
            )
        else:
            if generic > 0:
                print(
                    "  * ℹ️ 诊断: 缺少方向细分。目前全部依靠通用动作，建议根据滑行轨迹细分为 FO/FI/BO/BI 变体。"
                )
            else:
                print("  * 🔴 诊断: 极度匮乏！库中暂无此类别下的任何有效动作。")

    print("\n" + "📊" * 15 + "\n")


def run_path_search(engine: ChoreographyEngine):
    """
    5. 物理路径搜索模块
    """
    print("\n❄️  进入 [5. 物理路径搜索模块] ❄️")
    print("本模块用于检索两指定滑行状态之间、符合特定间隔状态数的可行滑跑路径方案。")

    for idx, state in enumerate(ALL_STATES, 1):
        print(f"  [{idx}] {state} - {get_state_desc(state)}")

    while True:
        start_idx = input("请选择起始状态序号 [1-8]: ").strip()
        try:
            start_state = ALL_STATES[int(start_idx) - 1]
            break
        except (ValueError, IndexError):
            print("[-] 输入有误，请输入 1 到 8 之间的数字。")

    while True:
        end_idx = input("请选择结束状态序号 [1-8]: ").strip()
        try:
            end_state = ALL_STATES[int(end_idx) - 1]
            break
        except (ValueError, IndexError):
            print("[-] 输入有误，请输入 1 到 8 之间的数字。")

    while True:
        inter_str = input("请输入中间间隔的刃状态数 (>=0, 例如 2): ").strip()
        try:
            intermediate_count = int(inter_str)
            if intermediate_count < 0:
                print("[-] 间隔数量不能为负数。")
                continue
            break
        except ValueError:
            print("[-] 请输入有效的正整数或 0。")

    while True:
        diff_str = input("请输入此套搜索的最大允许动作难度限制 [1-5, 默认 5]: ").strip()
        if not diff_str:
            max_difficulty = 5
            break
        try:
            max_difficulty = int(diff_str)
            break
        except ValueError:
            print("[-] 请输入有效的整数难度。")

    while True:
        results_str = input("请输入最大输出路径数量 [默认 10]: ").strip()
        if not results_str:
            max_results = 10
            break
        try:
            max_results = int(results_str)
            break
        except ValueError:
            print("[-] 请输入有效的整数。")

    print(
        f"\n⚡ 正在检索从 {start_state} 到 {end_state} (中间间隔 {intermediate_count} 个状态) 的合规滑行路径..."
    )
    paths = engine.search_paths(
        start_state, end_state, intermediate_count, max_difficulty, max_results
    )

    if not paths:
        print(
            "[-] ❌ 未检索到任何符合条件的滑行路线。建议尝试调整间隔状态数或提升允许难度限制。"
        )
    else:
        print(f"[+] 🎉 成功检索到 {len(paths)} 条合规路径：\n")
        for p_idx, path in enumerate(paths, 1):
            seq_repr = [str(s) for s, _ in path]
            print(f"  【路径 #{p_idx}】 {' -> '.join(seq_repr)}")
            total_difficulty = sum(step[1].difficulty for step in path if step[1])
            print(f"    * 难度总和: {total_difficulty}")
            for i in range(len(path) - 1):
                s_curr, m_next = path[i]
                s_next = path[i + 1][0]
                if m_next:
                    print(
                        f"      - {s_curr} ──▶ {s_next} | {m_next.name} (难度: {m_next.difficulty})"
                    )
            print()

        while True:
            export_choice = input(
                f"请输入需要导出详细报告的路径序号 [1-{len(paths)}，直接回车返回]: "
            ).strip()
            if not export_choice:
                break
            try:
                selected_idx = int(export_choice) - 1
                if 0 <= selected_idx < len(paths):
                    export_path(paths[selected_idx])
                    break
                else:
                    print("[-] 序号超出范围，请重新输入。")
            except ValueError:
                print("[-] 请输入有效的序号数字。")


def main():
    parser = argparse.ArgumentParser(description="花样滑冰步法智能编排状态机系统 CLI")
    parser.add_argument(
        "--config",
        default="config/moves_config.yaml",
        help="配置文件 (config/moves_config.yaml) 路径，默认使用当前目录文件",
    )
    args = parser.parse_args()

    try:
        engine = ChoreographyEngine(args.config)
    except FileNotFoundError:
        parent_config = os.path.join(
            os.path.dirname(__file__), "../../../config/moves_config.yaml"
        )
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
        print("  4. 动作库完整性诊断 (Action Library Linter)")
        print("  5. 物理路径搜索 (Path Search)")
        print("  6. 退出系统 (Exit)")
        print("=" * 50)
        choice = input("请选择功能序号 [1-6]: ").strip()

        if choice == "1":
            run_interactive(engine)
        elif choice == "2":
            run_verifier(engine)
        elif choice == "3":
            run_generator(engine)
        elif choice == "4":
            run_linter(engine)
        elif choice == "5":
            run_path_search(engine)
        elif choice == "6":
            print("\n感谢使用！滑冰愉快！❄️")
            break
        else:
            print("[-] 无效序号，请在 [1-6] 之间进行选择。")


if __name__ == "__main__":
    main()
