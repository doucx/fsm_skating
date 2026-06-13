我已经完成了代码审核并定位了系统中的重复代码模式。接下来我将生成一个完整的重构计划来解决这些 DRY 问题。

## [WIP] refactor: 重构以解决后端、前端和 CLI 中的 DRY 重复问题

### 用户需求
消除花样滑冰智能编排系统中的重复逻辑，包括后端的动作对象构建、前端的坐标转换计算以及 CLI 终端的旋转统计展示。

### 评论
该重构能够将分散在各处的局部计算归集到其对应的业务类（如 `ChoreographyEngine` 和 `CanvasRenderer`）中，不仅提高了系统的维护效率，也能确保动力学公式和视口变换在未来扩展时保持高度一致。

### 目标
1. **后端引擎**: 提取通用的 `_build_move` 私有工厂方法，统一旋转绝对朝向（`CW`/`CCW`）的推导及 `Move` 对象的组装。
2. **CLI 终端**: 提取统一的 `print_rotation_diversity_report` 方法，规范手动编排和序列验证时的转体统计展示。
3. **前端渲染**: 在 `CanvasRenderer` 中提取 `getTransform(nodes)` 视口坐标变换生成器，简化 `draw` 与 `drawTracker` 方法，消除 `app.js` 中的重复 bounds 极值运算。

### 基本原理
通过对象职责自治（Autonomy of Responsibility）原则，将特定领域的装配和变换动作从控制器、执行层沉降到各自的主体对象中。消除因多处硬编码同一套数学公式而导致的后期维护隐患。

### 标签
#intent/refine #flow/ready #priority/medium #comp/engine #comp/cli #comp/runtime #concept/ui #scope/dx #ai/instruct

---

### Script

#### Acts 1: 重构后端服务引擎 (`engine.py`) 的 Move 构建逻辑

我们提取通用的 `_build_move` 工厂方法，以消除 `get_possible_transitions`、`verify_sequence` 和 `verify_move_sequence` 中的冗余。

