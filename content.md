这是一个极佳的体验改进。在大屏或全屏（Fullscreen）模式下查看复杂的步法编排时，自由缩放和平移（Zoom & Pan）能够让用户随意探索任何微小的过渡细节或跳跃弧线。

我将修改 `web/js/app.js` 来实现这一高级手势：
1.  **定义全局状态**：在 JS 中引入 `zoomFactor`（缩放系数）、`panX` / `panY`（平移偏移量）以及 `isDragging`（拖拽状态记录器）。
2.  **融入投影公式**：修改 `drawSkatePath` 内的 2D 变换公式。系统先执行自适应边界计算作为“基准画布”，在此基础上，在全屏模式下融入用户拖拽和滚轮产生的平移量，实现无失真的交互矩阵计算。
3.  **手势监听初始化**：编写 `initCanvasInteraction()`，绑定鼠标滚轮 `wheel`、点击 `mousedown`、拖拽 `mousemove` 及松开 `mouseup` 组合。
4.  **状态防松/防抖与重置**：每次进入或退出全屏时，将缩放和平移参数重置为基准值（`1.0` 与 `0`），防止上一轮的手势偏移带入到常规面板中。

## [WIP] feat(web): 冰面轨迹全屏模式支持滚轮无损缩放与鼠标拖拽平移

### 用户需求
在 2D 轨迹 Canvas 处于全屏模式时：
- 支持使用鼠标滚轮无级缩放（Zoom-in / Zoom-out）。
- 支持点击鼠标左键并按住拖拽，实现轨迹自由移动（Pan）。

### 评论
加入全屏下的无损自由视口探索（Pan & Zoom），让步法校验系统呈现出比肩 CAD 的专业运动学仿真质感，大大提高了编排复杂多步滑跑路径时的可用性。

### 目标
1. 声明并维护 Canvas 状态量（`zoomFactor`、`panX`、`panY`）。
2. 更新 `drawSkatePath` 内的坐标 `transform` 映射计算。
3. 增加 `initCanvasInteraction()` 手势初始化函数，注入必要的 `wheel` 及 `drag` 物理坐标转换。
4. 在全屏状态监听 `fullscreenchange` 中加入状态重置逻辑。

### 基本原理
1.  **滚轮无损缩放**：拦截滚轮事件 `deltaY`，向上滚则乘以 `1.1` 放大，向下滚则除以 `1.1` 缩小。
2.  **坐标平移差值**：当 `mousedown` 触发时记录初始偏移，拖拽 `mousemove` 过程中根据 client 差值刷新 `panX/Y`。
3.  **锚点缩放数学**：为了让缩放最自然，我们将缩放锚点设为**画布中心点**。计算公式为：
    $$x' = (x_{auto} - x_{center}) \times zoomFactor + x_{center} + panX$$
    这确保了图形始终环绕屏幕中点向四周流畅膨胀，完全符合直觉。

### 标签
#intent/build #flow/ready #priority/high #comp/interfaces #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/visual-gesture #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 在页面初始化中注入交互手势注册

修改 `DOMContentLoaded` 入口，在初始化编排状态的同时，挂载 Canvas 的高级手势绑定。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
// 初始化
document.addEventListener("DOMContentLoaded", () => {
    initChoreography();
});
~~~~~
~~~~~javascript.new
// 初始化
document.addEventListener("DOMContentLoaded", () => {
    initChoreography();
    initCanvasInteraction(); // 注入全屏高级手势控制（滚轮缩放与拖拽移动）
});
~~~~~

#### Acts 2: 升级坐标投影矩阵，融入交互偏移量

修改 `drawSkatePath` 的投影计算公式，使其在全屏状态下融合滚轮及拖拽所造成的偏移。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
    const pad = 35;
    const w = maxX - minX || 1;
    const h = maxY - minY || 1;
    // 自适应缩放比例上限为 1.5 倍，防止少量点时无限放大
    const scale = Math.min((canvas.width - 2 * pad) / w, (canvas.height - 2 * pad) / h, 1.5);

    // 视口平移补偿
    const offsetX = (canvas.width - w * scale) / 2 - minX * scale;
    const offsetY = (canvas.height - h * scale) / 2 - minY * scale;

    // 映射投影函数
    const transform = (px, py) => ({
        x: px * scale + offsetX,
        y: py * scale + offsetY
    });
