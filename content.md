没问题，这确实是一个交互逻辑上的冲突。在画布（Canvas）上绑定 `onclick` 会导致鼠标在尝试拖拽（mousedown + mousemove + mouseup）后，浏览器依然可能触发 `click` 事件，从而意外退出全屏。

既然 `Esc` 键和顶部的专用按钮已经提供了足够的导航能力，移除画布本身的点击切换功能是更稳健的做法。

## [WIP] fix(web): 移除画布点击切换全屏功能以消除拖拽冲突

### 用户需求
在全屏模式下拖拽轨迹时，由于点击操作会触发全屏切换，导致意外退出全屏。需要取消画布（Canvas）本身的点击缩放/全屏功能，仅保留 `Esc` 键或专用按钮进行操作。

### 评论
在复杂的交互界面设计中，“单一职责原则”也适用于手势。将画布点击从全屏切换功能中解耦，可以为“平移（Pan）”操作腾出完整的交互空间，避免误触。

### 目标
1. 修改 `web/index.html`，移除 `<canvas>` 标签上的 `onclick` 事件和 `cursor-pointer` 样式。
2. 移除画布容器内的“点击全屏”悬停文字提示，避免误导用户。

### 基本原理
直接移除 DOM 元素上的内联事件处理器。保留 `h3` 标题栏中的 `button` 按钮作为进入全屏的入口。

### 标签
#intent/refine #flow/ready #priority/medium #comp/interfaces #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/fullscreen-interaction #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 净化画布 DOM 结构，移除点击冲突

我们将移除画布上的 `onclick` 钩子和相关的视觉引导元素。

~~~~~act
patch_file
web/index.html
~~~~~
~~~~~html.old
                        <div id="canvas-container" class="bg-slate-950/80 rounded-xl overflow-hidden border border-slate-800 glow-ice relative group">
                            <canvas id="skate-canvas" width="600" height="200" class="w-full h-[200px] block cursor-pointer" onclick="toggleFullscreen()"></canvas>
                            <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none bg-slate-900/80 px-2.5 py-1 rounded text-[10px] text-slate-400">
                                <i class="fa-solid fa-maximize mr-1"></i> 点击全屏
                            </div>
                        </div>
~~~~~
~~~~~html.new
                        <div id="canvas-container" class="bg-slate-950/80 rounded-xl overflow-hidden border border-slate-800 glow-ice relative group">
                            <canvas id="skate-canvas" width="600" height="200" class="w-full h-[200px] block"></canvas>
                        </div>
~~~~~

### 下一步建议
- **操作测试**: 现在你可以尝试在全屏模式下通过点击并移动鼠标来自由平移（Pan）轨迹，验证是否还会意外退出全屏。
- **UI 微调**: 如果你觉得进入全屏的按钮不够醒目，我们可以稍微加大标题栏中“点击全屏/放大”按钮的尺寸或增加背景色。
