这个问题的根源在于：**Canvas 内部缓冲区的分辨率（`width` / `height` 属性）与它在屏幕上实际呈现的 CSS 尺寸不一致。**

当点击全屏时，浏览器会有极短的过渡动画。如果在 `fullscreenchange` 事件触发的瞬间立刻获取 `window.innerWidth`，可能会获取到一个中间态的尺寸。然而，CSS 的 `100vw !important` 会强制将 Canvas 撑满全屏，这就导致了缓冲分辨率和显示分辨率脱节，从而引发拉伸和失真。

事实上，这种硬编码分配宽高的做法，不仅在全屏时会出问题，在正常的响应式窗口缩放时也会导致画面压扁或拉长。

我将生成一个计划来彻底根治这个问题：引入现代的 `ResizeObserver`，让 Canvas 的内部分辨率时刻自动匹配其真实的 CSS 渲染尺寸。

## [WIP] fix(web): 修复全屏切换及窗口缩放时的 Canvas 画面拉伸失真

### 错误分析

**错误原因**: 
在 `app.js` 的 `fullscreenchange` 监听器中，使用了硬编码 (`window.innerWidth` 或 `600/200`) 来设定 Canvas 的分辨率。这种做法在全屏过渡动画期间往往无法获取最终正确的尺寸。另外，非全屏模式下使用了 Tailwind CSS 的 `w-full`（100%宽度），如果容器宽度不是刚好 600px，同样会导致 x 轴拉伸。

**解决方案**:
1. 移除 `fullscreenchange` 中对 Canvas 宽高的硬性设置。
2. 在 `drawPath` 渲染入口处，通过 `getBoundingClientRect()` 获取画布当前的真实 DOM 物理尺寸，并将其同步赋予 Canvas 的内部 `width` 和 `height`，确保 **1:1 像素映射**。
3. 在 `initInteraction` 中引入 `ResizeObserver`。这样一来，无论是全屏过渡、退出全屏，还是用户拖拽改变浏览器窗口大小，都能触发自动重绘和分辨率矫正，从而保证画面永远是 100% 原比例、不拉伸。

### 用户需求
在进入或退出全屏时，保持画面的比例正常，解决因为屏幕拉伸造成的视觉失真。

### 评论
使用 `ResizeObserver` 和自适应分辨率同步是 HTML5 Canvas 开发中的最佳实践。这个补丁不仅修复了全屏问题，还顺带赋予了沙盒画布完美的响应式（Responsive）自适应能力，它现在可以在任何分辨率的设备下保持物理级别的清晰和不变形。

### 目标
1. 修改 `drawPath`，加入 Canvas 分辨率自适应同步逻辑。
2. 引入 `ResizeObserver`。
3. 移除旧的 `fullscreenchange` 宽高硬编码代码。

### 基本原理
当 Canvas 的 `width` 属性等同于其在 DOM 中计算出的渲染 `clientWidth` 时，浏览器就不会对其像素进行任何拉伸或挤压操作。`ResizeObserver` 会精准捕捉 CSS 布局导致的大小变动，然后驱动引擎重算一次投影矩阵。

### 标签
#intent/fix #flow/ready #priority/high #comp/ui #scope/ux #ai/brainstorm #task/domain/ui #task/object/canvas-rendering #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 让 `drawPath` 自动同步 Canvas 分辨率

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript
function drawPath(updateTimeline = false) {
    const geometry = computeGeometry(path);
    renderer.draw(geometry);
    
    if (updateTimeline) {
        updateLinearTimelineUI(geometry);
    }
~~~~~
~~~~~javascript
function drawPath(updateTimeline = false) {
    // 动态同步画布内部分辨率以匹配实际 CSS 渲染尺寸，彻底解决拉伸变形
    const canvas = renderer.canvas;
    const rect = canvas.getBoundingClientRect();
    const targetW = Math.floor(rect.width);
    const targetH = Math.floor(rect.height);
    
    if (targetW > 0 && targetH > 0 && (canvas.width !== targetW || canvas.height !== targetH)) {
        canvas.width = targetW;
        canvas.height = targetH;
    }

    const geometry = computeGeometry(path);
    renderer.draw(geometry);
    
    if (updateTimeline) {
        updateLinearTimelineUI(geometry);
    }
~~~~~

#### Acts 2: 引入 ResizeObserver 并清理旧的硬编码

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript
    document.addEventListener("fullscreenchange", () => {
        renderer.resetViewport();
        if (document.fullscreenElement) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        } else {
            canvas.width = 600;
            canvas.height = 200;
        }
        drawPath();
    });

    // 延时首帧绘制，确保 DOM 完全就绪、加载完毕
    setTimeout(() => {
        drawPath();
    }, 100);
}
~~~~~
~~~~~javascript
    document.addEventListener("fullscreenchange", () => {
        renderer.resetViewport();
        // 移除硬编码宽高设定，转交 ResizeObserver 和 drawPath 动态同步
        drawPath();
    });

    // 使用 ResizeObserver 监听画布 CSS 尺寸的实时变化（例如进入全屏过渡、窗口大小调整等）
    const resizeObserver = new ResizeObserver(() => {
        drawPath();
    });
    resizeObserver.observe(canvas);

    // 延时首帧绘制，确保 DOM 完全就绪、加载完毕
    setTimeout(() => {
        drawPath();
    }, 100);
}
~~~~~

### 下一步建议

代码已更新。
现在你可以：
1. **刷新浏览器页面**以应用新逻辑。
2. 尝试点击“全屏”按钮，在进入全屏和退出全屏时观察画面是否依然保持 1:1 的原比例，不应有任何拉伸。
3. （进阶验证）在非全屏状态下，尝试随意改变浏览器的窗口大小，观察冰面轨迹也会智能地重新排布并保持完美的清晰度。