~~~~~
~~~~~javascript.new
    const pad = 35;
    const w = maxX - minX || 1;
    const h = maxY - minY || 1;
    // 自适应缩放比例上限为 1.5 倍，防止少量点时无限放大
    const scale = Math.min((canvas.width - 2 * pad) / w, (canvas.height - 2 * pad) / h, 1.5);

    // 视口平移补偿
    const offsetX = (canvas.width - w * scale) / 2 - minX * scale;
    const offsetY = (canvas.height - h * scale) / 2 - minY * scale;

    // 映射投影函数 (全屏状态下融入鼠标手势)
    const transform = (px, py) => {
        const ax = px * scale + offsetX;
        const ay = py * scale + offsetY;
        
        if (!document.fullscreenElement) {
            return { x: ax, y: ay };
        }
        
        // 以画布中点为物理缩放锚点，再加上平移量
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        return {
            x: (ax - cx) * zoomFactor + cx + panX,
            y: (ay - cy) * zoomFactor + cy + panY
        };
    };
~~~~~

#### Acts 3: 注入手势绑定器逻辑，并在全屏状态切换时清空累积参数

实现 `initCanvasInteraction` 手势动作，并在 `fullscreenchange` 中重置手势，避免带回主面板。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
// 5. 全屏切换与动态分辨率适配
function toggleFullscreen() {
    const container = document.getElementById("canvas-container");
    if (!document.fullscreenElement) {
        container.requestFullscreen().catch((err) => {
            console.error(`无法进入全屏模式: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
}

document.addEventListener("fullscreenchange", () => {
    const canvas = document.getElementById("skate-canvas");
    if (document.fullscreenElement) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    } else {
        canvas.width = 600;
        canvas.height = 200;
    }
    drawSkatePath(path);
});
~~~~~
~~~~~javascript.new
// 5. 全屏切换与动态分辨率适配
let zoomFactor = 1.0;
let panX = 0;
let panY = 0;
let isDragging = false;
let startX = 0;
let startY = 0;

function toggleFullscreen() {
    const container = document.getElementById("canvas-container");
    if (!document.fullscreenElement) {
        container.requestFullscreen().catch((err) => {
            console.error(`无法进入全屏模式: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
}

// 注册拖拽与滚动交互机制 (仅在全屏状态生效)
function initCanvasInteraction() {
    const canvas = document.getElementById("skate-canvas");
    if (!canvas) return;

    canvas.addEventListener("wheel", (e) => {
        if (!document.fullscreenElement) return;
        e.preventDefault(); // 阻止页面滚动

        const zoomSpeed = 0.08;
        if (e.deltaY < 0) {
            zoomFactor *= (1 + zoomSpeed);
        } else {
            zoomFactor /= (1 + zoomSpeed);
            zoomFactor = Math.max(0.15, zoomFactor); // 设定最小收缩边界
        }
        drawSkatePath(path);
    }, { passive: false });

    canvas.addEventListener("mousedown", (e) => {
        if (!document.fullscreenElement) return;
        isDragging = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
    });

    canvas.addEventListener("mousemove", (e) => {
        if (!document.fullscreenElement || !isDragging) return;
        panX = e.clientX - startX;
        panY = e.clientY - startY;
        drawSkatePath(path);
    });

    window.addEventListener("mouseup", () => {
        isDragging = false;
    });
}

document.addEventListener("fullscreenchange", () => {
    const canvas = document.getElementById("skate-canvas");
    
    // 状态切换时彻底初始化拖拽平移参数，保障画面对齐
    zoomFactor = 1.0;
    panX = 0;
    panY = 0;
    isDragging = false;

    if (document.fullscreenElement) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    } else {
        canvas.width = 600;
        canvas.height = 200;
    }
    drawSkatePath(path);
});
~~~~~

### 下一步建议
- **触摸支持（移动端优化建议）**：如果是平板等触摸设备，鼠标拖动可以完美映射为单指触控。未来如需更精细，可以补充多点触控（Pinch to zoom）双指缩放公式。
- **重置视口按钮**：在全屏状态下，如果用户拖拽至丢失视野（Pan 得太远），可以考虑在全屏一角提供一个“重置视口”的悬浮按钮。
