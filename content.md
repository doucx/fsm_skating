我将为您生成一个 `[WIP]` 计划，来解决您提到的前两处 DRY 冗余问题，并对前端用刃状态解析逻辑进行轻量级重构，从而实现代码逻辑的统一管理。

## [WIP] refactor: 解决 Canvas 缩放逻辑重复、类别硬编码，并重构前端用刃状态解析

### 用户需求
1. **解决问题一**：消除 `canvasRenderer.js` 中 `getTransform` 与 `draw` 内部完全重复的包围盒和 `scale` 比例计算代码。
2. **解决问题二**：消除 `engine.py` 中 `check_library_integrity` 函数里重复读取配置文件与硬编码 `categories` 默认字典的问题。
3. **完成三的轻量级重构**：重构前端（JavaScript），将散落在多处的 `stateStr[0]`、`stateStr[1]` 等通过硬编码数组索引拆解状态字符的逻辑，统一收拢到 `state.js` 内的 `parseState` 帮助函数中。

### 评论
这些改进不仅消除多处硬编码和重复计算，而且使前端的物理状态解析拥有了单一且清晰的入口，在不影响高性能渲染的前提下，显著增强了代码的稳健性。

### 目标
1. 在 `canvasRenderer.js` 内提炼出私有方法 `_getBoundsAndScale`，并在 `getTransform` 与 `draw` 中复用它。
2. 调整 `engine.py`，使引擎在初始化 `__init__` 时一次性加载并持有 `self.categories`，使 `check_library_integrity` 不再重复读盘解析 YAML，直接使用该属性，并去掉方法内写死的映射。
3. 在 `state.js` 中新增 `parseState(stateStr)` 函数，并将 `app.js` 与 `canvasRenderer.js` 中关于脚别 (`isLeft`)、滑向 (`isForward`) 的直接下标检索重构为对该函数的调用。

### 基本原理
1. 通过提炼公用函数 `_getBoundsAndScale`，我们将 canvas 的适配逻辑解耦，只保留一次遍历过程。
2. 通过使 `ChoreographyEngine` 在实例化时统一管理整个配置文件字典，使完整性校验器与核心过滤管道共享同一个内存状态，符合单源真实性（Single Source of Truth）。
3. 抽象 `parseState` 后，即使未来更改滑行状态字符的表现格式（例如增加其他属性），也仅需在 `state.js` 一处进行修改。

### 标签
#intent/refine #flow/ready #priority/medium #comp/engine #comp/runtime #concept/ui #scope/core #scope/dx #ai/refine #task/domain/cli #task/object/fsm-skating #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 解决问题一：重构 `canvasRenderer.js` 中的比例计算

我们将提取并合并重复的二维投影包围盒及缩放因子计算逻辑。

~~~~~act
patch_file
web/js/canvasRenderer.js
~~~~~
~~~~~javascript.old
import { getCurvature } from './state.js';

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
~~~~~
~~~~~javascript.new
import { getCurvature, parseState } from './state.js';