~~~~~act
patch_file
src/fsm_skating/services/engine.py
~~~~~
~~~~~python.old
    def _load_config(self) -> List[Dict[str, Any]]:
        if not os.path.exists(self.config_path):
            raise FileNotFoundError(
                f"Configuration file not found at: {self.config_path}"
            )
        with open(self.config_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return data.get("moves", [])

    def get_possible_transitions(
~~~~~
~~~~~python.new
    def _load_config(self) -> List[Dict[str, Any]]:
        if not os.path.exists(self.config_path):
            raise FileNotFoundError(
                f"Configuration file not found at: {self.config_path}"
            )
        with open(self.config_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return data.get("moves", [])

    def _build_move(self, move_data: Dict[str, Any], current_state: State) -> Move:
        from fsm_skating.domain.models import get_natural_curvature

        turn_rot = move_data.get("turn_rotation")
        abs_rot = None
        if turn_rot == "natural":
            abs_rot = get_natural_curvature(current_state)
        elif turn_rot == "opposite":
            start_curv = get_natural_curvature(current_state)
            abs_rot = "CW" if start_curv == "CCW" else "CCW"

        return Move(
            id=move_data["id"],
            name=move_data["name"],
            category=move_data["category"],
            difficulty=move_data["difficulty"],
            turn_rotation=move_data.get("turn_rotation"),
            conditions=move_data["conditions"],
            start_constraints=move_data.get("start_constraints"),
            rotation_dir=abs_rot,
            geometry_config=move_data.get("geometry_config"),
        )

    def get_possible_transitions(
~~~~~

~~~~~act
patch_file
src/fsm_skating/services/engine.py
~~~~~
~~~~~python.old
            for move_data in self.moves:
                if check_match(current_state, target_state, move_data):
                    diff = move_data.get("difficulty", 0)
                    if diff <= max_difficulty:
                        turn_rot = move_data.get("turn_rotation")
                        abs_rot = None
                        if turn_rot == "natural":
                            from fsm_skating.domain.models import get_natural_curvature

                            abs_rot = get_natural_curvature(current_state)
                        elif turn_rot == "opposite":
                            from fsm_skating.domain.models import get_natural_curvature

                            start_curv = get_natural_curvature(current_state)
                            abs_rot = "CW" if start_curv == "CCW" else "CCW"

                        move_obj = Move(
                            id=move_data["id"],
                            name=move_data["name"],
                            category=move_data["category"],
                            difficulty=move_data["difficulty"],
                            turn_rotation=move_data.get("turn_rotation"),
                            conditions=move_data["conditions"],
                            start_constraints=move_data.get("start_constraints"),
                            rotation_dir=abs_rot,
                            geometry_config=move_data.get(
                                "geometry_config"
                            ),  # 动态装配
                        )

                        results.append(
                            MoveOption(target_state=target_state, move=move_obj)
                        )
~~~~~
~~~~~python.new
            for move_data in self.moves:
                if check_match(current_state, target_state, move_data):
                    diff = move_data.get("difficulty", 0)
                    if diff <= max_difficulty:
                        move_obj = self._build_move(move_data, current_state)

                        results.append(
                            MoveOption(target_state=target_state, move=move_obj)
                        )
~~~~~

~~~~~act
patch_file
src/fsm_skating/services/engine.py
~~~~~
~~~~~python.old
            matched_moves: List[Move] = []
            for move_data in self.moves:
                if check_match(s_from, s_to, move_data):
                    turn_rot = move_data.get("turn_rotation")
                    abs_rot = None
                    if turn_rot == "natural":
                        from fsm_skating.domain.models import get_natural_curvature

                        abs_rot = get_natural_curvature(s_from)
                    elif turn_rot == "opposite":
                        from fsm_skating.domain.models import get_natural_curvature

                        start_curv = get_natural_curvature(s_from)
                        abs_rot = "CW" if start_curv == "CCW" else "CCW"

                    move_obj = Move(
                        id=move_data["id"],
                        name=move_data["name"],
                        category=move_data["category"],
                        difficulty=move_data["difficulty"],
                        turn_rotation=move_data.get("turn_rotation"),
                        conditions=move_data["conditions"],
                        start_constraints=move_data.get("start_constraints"),
                        rotation_dir=abs_rot,
                        geometry_config=move_data.get("geometry_config"),  # 动态装配
                    )
                    matched_moves.append(move_obj)
~~~~~
~~~~~python.new
            matched_moves: List[Move] = []
            for move_data in self.moves:
                if check_match(s_from, s_to, move_data):
                    move_obj = self._build_move(move_data, s_from)
                    matched_moves.append(move_obj)
~~~~~

~~~~~act
patch_file
src/fsm_skating/services/engine.py
~~~~~
~~~~~python.old
            # 3. 推导旋转体的角速度绝对朝向 (CW/CCW)
            turn_rot = move_data.get("turn_rotation")
            abs_rot = None
            if turn_rot == "natural":
                abs_rot = get_natural_curvature(current_state)
            elif turn_rot == "opposite":
                start_curv = get_natural_curvature(current_state)
                abs_rot = "CW" if start_curv == "CCW" else "CCW"

            move_obj = Move(
                id=move_data["id"],
                name=move_data["name"],
                category=move_data["category"],
                difficulty=move_data["difficulty"],
                turn_rotation=move_data.get("turn_rotation"),
                conditions=move_data["conditions"],
                start_constraints=move_data.get("start_constraints"),
                rotation_dir=abs_rot,
                geometry_config=move_data.get("geometry_config"),  # 动态装配
            )

            trace_details.append(
                MoveVerificationDetail(
                    from_state=current_state,
                    move=move_obj,
                    to_state=next_state,
                )
            )
~~~~~
~~~~~python.new
            # 3. 统一推导旋转体并构建 Move 对象
            move_obj = self._build_move(move_data, current_state)

            trace_details.append(
                MoveVerificationDetail(
                    from_state=current_state,
                    move=move_obj,
                    to_state=next_state,
                )
            )
~~~~~

#### Acts 2: 提取 CLI 主入口 (`main.py`) 的旋转多样性格式化报告

我们在控制台提取并共享 `print_rotation_diversity_report`。

~~~~~act
patch_file
src/fsm_skating/cli/main.py
~~~~~
~~~~~python.old
def get_state_desc(state: State) -> str:
    """
    将状态代码翻译成易读的中文字符串。
    """
    foot = "左脚 (L)" if state.foot == "L" else "右脚 (R)"
    direction = "向前 (F)" if state.direction == "F" else "向后 (B)"
    edge = "外刃 (O)" if state.edge == "O" else "内刃 (I)"
    return f"{foot} {direction} {edge}"


def export_path(path: List[Tuple[State, Optional[Move]]]):
~~~~~
~~~~~python.new
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
~~~~~

~~~~~act
patch_file
src/fsm_skating/cli/main.py
~~~~~
~~~~~python.old
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
            print(
                "  * ⚖️ 均衡度: [已实现双向旋转] 🎉 符合 ISU 步法多样性定级要求 (包含顺、逆双向转体)。"
            )
        else:
            print(
                "  * ⚠️ 均衡度: [仅单向旋转] 编排仅包含单一旋转方向，在 ISU 评级中可能难以获得高难度加分。"
            )
    else:
        print("  * 编排中未包含显著的转体类动作。")

    print("-" * 55)
    print(f"⛸️ 总计动作: {len(path) - 1} 步 | 综合设计难度评分: {total_difficulty}")
~~~~~
~~~~~python.new
    print_rotation_diversity_report(cw_count, ccw_count)

    print("-" * 55)
    print(f"⛸️ 总计动作: {len(path) - 1} 步 | 综合设计难度评分: {total_difficulty}")
~~~~~

~~~~~act
patch_file
src/fsm_skating/cli/main.py
~~~~~
~~~~~python.old
        print("-" * 45)
        print("🔄 旋转体系统计 (ISU 步法定级核心参考):")
        print(f"  * 顺时针旋转 (CW) 次数: {cw_count}")
        print(f"  * 逆时针旋转 (CCW) 次数: {ccw_count}")
        total_rotations = cw_count + ccw_count
        if total_rotations > 0:
            if cw_count > 0 and ccw_count > 0:
                print(
                    "  * ⚖️ 均衡度: [已实现双向旋转] 🎉 序列中同时包含顺、逆双向转体动作。"
                )
            else:
                print(
                    "  * ⚠️ 均衡度: [仅单向旋转] 序列中没有顺、逆双向旋转的交替，ISU 难度评级可能会受限。"
                )
        else:
            print("  * 序列中无明显转体类动作。")
        print("✨" * 15 + "\n")
~~~~~
~~~~~python.new
        print_rotation_diversity_report(cw_count, ccw_count)
        print("✨" * 15 + "\n")
~~~~~

#### Acts 3: 提取前端 `CanvasRenderer` 视口坐标变换生成器并简化 `drawTracker`

在渲染器内部封装 `getTransform` 算法，避免 `draw` 与动画跟踪器的数据变换计算冗余。

~~~~~act
patch_file
web/js/canvasRenderer.js
~~~~~
~~~~~javascript.old
export class CanvasRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");
        this.zoomFactor = 1.0;
        this.panX = 0;
        this.panY = 0;
    }

    resetViewport() {
        this.zoomFactor = 1.0;
        this.panX = 0;
        this.panY = 0;
    }
~~~~~
~~~~~javascript.new
export class CanvasRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");
        this.zoomFactor = 1.0;
        this.panX = 0;
        this.panY = 0;
    }

    getTransform(nodes) {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        nodes.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        });

        const pad = 35;
        const w = maxX - minX || 1;
        const h = maxY - minY || 1;
        const scale = Math.min((this.canvas.width - 2 * pad) / w, (this.canvas.height - 2 * pad) / h, 1.5);

        const offsetX = (this.canvas.width - w * scale) / 2 - minX * scale;
        const offsetY = (this.canvas.height - h * scale) / 2 - minY * scale;

        return (px, py) => {
            const ax = px * scale + offsetX;
            const ay = py * scale + offsetY;
            
            if (!document.fullscreenElement) {
                return { x: ax, y: ay };
            }
            
            const cx = this.canvas.width / 2;
            const cy = this.canvas.height / 2;
            return {
                x: (ax - cx) * this.zoomFactor + cx + this.panX,
                y: (ay - cy) * this.zoomFactor + cy + this.panY
            };
        };
    }

    resetViewport() {
        this.zoomFactor = 1.0;
        this.panX = 0;
        this.panY = 0;
    }
