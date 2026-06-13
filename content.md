为了让全屏沙盒模式更好地支持移动端设备，我们需要在 2D 冰面轨迹画布上支持原生移动端触控手势。

我们将通过监听 `touchstart`、`touchmove`、`touchend` 和 `touchcancel` 事件，检测屏幕上的触控点数量：
1. **单指模式**：当触控点为 1 个时，计算单指在屏幕上的滑动位移并应用于 `renderer.panX` 和 `renderer.panY`，从而完美模拟鼠标拖拽平移。
2. **双指模式**：当触控点为 2 个时，计算两个触点之间欧氏距离的变化比例，结合双指当前的中心位置作为缩放锚点，来精确驱动 `renderer.zoomFactor` 发生变化，从而平滑地实现双指手势缩放。

我已为您准备好了将该适配逻辑集成进前端交互系统的具体计划。

## [WIP] feat(web): 冰面画布支持全屏模式下的移动端单指平移与双指缩放手势

### 用户需求
在全屏模式下，支持手机等触屏设备的用户能够使用**单指滑动平移**和**双指手势捏合/张开缩放** 2D 冰面轨迹。

### 评论
当前系统只针对 PC 端桌面浏览器绑定了鼠标拖拽事件与滚轮缩放事件。这极大限制了该沙盒在移动端浏览器或平板等触屏环境下的易用性。为触控屏适配物理手势是一项关键的体验升级。

### 目标
1. 在 `web/js/app.js` 的 `initInteraction` 函数中绑定针对画布 `canvas` 元素的触屏原生事件。
2. 约束仅在全屏状态下（`document.fullscreenElement` 激活时）响应这些手势。
3. 实现触控手势逻辑：
   - **单指触屏** ── 激活轨迹图的平滑拖拽平移；
   - **双指捏合** ── 计算距离差值比例，完成以双指中心点为锚点的视图无级缩放平移。
4. 在多点触控点数变化（如从双指变为单指时）做好平滑的状态重定位。

### 基本原理
利用标准的 `Touch Events API`：
- 事件触发时的 `e.touches` 数组包含当前正在接触屏幕的所有触点。
- 当 `e.touches.length === 1` 时，代表单指手势。此时通过记录单指按下位置与画布 `panX` / `panY` 平移偏移量之差作为起步锚点，随着单指滑动实时更改视窗平移参数。
- 当 `e.touches.length === 2` 时，代表双指手势。此时停止单指拖动，计算双触点间的欧氏距离 $D = \sqrt{(x_1-x_2)^2 + (y_1-y_2)^2}$，用当前滑动过程中的距离与双指按下瞬间的初始距离之比作为缩放因子，无缝缩放 `renderer.zoomFactor`。
- 为了保证缩放中心点的合理性，缩放应当以两指中心点 `(centerX, centerY)` 作为投影中心进行视口重绘。
- 在 `touchmove` 中需要对全屏触控事件执行 `e.preventDefault()` 阻止系统默认的双击放大或页面整体滑动。

### 标签
#intent/build #flow/ready #priority/high 
#comp/interfaces #concept/ui #scope/ux 
#ai/instruct
#task/domain/ui
#task/object/mobile-gestures
#task/action/integration
#task/state/begin

---

### Script

#### Acts 1: 在交互控制中集成触控平移与捏合缩放算法

我们将修改前端控制文件 `web/js/app.js`，在其 `initInteraction` 函数内部，在原本处理鼠标移动逻辑的下方，添加我们精心设计的、针对移动端触屏的事件监听器，使其在进入全屏后响应拖拽与缩放。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    canvas.addEventListener("mousedown", (e) => {
        if (!document.fullscreenElement) return;
        isDragging = true;
        startX = e.clientX - renderer.panX;
        startY = e.clientY - renderer.panY;
    });

    canvas.addEventListener("mousemove", (e) => {
        if (!document.fullscreenElement || !isDragging) return;
        renderer.panX = e.clientX - startX;
        renderer.panY = e.clientY - startY;
        drawPath();
    });

    window.addEventListener("mouseup", () => {
        isDragging = false;
    });
~~~~~
~~~~~javascript.new
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    canvas.addEventListener("mousedown", (e) => {
        if (!document.fullscreenElement) return;
        isDragging = true;
        startX = e.clientX - renderer.panX;
        startY = e.clientY - renderer.panY;
    });

    canvas.addEventListener("mousemove", (e) => {
        if (!document.fullscreenElement || !isDragging) return;
        renderer.panX = e.clientX - startX;
        renderer.panY = e.clientY - startY;
        drawPath();
    });

    window.addEventListener("mouseup", () => {
        isDragging = false;
    });

    // --- 移动端触控交互适配 ---
    let touchStartDist = 0;
    let touchStartZoom = 1.0;

    canvas.addEventListener("touchstart", (e) => {
        if (!document.fullscreenElement) return;
        if (e.touches.length === 1) {
            isDragging = true;
            startX = e.touches[0].clientX - renderer.panX;
            startY = e.touches[0].clientY - renderer.panY;
        } else if (e.touches.length === 2) {
            isDragging = false;
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            touchStartDist = Math.sqrt(dx * dx + dy * dy);
            touchStartZoom = renderer.zoomFactor;
        }
    }, { passive: false });

    canvas.addEventListener("touchmove", (e) => {
        if (!document.fullscreenElement) return;
        if (e.touches.length === 1 && isDragging) {
            renderer.panX = e.touches[0].clientX - startX;
            renderer.panY = e.touches[0].clientY - startY;
            drawPath();
            e.preventDefault();
        } else if (e.touches.length === 2 && touchStartDist > 0) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            const oldZoom = renderer.zoomFactor;
            renderer.zoomFactor = touchStartZoom * (dist / touchStartDist);
            renderer.zoomFactor = Math.max(0.1, renderer.zoomFactor);

            const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;

            const ratio = renderer.zoomFactor / oldZoom;
            renderer.panX = (centerX - cx) - (centerX - cx - renderer.panX) * ratio;
            renderer.panY = (centerY - cy) - (centerY - cy - renderer.panY) * ratio;

            drawPath();
            e.preventDefault();
        }
    }, { passive: false });

    canvas.addEventListener("touchend", (e) => {
        if (!document.fullscreenElement) return;
        if (e.touches.length === 1) {
            isDragging = true;
            startX = e.touches[0].clientX - renderer.panX;
            startY = e.touches[0].clientY - renderer.panY;
        } else {
            isDragging = false;
        }
        touchStartDist = 0;
    }, { passive: false });

    canvas.addEventListener("touchcancel", () => {
        isDragging = false;
        touchStartDist = 0;
    });
~~~~~

### 下一步建议
1. **实机触屏测试**：将此计划应用之后，请您在真机或使用 Chrome 开发者工具的“移动设备模拟”中开启全屏模式，检查多点触控与缩放跟随的顺滑度。
2. **UI 元素防触屏蔽**：可以额外检验全屏下的控制悬浮条等按钮，确保单指点击这些 UI 按钮时不触发画布底层的拖拽行为。
