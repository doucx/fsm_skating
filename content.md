这是一个非常专业的交互需求。在地图应用（如 Google Maps）或 CAD 软件中，以鼠标指针为中心进行缩放（Zoom-at-Mouse）是标准做法，因为它能让用户精确地“推开”不需要的区域并“拉近”感兴趣的特定动作。

我将修改 `web/js/app.js` 中的 `wheel` 事件监听器：
1.  **捕获锚点坐标**：获取缩放发生时鼠标在画布上的精确坐标 $(mx, my)$。
2.  **平移补偿计算**：在缩放倍率 `zoomFactor` 改变的同时，根据鼠标位置与当前平移量（Pan）的几何比例，反向计算并补偿 `panX` 和 `panY`。
3.  **保持点位不动**：确保在缩放前后，鼠标指针下方的那个物理坐标点在屏幕上的像素位置保持绝对静止。

## [WIP] feat(web): 实现以鼠标指针为中心的无损缩放逻辑

### 用户需求
修改 2D 轨迹的全屏交互逻辑：滚轮缩放时不再固定以屏幕中心为轴，而是以鼠标当前指向的位置为锚点进行缩放。

### 评论
“以鼠标为中心缩放”是高阶图形交互的灵魂。它允许用户通过简单的滚轮操作，像操作放大镜一样直接“对准”某个具体的转三步或莫霍克步，极大地提升了编排审查的效率。

### 目标
1. 升级 `web/js/app.js` 中的 `wheel` 监听逻辑。
2. 引入平移补偿公式，实时更新 `panX` 和 `panY` 以抵消缩放造成的点位偏移。

### 基本原理
为了让鼠标下的点 $M$ 在缩放后保持不动，我们需要更新平移量。
设定缩放前的倍率为 $z$，缩放后为 $z'$，画布中心为 $C$，平移量为 $pan$。
鼠标对应的“自动布局点”坐标为 $A$。
根据当前的 `transform` 公式：$M = (A - C) \cdot z + C + pan$
当 $z$ 变为 $z'$ 时，新的平移量 $pan'$ 必须满足：
$$pan' = (M - C) - \frac{z'}{z} \cdot (M - C - pan)$$
这样，用户在滚动滚轮时，视觉上就像是在拉伸或压缩鼠标指针所指的那一点，体验非常顺滑。

### 标签
#intent/refine #flow/ready #priority/high #comp/interfaces #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/mouse-centric-zoom #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 升级滚轮事件，引入动态平移补偿

我们将重构 `initCanvasInteraction` 中的 `wheel` 回调函数，注入基于鼠标位置的坐标变换数学。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
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
~~~~~
~~~~~javascript.new
    canvas.addEventListener("wheel", (e) => {
        if (!document.fullscreenElement) return;
        e.preventDefault();

        const mx = e.clientX;
        const my = e.clientY;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        const oldZoom = zoomFactor;
        const zoomSpeed = 0.12;
        
        // 1. 更新缩放倍率
        if (e.deltaY < 0) {
            zoomFactor *= (1 + zoomSpeed);
        } else {
            zoomFactor /= (1 + zoomSpeed);
            zoomFactor = Math.max(0.1, zoomFactor);
        }

        // 2. 核心数学：计算以鼠标为中心的平移补偿
        // 公式：pan' = (M - C) - (z'/z) * (M - C - pan)
        const ratio = zoomFactor / oldZoom;
        panX = (mx - cx) - (mx - cx - panX) * ratio;
        panY = (my - cy) - (my - cy - panY) * ratio;

        drawSkatePath(path);
    }, { passive: false });
~~~~~

### 下一步建议
- **多动作测试**: 在编排了长路径（例如 15 步以上）后进入全屏，尝试将鼠标放在路径末尾的一个特定转三步符号上，滚动滚轮，观察该符号是否始终锁定在鼠标指针尖端。
- **边界检查**: 在极端缩小（Zoom 极小）的情况下，平移量的计算依然有效，但图形可能会缩成一个点，这是正常物理表现。如果你需要，我们可以添加一个“重置视图”双击手势。
