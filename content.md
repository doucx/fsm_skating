好的，我们已经完成了前端架构的模块化重构、渲染模型的物理对齐以及坐标系反转的修复。现在是时候将这些改进作为一个完整的逻辑单元提交了。

我将生成一个 `[COMMIT]` 计划，包含 `git add` 和 `git commit` 指令。

## [COMMIT] refactor(web): implement ES6 module architecture and state-on-arc rendering model

### 用户需求
将前端代码重构为 ES6 模块化结构，并实现更符合直觉的“用刃在弧线、动点在节点”的滑冰动力学渲染模型，修复轨迹方向反转问题。

### 评论
此次重构不仅大幅提升了前端代码的可维护性和开发者体验（DX），而且通过对物理模型的重新映射，使系统的视觉表达达到了专业步法编排的高度。纠正坐标系偏差后，冰面轨迹的实时渲染现在具有极高的物理参考价值。

### 目标
1.  将原本臃肿的 `app.js` 拆分为 `api.js` (通信)、`state.js` (物理计算)、`canvasRenderer.js` (渲染引擎) 和 `uiController.js` (界面交互)。
2.  更新渲染逻辑：将滑行状态（State）标注在轨迹弧线上，将步法动作（Move）标注在转换节点上。
3.  纠正 Canvas Y 轴向下导致的圆弧弯曲方向及起始状态渲染的数学错误。

### 基本原理
通过采用原生 ES Modules，我们在无需外部构建工具的情况下实现了职责分离。在渲染层，通过修正圆心偏置和张角旋转的极坐标公式，消除了 $y$-down 坐标系对物理 CCW/CW 属性的干扰。

### 标签
#intent/refine #flow/ready #priority/high 
#comp/interfaces #concept/ui #scope/dx #scope/ux 
#ai/delegate
#task/domain/ui #task/object/module-refactor-and-rendering-model #task/action/refactor-and-fix
#task/state/end #task/status/completed

---

### Script

#### Acts 1: 添加更改到暂存区

我们将所有新建的 JS 模块文件以及修改后的 `index.html` 添加到 Git 暂存区。

~~~~~act
git_add
web/index.html
web/js/api.js
web/js/state.js
web/js/canvasRenderer.js
web/js/uiController.js
web/js/app.js
~~~~~

#### Acts 2: 提交变更

创建一个详尽的提交记录，描述本次重构的核心改进。

~~~~~act
git_commit
~~~~~
~~~~~text
refactor(web): implement ES6 module architecture and state-on-arc rendering model

- Refactored the monolithic 'app.js' into a modular architecture:
    - 'api.js': Encapsulates backend REST communication.
    - 'state.js': Handles pure physical geometry and topology calculations.
    - 'canvasRenderer.js': Manages 2D rendering, ISU symbols, and gestures.
    - 'uiController.js': Isolates DOM manipulation and UI logic.
- Implemented "Nodes are Moves, Arcs are States" rendering logic:
    - Glide states (LFO, etc.) are now correctly displayed as labels along continuous arcs.
    - Step transitions (Three-Turns, Brackets, etc.) are marked at intersection nodes.
- Fixed physics and coordinate system bugs:
    - Corrected arc curvature inversion caused by Canvas Y-down coordinate system.
    - Fixed initial state rendering to ensure the first arc appears upon load.
    - Improved reset logic to clear viewport matrices and restart pathing.
~~~~~

### 下一步建议
- **后端扩展**：鉴于前端已经具备了专业的 ISU 符号渲染能力，下一步可以扩展后端 `moves_config.yaml` 动作库，增加更多复杂的步法（如 Twizzles, Loops）以及详细的定级描述。
- **持久化功能**：可以考虑增加“导出为图片”或“保存编排到本地/云端”的功能，将编排好的轨迹图谱永久留存。
