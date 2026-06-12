好的，我们已经彻底解决了全屏切换和窗口缩放时的画面拉伸问题。通过引入 `ResizeObserver` 并同步 Canvas 的物理分辨率，沙盒的 UI 现在具备了完美的响应式能力和像素级的清晰度。

现在，我们将这个改动作为一个完整的逻辑单元进行提交。

## [COMMIT] fix(web): 引入 ResizeObserver 彻底解决 Canvas 画面拉伸失真

### 用户需求
解决浏览器窗口缩放或切换全屏模式时，Canvas 画面出现的异常拉伸、变形和像素模糊问题。

### 评论
这是一次关键的 UI 健壮性提升。之前的硬编码方式在面对复杂的 CSS 布局变化（如全屏过渡动画）时显得捉襟见肘。新的方案采用现代浏览器原生的观察者机制，将 Canvas 的绘制缓冲区与其屏幕真实物理尺寸进行了动态锚定，从根本上杜绝了畸变的产生。

### 目标
1. 将 `web/js/app.js` 中的自适应分辨率同步逻辑及 `ResizeObserver` 引入代码提交至仓库。
2. 标志着 UI 基础渲染稳定性任务的阶段性完成。

### 基本原理
当 Canvas 的 `width` 属性与其 DOM 渲染尺寸不一致时，浏览器会强行拉伸像素。通过 `ResizeObserver`，我们可以在布局发生变动（无论是窗口拖拽还是全屏切换）的瞬间捕获到准确的物理像素尺寸，并重新配置渲染管线。

### 标签
#intent/fix #flow/ready #priority/high #comp/ui #scope/ux #ai/instruct #task/domain/ui #task/object/canvas-rendering #task/action/fix #task/state/end #task/status/completed

---

### Script

#### Acts 1: 提交变更

我们将修改后的 `web/js/app.js` 提交至仓库，正式关闭此项 UI 渲染质量改进任务。

~~~~~act
git_add
web/js/app.js
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
fix(web): prevent canvas distortion using ResizeObserver

Fixed the stretching and distortion issues occurring during fullscreen transitions and window resizing by synchronizing the canvas's internal buffer resolution with its CSS display dimensions.

Changes:
- Integrated ResizeObserver to monitor real-time CSS layout changes on the canvas element.
- Refactored drawPath() to automatically update canvas.width/height based on getBoundingClientRect() before rendering.
- Removed deprecated hardcoded width/height assignments from the fullscreenchange event listener.
- Ensured a 1:1 pixel mapping, resulting in sharp visuals and correct aspect ratios across all screen sizes and orientations.

This change provides a robust responsive foundation for the choreography sandbox.
~~~~~

### 下一步建议
- **性能测试**: 尽管 `ResizeObserver` 性能极佳，但在快速拖动窗口大小时仍会频繁重绘。可以观察在重型路径下的响应流畅度。
- **UI 细节**: 画布现在已经稳定，建议后续可以增加“点击画布任意处平移”或“双击重置视角”等更直观的交互方式。
- **多设备适配**: 由于具备了响应式能力，可以尝试在移动端浏览器查看 UI 排版，并根据需要调整 CSS 布局。
