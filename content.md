好的，我们已经完成了代码的重构工作。通过提取通用的后端工厂方法、终端报告函数以及前端视口变换生成器，系统架构变得更加简洁且易于维护。

现在，我将生成一个 `[COMMIT]` 计划，将这些更改提交到版本库中。

## [COMMIT] refactor: eliminate redundant logic in engine, CLI, and web renderer (DRY)

### 用户需求
完成对系统中 DRY (Don't Repeat Yourself) 问题的清理并提交代码。

### 评论
这次重构不仅减少了代码行数，更重要的是将动力学逻辑（绝对旋转推导）和渲染逻辑（视口变换计算）集中到了它们应有的自治领域内。这极大地降低了未来调整数学模型时出现不一致风险的可能性。

### 目标
1. 将修改后的后端引擎、CLI 脚本及前端 JS 文件添加到 Git 暂存区。
2. 创建一个清晰、详尽的提交记录，描述重构的范围和收益。

### 基本原理
遵循“职责自治”原则，将原本分散在多处的硬编码公式提取为对象内部的私有方法。这使得核心算法具有了单一事实来源（SSOT）。

### 标签
#intent/refine #flow/ready #priority/medium #comp/engine #comp/cli #comp/runtime #concept/ui #scope/dx #ai/instruct #task/domain/refactoring #task/object/dry-logic #task/action/commit #task/state/end

---

### Script

#### Acts 1: 提交重构代码

我们将所有涉及 DRY 重构的文件添加到暂存区并执行提交。

~~~~~act
git_add
src/fsm_skating/services/engine.py
src/fsm_skating/cli/main.py
web/js/canvasRenderer.js
web/js/app.js
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
refactor: eliminate redundant logic across engine, CLI, and web (DRY)

This commit addresses several DRY (Don't Repeat Yourself) issues identified during code audit:

1. Backend (Engine): Extracted `_build_move` factory method to unify the assembly of Move objects and the derivation of absolute rotation directions (CW/CCW). This replaces identical logic previously duplicated in three different verification and transition methods.

2. CLI: Introduced `print_rotation_diversity_report` to standardize the formatting and output of ISU-specific symmetry analysis, ensuring consistency between manual choreography exports and sequence verifications.

3. Web Renderer: Encapsulated viewport transformation logic within `CanvasRenderer.getTransform`. This generator-style method removes redundant bounding box and scale calculations from both the main `draw` loop and the animation tracker, simplifying the interaction layer in `app.js`.

These changes improve maintainability by establishing a Single Source of Truth for core mathematical and projection formulas.
~~~~~

### 下一步建议
- **回归测试**: 建议运行 `pytest` 以验证所有复杂的步法验证链路依然准确无误。
- **UI 走查**: 在浏览器中测试动画播放器，确保 `getTransform` 的提取未影响全屏模式下的缩放与平移行为。
