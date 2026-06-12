在前端代码 `web/js/app.js` 的 `updateLinearTimelineUI` 函数中，使用了一个过于简易的性能优化逻辑：仅通过比较 `container.dataset.lastCount == currentStepCount`（即前后总步数是否相同）来决定是否重新渲染底层物理时间轴。

当发生“导入”或“自动一键生成”时，如果生成的轨迹总步数正好与之前的总步数相等，但具体步骤的左右脚方向、用刃或动作已经改变，重绘过程就会被错误拦截，从而导致底部的进度条颜色和动作标签无法刷新。

我将生成一个优雅的修正计划，通过将“状态特征签名 (Signature)”引入比对缓存中，不仅保留了避免多余 DOM 重新渲染的性能优化，而且确保了任何滑行状态或动作发生改变时，进度条颜色和 Tooltip 标签等数据都能实时联动变化。

## [WIP] fix: 修复底色时间轴在步数相同时无法自适应刷新颜色的 Bug

### 错误分析

在 `web/js/app.js` 中，`updateLinearTimelineUI(geometry)` 函数负责在每次路径发生变化时更新底部的 1D 线性进度时间轴片段。为了避免频繁、重复的 DOM 销毁和创建，代码中引入了以下拦截策略：
```javascript
const currentStepCount = arcs.length;
if (container.dataset.lastCount == currentStepCount) return;
container.dataset.lastCount = currentStepCount;
```
这种简单的步数数量比较机制存在缺陷：
1. **歧义性**：当前后两套动作序列长度相同时，虽然 `currentStepCount` 完全一样，但其中的状态流向（例如从 `L` 左脚切换到 `R` 右脚，即滑轨颜色）和对应的滑冰动作（如 `stroke` 与 `bracket`）很可能已经完全不同。
2. **拦截表现**：由于轨迹总步数长度未发生改变，上述拦截逻辑会错误地将重绘流程直接 `return` 拦截。结果便是底部的进度条颜色、切分标记、以及悬浮提示 Tooltip 所绑定的元数据仍然停留在上一次的手动编排历史数据中，导致了“一键自动随机生成”或“导入”时进度条无法联动变换的故障。
3. **手动推荐分支表现正常的原因**：在手动编排时，每次点击新的分支都会使 `path` 的长度增加 1，这会触发 `currentStepCount` 递增，因此能够完美绕过拦截重绘。

### 用户需求
确保无论是通过“手动编排”、“回撤/撤销”、“一键自动生成路径”还是从 JSON 源代码进行“导入”等操作时，“❄️ 轨迹动态模拟”底部的进度条颜色、转体标记和悬浮 Tooltip 信息均能实时精准刷新，不存在误拦截或更新滞后的现象。

### 评论
这是一个至关重要的用户体验 (UX) 修复。通过优化状态变动检测机制，既确保了图形界面数据的准确呈现，又通过特征签名缓存保留了局部更新的性能优化，保证了极致流畅、灵敏的交互。

### 目标
1. 找出并修改 `web/js/app.js` 中 `updateLinearTimelineUI(geometry)` 的性能优化判断逻辑。
2. 使用“全轨迹状态+动作特征唯一签名 (Signature)”替代仅依靠“总步数计数 (Count)”的机制。
3. 确保任何导致轨迹路径变动的操作都可以瞬间触发进度条背景、动作分隔标记以及元数据的同步更新。

### 基本原理
我们将把每一段 `arc` 的滑行状态 (State) 连同对应的动作 ID 拼接成一个具有唯一性的“流向特征签名 (`signature`)”，例如 `LFO:stroke|RFI:forward_inside_three_turn`。在每次调用时，比较当前的签名与 DOM 绑定的旧签名 `container.dataset.lastSignature`。
只有在签名确实发生物理变动时才销毁和重建 DOM，这既 100% 避免了因步数相同产生的渲染拦截 Bug，又兼顾了最极致的界面防抖与 DOM 渲染性能。

### 标签
#intent/fix #flow/ready #priority/high #comp/docs #concept/ui #scope/ux #ai/brainstorm #task/domain/ui #task/object/timeline-progress #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 升级 app.js 中的线性时间轴重绘检测机制

我们将使用 `patch_file` 替换 `web/js/app.js` 中的检测方法，确保所有可能修改 path 内容的操作（一键生成、导入、手动编排、撤销）均能实时触发 UI 更新。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
    // 只有当路径步数发生变化时才重新渲染背景片段，优化性能
    const currentStepCount = arcs.length;
    if (container.dataset.lastCount == currentStepCount) return;
    container.dataset.lastCount = currentStepCount;

    container.innerHTML = "";
~~~~~
~~~~~javascript.new
    // 采用“状态流+动作特征唯一签名”来精准判断是否需要重新渲染，避免多余的 DOM 开销且防误拦截
    const signature = arcs.map(arc => `${arc.state}:${arc.move ? arc.move.id : ''}`).join("|");
    if (container.dataset.lastSignature === signature) return;
    container.dataset.lastSignature = signature;

    container.innerHTML = "";
~~~~~

### 下一步建议
- **回归测试**: 执行“一键规划路径”，更改不同的步数，然后再切换生成相同步数但不同起始状态的路径，观察底部的橙/蓝滑行色块以及标记图标是否会完全跟随轨迹同步变换。
- **导入测试**: 在“轨迹流源代码”文本框中贴入并导入一套与当前画布具有相同步数、但用刃截然不同的 JSON 数据，验证进度条和 Canvas 轨迹的刷新跟手度。
