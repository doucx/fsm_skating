好的，我们已经完成了轨迹生成算法从正圆弧到欧拉螺线（数值积分）的重构。现在我将生成一个 `[COMMIT]` 计划，将这些物理仿真层面的增强功能正式提交。

## [COMMIT] feat(web): 引入基于数值积分的欧拉螺线滑行轨迹模拟

### 用户需求
优化滑行轨迹的真实感。将原本简化的正圆弧模型替换为更符合物理实际的欧拉螺线（Clothoid Spiral），模拟冰刀受力与摩擦导致的速度衰减及半径收敛。

### 评论
这是一次深度的几何逻辑重构。通过引入数值积分，我们不仅解决了轨迹视觉上的“收敛感”问题，还统一了系统内部对于位置、切向和进度的几何计算标准。这种方法比解析公式更具扩展性，能轻松支持未来更复杂的摩擦力模型。

### 目标
- 重构 `state.js`：将 `computeGeometry` 升级为基于数值积分的演化算法。
- 实现半径衰减逻辑：模拟滑跑过程中的物理收敛。
- 同步渲染层：使 `canvasRenderer.js` 支持线段集绘制及高精度切向箭头。
- 确保 UI 同步：更新时间轴进度计算以匹配积分后的轨迹长度。

### 基本原理
利用欧拉积分（Euler Integration）替代了原有的单次弧度推导。通过在每个极小积分步长中计算瞬时曲率（半径）并累加位置与切向角，系统自然地生成了 $G^1$ 连续的欧拉螺线。由于追踪球（Tracker）和时间轴（Timeline）均共享同一套 `getArcProgressInfo` 辅助函数，确保了物理模拟与视觉反馈的高度同步。

### 标签
#intent/refine #flow/ready #priority/high #comp/interfaces #concept/executor #scope/ux #ai/brainstorm #task/domain/physics-simulation #task/object/clothoid-spiral #task/action/numerical-integration #task/state/end

---

### Script

#### Acts 1: 提交轨迹仿真增强功能

~~~~~act
git_add
web/js/state.js
web/js/canvasRenderer.js
web/js/app.js
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
feat(web): implement Euler Spiral trajectory simulation via numerical integration

Introduced a more physically accurate trajectory generation model to replace the simplified circular arcs.

Key enhancements:
- Geometry: Rewrote 'computeGeometry' to use numerical integration (Euler method) for evolving the path, enabling smooth radius decay (Clothoid Spiral) that mimics ice friction and centripetal force effects.
- Rendering: Updated 'CanvasRenderer' to draw paths as line segment sets, ensuring visual smoothness and accurate tangential arrow positioning.
- Synchronization: Unified the tracker and timeline logic using a new high-precision progress interpolation helper ('getArcProgressInfo').

This refinement significantly improves the visual "weight" and realism of the skating paths while maintaining perfect G1 continuity between moves.
~~~~~

### 下一步建议
- **差异化衰减**: 可以根据动作类型（例如转三步 vs 标准蹬冰）配置不同的衰减系数，以模拟不同技术动作对速度的影响。
- **性能分析**: 确认在极长序列下，数值积分（每步 40 次迭代）对前端渲染帧率的影响，若有压力可引入 Web Worker 或 R-Tree 空间索引。