~~~~~

~~~~~act
patch_file
web/js/canvasRenderer.js
~~~~~
~~~~~javascript.old
    draw(geometry) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const { nodes, arcs } = geometry;
        if (nodes.length === 0) return;

        // 自适应计算包围盒
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        nodes.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        });

        const pad = 35;
        const w = maxX - minX || 1;
        const h = maxY - minY || 1;
        const scale = Math.min((this.canvas.width - 2 * pad) / w, (this.canvas.height - 2 * pad) / h, 1.5);

        const offsetX = (this.canvas.width - w * scale) / 2 - minX * scale;
        const offsetY = (this.canvas.height - h * scale) / 2 - minY * scale;

        const transform = (px, py) => {
            const ax = px * scale + offsetX;
            const ay = py * scale + offsetY;
            
            if (!document.fullscreenElement) {
                return { x: ax, y: ay };
            }
            
            const cx = this.canvas.width / 2;
            const cy = this.canvas.height / 2;
            return {
                x: (ax - cx) * this.zoomFactor + cx + this.panX,
                y: (ay - cy) * this.zoomFactor + cy + this.panY
            };
        };

        // 绘制微光网格冰面质感
~~~~~
~~~~~javascript.new
    draw(geometry) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const { nodes, arcs } = geometry;
        if (nodes.length === 0) return;

        const transform = this.getTransform(nodes);

        // 自适应计算 scale 用于线宽自适应
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        nodes.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        });
        const pad = 35;
        const w = maxX - minX || 1;
        const h = maxY - minY || 1;
        const scale = Math.min((this.canvas.width - 2 * pad) / w, (this.canvas.height - 2 * pad) / h, 1.5);

        // 绘制微光网格冰面质感