export class CanvasRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext("2d");
        this.zoomFactor = 1.0;
        this.panX = 0;
        this.panY = 0;
    }

    _getBoundsAndScale(nodes, pad = 35) {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        nodes.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        });

        const w = maxX - minX || 1;
        const h = maxY - minY || 1;
        const scale = Math.min((this.canvas.width - 2 * pad) / w, (this.canvas.height - 2 * pad) / h, 1.5);

        return { minX, minY, w, h, scale };
    }

    getTransform(nodes) {
        const { minX, minY, w, h, scale } = this._getBoundsAndScale(nodes);

        const offsetX = (this.canvas.width - w * scale) / 2 - minX * scale;
        const offsetY = (this.canvas.height - h * scale) / 2 - minY * scale;

        return (px, py) => {
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
~~~~~javascript.new
    draw(geometry) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const { nodes, arcs } = geometry;
        if (nodes.length === 0) return;

        const transform = this.getTransform(nodes);
        const { scale } = this._getBoundsAndScale(nodes);

        // 绘制微光网格冰面质感
~~~~~

#### Acts 2: 解决问题二：重构 `engine.py` 以消灭类别定义及解析冗余

重构配置文件加载机制，将读取的数据缓存在实例属性中，消除 integrity 检查时重复读盘和硬编码。

~~~~~act
patch_file
src/fsm_skating/services/engine.py
~~~~~
~~~~~python.old
class ChoreographyEngine:
    """
    花样滑冰状态机编排与过滤引擎。
    """

    def __init__(self, config_path: str):
        self.config_path = config_path
        self.moves = self._load_config()

    def _load_config(self) -> List[Dict[str, Any]]:
        if not os.path.exists(self.config_path):
            raise FileNotFoundError(
                f"Configuration file not found at: {self.config_path}"
            )
        with open(self.config_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return data.get("moves", [])
~~~~~
~~~~~python.new
class ChoreographyEngine:
    """
    花样滑冰状态机编排与过滤引擎。
    """

    def __init__(self, config_path: str):
        self.config_path = config_path
        config_data = self._load_config_data()
        self.moves = config_data.get("moves", [])
        self.categories = config_data.get("categories", {})

    def _load_config_data(self) -> Dict[str, Any]:
        if not os.path.exists(self.config_path):
            raise FileNotFoundError(
                f"Configuration file not found at: {self.config_path}"
            )
        with open(self.config_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        return data if data else {}
~~~~~

~~~~~act
patch_file
src/fsm_skating/services/engine.py
~~~~~
~~~~~python.old
    def check_library_integrity(self) -> Dict[str, Any]:
        """
        检查动作库中各类别动作的覆盖度 (FO, FI, BO, BI)。
        """
        with open(self.config_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        categories = data.get(
            "categories",
            {
                "three_turn": "转三步 (Three-Turn)",
                "bracket": "括弧步 (Bracket)",
                "rocker": "摇滚步 (Rocker)",
                "counter": "计数步 (Counter)",
                "mohawk": "莫霍克步 (Mohawk)",
                "choctaw": "乔克陶步 (Choctaw)",
            },
        )

        required = ["FO", "FI", "BO", "BI"]
        report = {}
~~~~~
~~~~~python.new
    def check_library_integrity(self) -> Dict[str, Any]:
        """
        检查动作库中各类别动作的覆盖度 (FO, FI, BO, BI)。
        """
        categories = self.categories if self.categories else {
            "three_turn": "转三步 (Three-Turn)",
            "bracket": "括弧步 (Bracket)",
            "rocker": "摇滚步 (Rocker)",
            "counter": "计数步 (Counter)",
            "mohawk": "莫霍克步 (Mohawk)",
            "choctaw": "乔克陶步 (Choctaw)",
        }

        required = ["FO", "FI", "BO", "BI"]
        report = {}
~~~~~

#### Acts 3: 进行三的轻量级重构：重构前端用刃状态解析

##### 步骤 3.1: 在 `state.js` 中提炼并导出统一的状态解析方法 `parseState`

~~~~~act
patch_file
web/js/state.js
~~~~~
~~~~~javascript.old
export function getCurvature(stateStr) {
    const isL = stateStr[0] === 'L';
    const isF = stateStr[1] === 'F';
    const isO = stateStr[2] === 'O';
    let isCW = false;
    if (isL) {
        isCW = isF ? (!isO) : isO;
    } else {
        isCW = isF ? isO : (!isO);
    }
    return isCW ? "CW" : "CCW";
}
~~~~~
~~~~~javascript.new
export function parseState(stateStr) {
    if (!stateStr || stateStr.length !== 3) {
        return { foot: null, direction: null, edge: null, isLeft: false, isForward: false, isOutside: false };
    }
    const foot = stateStr[0];
    const direction = stateStr[1];
    const edge = stateStr[2];
    return {
        foot,
        direction,
        edge,
        isLeft: foot === 'L',
        isForward: direction === 'F',
        isOutside: edge === 'O'
    };
}

export function getCurvature(stateStr) {
    const { isLeft, isForward, isOutside } = parseState(stateStr);
    let isCW = false;
    if (isLeft) {
        isCW = isForward ? (!isOutside) : isOutside;
    } else {
        isCW = isForward ? isOutside : (!isOutside);
    }
    return isCW ? "CW" : "CCW";
}
~~~~~

##### 步骤 3.2: 替换 `canvasRenderer.js` 中的底层下标切片逻辑

~~~~~act
patch_file
web/js/canvasRenderer.js
~~~~~
~~~~~javascript.old
        // 绘制连续滑行圆弧段 (Arcs = States)
        arcs.forEach((arc, idx) => {
            const centerTrans = transform(arc.cx, arc.cy);
            const scaledR = arc.R * scale * fFactor;

            ctx.save();
            ctx.beginPath();
            ctx.arc(centerTrans.x, centerTrans.y, scaledR, arc.startAngle, arc.endAngle, arc.anticlockwise);

            const progressRatio = (idx + 1) / arcs.length;
            const isLeft = arc.state[0] === 'L';
            const isForward = arc.state[1] === 'F';

            // 区分双脚：左脚蓝色，右脚橙色
~~~~~
~~~~~javascript.new
        // 绘制连续滑行圆弧段 (Arcs = States)
        arcs.forEach((arc, idx) => {
            const centerTrans = transform(arc.cx, arc.cy);
            const scaledR = arc.R * scale * fFactor;

            ctx.save();
            ctx.beginPath();
            ctx.arc(centerTrans.x, centerTrans.y, scaledR, arc.startAngle, arc.endAngle, arc.anticlockwise);

            const progressRatio = (idx + 1) / arcs.length;
            const stateInfo = parseState(arc.state);
            const isLeft = stateInfo.isLeft;
            const isForward = stateInfo.isForward;

            // 区分双脚：左脚蓝色，右脚橙色
~~~~~

~~~~~act
patch_file
web/js/canvasRenderer.js
~~~~~
~~~~~javascript.old
        // 3. 绘制追踪球 (冰晶小球)
        const ctx = this.ctx;
        const isLeft = targetArc.state[0] === 'L';
        const ballColor = isLeft ? "56, 189, 248" : "249, 115, 22";
~~~~~
~~~~~javascript.new
        // 3. 绘制追踪球 (冰晶小球)
        const ctx = this.ctx;
        const isLeft = parseState(targetArc.state).isLeft;
        const ballColor = isLeft ? "56, 189, 248" : "249, 115, 22";
~~~~~

##### 步骤 3.3: 替换 `app.js` 中的下标切片逻辑

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
import * as api from './api.js';
import { computeGeometry } from './state.js';
import { CanvasRenderer } from './canvasRenderer.js';
~~~~~
~~~~~javascript.new
import * as api from './api.js';
import { computeGeometry, parseState } from './state.js';
import { CanvasRenderer } from './canvasRenderer.js';
~~~~~

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
    arcs.forEach((arc, idx) => {
        const arcLen = arc.R * Math.abs(arc.endAngle - arc.startAngle);
        const widthPercent = (arcLen / totalLength) * 100;
        
        const seg = document.createElement("div");
        seg.className = "timeline-segment";
        seg.style.width = `${widthPercent}%`;
        
        const isLeft = arc.state[0] === 'L';
        seg.style.backgroundColor = isLeft ? "#0ea5e9" : "#f97316"; // sky-500 : orange-500
~~~~~
~~~~~javascript.new
    arcs.forEach((arc, idx) => {
        const arcLen = arc.R * Math.abs(arc.endAngle - arc.startAngle);
        const widthPercent = (arcLen / totalLength) * 100;
        
        const seg = document.createElement("div");
        seg.className = "timeline-segment";
        seg.style.width = `${widthPercent}%`;
        
        const isLeft = parseState(arc.state).isLeft;
        seg.style.backgroundColor = isLeft ? "#0ea5e9" : "#f97316"; // sky-500 : orange-500
~~~~~

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
        // 基于 DOM 查找实现更精准的 Tooltip
        const targetSeg = document.elementFromPoint(e.clientX, rect.top + rect.height/2);
        if (targetSeg && targetSeg.classList.contains('timeline-segment')) {
            const isLeft = targetSeg.dataset.state[0] === 'L';
            const footText = isLeft ? "左脚" : "右脚";
            const footColor = isLeft ? "text-sky-400" : "text-orange-400";
~~~~~
~~~~~javascript.new
        // 基于 DOM 查找实现更精准的 Tooltip
        const targetSeg = document.elementFromPoint(e.clientX, rect.top + rect.height/2);
        if (targetSeg && targetSeg.classList.contains('timeline-segment')) {
            const isLeft = parseState(targetSeg.dataset.state).isLeft;
            const footText = isLeft ? "左脚" : "右脚";
            const footColor = isLeft ? "text-sky-400" : "text-orange-400";
~~~~~

### 下一步建议
* **回归测试运行**：由于修改了核心领域模型加载逻辑及前端数据解析逻辑，建议在终端中运行 `pytest`（或直接执行针对 `engine.py` 和 `test_phase1_refactor.py` / `test_phase2_move_centric.py` 的测试）来验证引擎是否正常工作。
* **物理推导同步的最终闭环（非必须）**：目前仍存在中文字典和动力学弯曲计算的跨语言微量冗余。在验证了以上核心重构工作无误后，如需进一步极致解耦，可考虑通过接口由 Python 下发这些翻译和推导映射。
