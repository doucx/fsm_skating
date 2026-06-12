好的，我们已经圆满完成了这一阶段的“播放器化”交互功能开发。现在的沙盒已经具备了动态模拟、物理时间轴、精细化状态面板以及完整的快捷键支持，从一个静态编排工具进化为了一个动态分析模拟器。

我将生成一个 `[COMMIT]` 计划，将这些前端 UI 与交互引擎的重大更新打包提交。

## [COMMIT] feat(web): 实现轨迹动态模拟、语义化时间轴与交互控制引擎

### 用户需求
将近期完成的轨迹追踪小球、动画播放/暂停控制、倍速切换、物理进度条、实时 HUD 看板以及相关的 UI 样式更新提交到版本库。

### 评论
这是一次显著提升用户体验 (UX) 的重构。通过引入时间维度的模拟，用户不仅能看到静态轨迹，还能感知滑行的节奏和步法转体的瞬间，极大地增强了工具在教学与分析场景下的价值。

### 目标
1.  将 Web 前端的所有变更（CSS, HTML, JS）添加到暂存区。
2.  创建一个详尽的 Git 提交，记录功能的演进。

### 基本原理
按照 Quipu 协议要求，在确认功能开发阶段完成后，通过独立的提交计划将文件系统变更持久化到 Git 历史中。

### 标签
#intent/build #flow/ready #priority/high #comp/web #concept/ui #concept/executor #scope/ux #ai/instruct #task/domain/ui #task/object/animation-tracker #task/action/implementation #task/state/end #task/status/completed

---

### Script

#### Acts 1: 提交 Web 前端交互增强功能

我们将把所有涉及动画、样式、HUD 和交互逻辑的文件统一提交。

~~~~~act
git_add
web/index.html
web/css/style.css
web/js/app.js
web/js/canvasRenderer.js
web/js/uiController.js
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(web): implement interactive trajectory simulation and semantic timeline

This commit introduces a comprehensive suite of animation and interaction features:
1. Dynamic Tracker: A synchronized "ice crystal" ball that follows the physical arc paths.
2. Playback Control: Start/pause/restart logic with 0.5x/1.0x speed switching.
3. Semantic Timeline: A linearized progress bar that visualizes trajectory segments (L/R foot colors) and move markers.
4. Real-time HUD: A refactored dashboard showing the move flow (Previous -> Current State -> Next).
5. Interaction: Fullscreen HUD controls, interactive progress dragging, and keyboard shortcuts (Space/F).
6. UI Refinement: Upgraded the visual trail with orange LED-style action nodes for better readability.
~~~~~

### 下一步建议
- **数据持久化**：现在可以考虑增加“保存到本地”功能，将编排好的 JSON 序列存储在浏览器的 `localStorage` 中，防止刷新丢失。
- **3D 投影实验**：目前的 2D 视角虽然清晰，但花样滑冰有很强的空间感。未来可以尝试引入 `Three.js` 进行 3D 视角的初步探索。
- **性能审计**：随着 Canvas 绘制内容的增多，可以对 `computeGeometry` 进行 Memoization 优化，确保在超长路径下依然保持 60FPS。