~~~~~

~~~~~act
patch_file
web/js/canvasRenderer.js
~~~~~
~~~~~javascript.old
    drawTracker(geometry, progress, transform, fFactor) {
        const { arcs } = geometry;
        if (!arcs || arcs.length === 0) return null;

        // 1. 根据总弧长计算当前 progress 落在哪个 arc 上
        const totalLength = arcs.reduce((acc, arc) => acc + (arc.R * Math.abs(arc.endAngle - arc.startAngle)), 0);
        let targetLen = totalLength * progress;
        let currentLen = 0;
        let targetArc = arcs[arcs.length - 1];
        let localProgress = 1.0;

        let targetIdx = arcs.length - 1;
        for (let i = 0; i < arcs.length; i++) {
            const arc = arcs[i];
            const arcLen = arc.R * Math.abs(arc.endAngle - arc.startAngle);
            if (currentLen + arcLen >= targetLen) {
                targetArc = arc;
                targetIdx = i;
                localProgress = (targetLen - currentLen) / arcLen;
                break;
            }
            currentLen += arcLen;
        }

        // 2. 计算插值坐标
        const currentAngle = targetArc.startAngle + (targetArc.endAngle - targetArc.startAngle) * localProgress;
        const worldX = targetArc.cx + targetArc.R * Math.cos(currentAngle);
        const worldY = targetArc.cy + targetArc.R * Math.sin(currentAngle);
        const pos = transform(worldX, worldY);
~~~~~
~~~~~javascript.new
    drawTracker(geometry, progress, fFactor) {
        const { arcs, nodes } = geometry;
        if (!arcs || arcs.length === 0) return null;

        const transform = this.getTransform(nodes);

        // 1. 根据总弧长计算当前 progress 落在哪个 arc 上
        const totalLength = arcs.reduce((acc, arc) => acc + (arc.R * Math.abs(arc.endAngle - arc.startAngle)), 0);
        let targetLen = totalLength * progress;
        let currentLen = 0;
        let targetArc = arcs[arcs.length - 1];
        let localProgress = 1.0;

        let targetIdx = arcs.length - 1;
        for (let i = 0; i < arcs.length; i++) {
            const arc = arcs[i];
            const arcLen = arc.R * Math.abs(arc.endAngle - arc.startAngle);
            if (currentLen + arcLen >= targetLen) {
                targetArc = arc;
                targetIdx = i;
                localProgress = (targetLen - currentLen) / arcLen;
                break;
            }
            currentLen += arcLen;
        }

        // 2. 计算插值坐标
        const currentAngle = targetArc.startAngle + (targetArc.endAngle - targetArc.startAngle) * localProgress;
        const worldX = targetArc.cx + targetArc.R * Math.cos(currentAngle);
        const worldY = targetArc.cy + targetArc.R * Math.sin(currentAngle);
        const pos = transform(worldX, worldY);
~~~~~

#### Acts 4: 移除 `app.js` 冗余的绘图插值变换逻辑

通过让 `renderer.drawTracker` 自行生成 `transform` 视口矩阵来简化动画绘制方法。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
function renderAnimationStep(geometry) {
    // 这里的 transform 逻辑需要与 renderer.draw 内部一致，故我们可以重构 renderer 以暴露获取 transform 的方法
    // 但为简化实现，我们直接让 renderer.draw 返回其内部闭包计算出的坐标转换函数，或者由 renderer 托管。
    // 在本实现中，我们直接在 draw 函数结束后调用 drawTracker。
    
    const pad = 35;
    const canvas = renderer.canvas;
    const { nodes } = geometry;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(p => {
        if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    });
    const w = maxX - minX || 1; const h = maxY - minY || 1;
    const scale = Math.min((canvas.width - 2 * pad) / w, (canvas.height - 2 * pad) / h, 1.5);
    const offsetX = (canvas.width - w * scale) / 2 - minX * scale;
    const offsetY = (canvas.height - h * scale) / 2 - minY * scale;

    const transform = (px, py) => {
        const ax = px * scale + offsetX; const ay = py * scale + offsetY;
        if (!document.fullscreenElement) return { x: ax, y: ay };
        const cx = canvas.width / 2; const cy = canvas.height / 2;
        return {
            x: (ax - cx) * renderer.zoomFactor + cx + renderer.panX,
            y: (ay - cy) * renderer.zoomFactor + cy + renderer.panY
        };
    };

    const fFactor = document.fullscreenElement ? renderer.zoomFactor : 1.0;
    
    // 执行绘制并获取当前位置的状态信息
    const info = renderer.drawTracker(geometry, animProgress, transform, fFactor);
    
    if (info) {
~~~~~
~~~~~javascript.new
function renderAnimationStep(geometry) {
    const fFactor = document.fullscreenElement ? renderer.zoomFactor : 1.0;
    
    // 执行绘制并获取当前位置的状态信息
    const info = renderer.drawTracker(geometry, animProgress, fFactor);
    
    if (info) {
~~~~~

### 下一步建议
- **执行测试用例**: 重构完成后，请首先在本地执行 `pytest`，确保所有原有的单元测试和集成测试正常运行，保证重构不会对验证链路带来回归缺陷。
- **验证 TUI 与 网页**: 运行 Uvicorn 服务和命令行 CLI 手动校验前端轨迹跟踪渲染是否顺畅，并检查控制台输出格式。
