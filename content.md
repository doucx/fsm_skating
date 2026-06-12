好的，我们已经圆满完成了 2D 轨迹系统的全方位升级，包括引入 ISU 专业视觉规范、解决缩放同步 Bug，以及实现以鼠标为中心的高级交互手势。现在我将这些变更作为一个完整的逻辑单元提交到代码库。

## [COMMIT] feat(web): 升级 2D 轨迹视觉至 ISU 标准并引入交互式缩放平移

### 用户需求
完成对花样滑冰编排系统 Web 端的交互与视觉重构，并提交所有相关变更。

### 评论
这是一次从“功能原型”向“专业级工具”的跨越。通过引入国际滑联（ISU）的图形标准，系统不仅在视觉上更加美观，更具备了极高的专业参考价值。同时，复杂的缩放与平移交互为用户提供了探索大型编排细节的能力。

### 目标
1.  将 `web/` 目录下的修改（HTML、CSS、JS）持久化到 Git 历史。
2.  确保提交记录清晰描述了 ISU 标准规范、缩放 Bug 修复以及交互手势的改进。

### 基本原理
按照 Quipu 的工作流规范，在所有文件系统修改完成并验证通过后，通过独立的 `[COMMIT]` 计划执行 `git_add` 和 `git_commit`。这保证了代码库历史的整洁性和可追溯性。

### 标签
#intent/build #flow/ready #priority/medium #comp/interfaces #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/pro-trajectory #task/action/implementation #task/state/end #task/status/completed

---

### Script

#### Acts 1: 提交 Web 界面交互与视觉升级

我们将暂存修改后的 Web 源文件，并创建一个详尽的提交记录。

~~~~~act
git_add
web/index.html
web/css/style.css
web/js/app.js
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(web): upgrade 2D trajectory to ISU standards and implement interactive zoom/pan

Comprehensive upgrade of the choreography visualization system:

1. Visual Identity (ISU Standards):
   - Color coding for footwork: Blue for Left, Orange for Right.
   - Line style for directionality: Solid for Forward, Dashed for Backward.
   - Vector rendering of professional ISU symbols for Three-Turn, Bracket, and Mohawk.
   - Directional arrows synced with foot color and tangent slope.

2. Interactive Sandbox:
   - Fullscreen mode support with high-resolution buffer re-adjustment.
   - Zoom-at-mouse logic for precision inspection of complex paths.
   - Drag-to-pan functionality in fullscreen mode.
   - Removed conflicting click-to-exit-fullscreen on canvas to prioritize panning.

3. Graphical Integrity:
   - Fixed scaling bugs where arc radii and labels didn't sync with zoom.
   - Implemented dynamic scaling for line widths, dash gaps, fonts, and ISU symbols.
   - Included move names in the trajectory flow trail for better feedback.
~~~~~

### 下一步建议
- **后端同步**: 随着前端视觉能力的增强，可以考虑在 `moves_config.yaml` 中为动作添加更多物理属性（如弧度、倾刃深度），以便前端绘制出更真实的非圆曲线。
- **导出功能**: 增加一个“导出为图片”的按钮，允许用户将生成的专业轨迹图保存为 PNG 或 SVG，方便分享给教练或队友。
