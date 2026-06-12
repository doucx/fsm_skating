这是一个非常经典的 HTML5 Canvas 渲染 Bug。

为什么会发生拉伸？
在 Canvas 开发中，存在两个独立的尺寸系统：
1. **画布绘制缓冲区尺寸（Buffer Size）**：由 `canvas.width` 和 `canvas.height` 决定。这定义了 Canvas 内部绘制多少个物理像素。
2. **画布的 CSS 显示尺寸（Display Size）**：由 CSS（例如 `w-full h-[200px]` 或 `100vw`）决定。这是它在网页上被拉伸/缩放到的大小。

如果 **Buffer 尺寸的宽高比** 与 **CSS 显示尺寸的宽高比** 不一致，浏览器就会强制将绘制出的图像拉伸变形以填充 CSS 容器，从而导致严重的画面失真（原先的圆弧变成了椭圆弧）。

此外，当全屏切换事件（`fullscreenchange`）触发时，由于浏览器的全屏动画正在进行，若在事件触发的第一毫秒同步读取 `window.innerWidth`，往往只能获取到过渡前的旧数据，进一步加剧了全屏时的拉伸。

---

我将生成一个修复计划，通过让 **Buffer 尺寸始终与 CSS 显示尺寸 1:1 精确映射** 来根治此问题。

## [WIP] fix(web): 彻底修复全屏切换及窗口缩放时的画面拉伸变形

### 用户需求
修复当浏览器处于窗口化状态、点击进入全屏或在普通状态下缩放窗口时，画布轨迹发生异常拉伸变形的 Bug。

### 评论
Canvas 的 Buffer 像素尺寸必须始终和其实际渲染的 Display 尺寸保持一致，这是保证 Canvas 不变形的黄金定律。通过在尺寸变更时执行“延迟一帧”读取，我们能确保获取到浏览器重排版（Reflow）后最精确、最新的显示宽高数据。

### 目标
1. 在 `app.js` 中新增一个自适应函数 `resizeCanvas`，自动同步 Canvas Buffer 与实际 client/window 像素宽高。
2. 增加对浏览器窗口 `resize` 事件的监听，防止窗口化模式下拉伸。
3. 优化 `fullscreenchange` 的触发时机，使用 `requestAnimationFrame` 延迟一个渲染帧读取大小，避开全屏动画未完成时的旧布局数据。

### 基本原理
通过让 `canvas.width = canvas.clientWidth` 和 `canvas.height = canvas.clientHeight`，保证两者的宽高比绝对匹配。同时借助 `requestAnimationFrame` 把测算和重绘推迟到浏览器布局就绪之后，彻底消除时间差拉伸。

### 标签
#intent/fix #flow/ready #priority/high #comp/ui #scope/ux #ai/brainstorm #task/domain/ui #task/object/canvas-viewport #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 声明 Canvas 尺寸同步函数并进行初始化适配

在 `app.js` 的顶层定义全局 `canvas` 变量，并在页面初次加载时执行一次宽高同步，强制物理像素 1:1。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
let path = [];
let renderer;

// 动画状态
let isAnimating = false;
let isDraggingProgress = false;
let animProgress = 0; // 0.0 to 1.0
let lastAnimTime = 0;
let playbackSpeed = 1.0;
const BASE_ANIM_DURATION = 1500; // 每步滑行基准 1.5 秒

document.addEventListener("DOMContentLoaded", () => {
    renderer = new CanvasRenderer("skate-canvas");
    initChoreography();
    initInteraction();

    // 显式挂载动作方法至 window 作用域，确保完美支持 HTML 原生 inline onClick / onChange
    window.initChoreography = initChoreography;
~~~~~
~~~~~javascript.new
let path = [];
let renderer;
let canvas; // 缓存 canvas 实例以供尺寸自适应调整

// 动画状态
let isAnimating = false;
let isDraggingProgress = false;
let animProgress = 0; // 0.0 to 1.0
let lastAnimTime = 0;
let playbackSpeed = 1.0;
const BASE_ANIM_DURATION = 1500; // 每步滑行基准 1.5 秒

function resizeCanvas() {
    if (!canvas) return;
    if (document.fullscreenElement) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    } else {
        // 保证画布渲染分辨率 (像素 buffer) 始终与其在页面中的实际 CSS 显示尺寸 1:1 映射，彻底杜绝拉伸
        canvas.width = canvas.clientWidth || 600;
        canvas.height = canvas.clientHeight || 200;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    renderer = new CanvasRenderer("skate-canvas");
    canvas = renderer.canvas;
    resizeCanvas(); // 初始化画布尺寸
    initChoreography();
    initInteraction();

    // 显式挂载动作方法至 window 作用域，确保完美支持 HTML 原生 inline onClick / onChange
    window.initChoreography = initChoreography;
~~~~~

#### Acts 2: 重构全屏适配事件并增加窗口 Resize 动态自适应

重构 `initInteraction` 中的 `fullscreenchange` 事件，加入一帧延迟缓冲以解决测量时间差；同时新增 `resize` 事件监听，以便在用户拉伸浏览器窗口时，画布内部像素能够平滑自适应。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
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
~~~~~javascript.new
    document.addEventListener("fullscreenchange", () => {
        renderer.resetViewport();
        // 延迟一帧，等待浏览器全屏切换动效完成并重新测算布局，获取最精准的屏幕大小
        requestAnimationFrame(() => {
            resizeCanvas();
            drawPath();
        });
    });

    // 监听窗口尺寸变化，防止在窗口缩放时由于 CSS 100% 宽度拉伸画布
    window.addEventListener("resize", () => {
        if (!document.fullscreenElement) {
            resizeCanvas();
            drawPath();
        }
    });

    // 延时首帧绘制，确保 DOM 完全就绪、加载完毕
    setTimeout(() => {
        resizeCanvas();
        drawPath();
    }, 100);
}
~~~~~

### 下一步建议

1. 刷新浏览器页面以清空旧缓存。
2. 进行测试：从窗口化（即使窗口大小极窄极不规则）点击“全屏”进入全屏模式，圆弧轨迹在缩放至视口中心的同时应该保持完美的正圆，毫无任何左右或上下拉伸。
3. 退出全屏后，在窗口化状态下，尝试手动左右拖拽、放大、缩小浏览器窗口，观察轨迹是否能始终保持物理比例完美重构（而不是被横向挤压）。
