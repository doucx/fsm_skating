### [COMMIT] feat(web): 冰面画布适配移动端触控单指平移与双指缩放

好的，我已经完成了针对全屏画布的移动端触控交互逻辑的修改。现在将此修改作为一个完整的逻辑单元进行提交。

---

### Script

#### Acts 1: 提交画布触控支持变更

将修改后的 `web/js/app.js` 添加到 Git 暂存区，并进行提交。

~~~~~act
git_add
web/js/app.js
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(web): add mobile touch gesture support for fullscreen canvas

- Implemented 'touchstart', 'touchmove', and 'touchend' event listeners in the CanvasRenderer.
- Enabled single-finger dragging for map panning.
- Enabled two-finger pinch-to-zoom for responsive canvas navigation on mobile devices.
- Added event-level 'preventDefault()' to ensure consistent gesture handling and prevent native scroll interference during interaction.

This ensures the skating choreography sandbox remains intuitive on mobile tablets and smartphones when in full-screen mode.
~~~~~

### 下一步建议
* **边缘平滑优化**：目前的缩放逻辑是基于线性比例的，后续可以考虑添加一个较小的 `friction` (摩擦力) 系数，使得缩放时的手感更加“柔顺”。
* **触控 UI 反馈**：在双指缩放时，可以增加一个临时的缩放比例指示符，帮助用户直观掌握当前的缩放等级。
