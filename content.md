完全同意你的分析。你精准地找出了导致时间轴未能刷新的原因：简易的性能优化逻辑仅将“步数”作为缓存键，没有考虑到相同步数下状态序列可能发生的改变。

我将生成一个包含修改该缓存逻辑补丁的修复计划。将使用序列状态合并后的指纹字符串作为是否重绘进度条片段的判定依据。

## [WIP] fix: 修复时间轴进度条在等长轨迹下未能刷新的问题

### 错误分析

**错误原因**: 
在 `web/js/app.js` 的 `updateLinearTimelineUI` 函数中，对 DOM 的重绘使用了一种基于轨迹步数 (`arcs.length`) 的缓存机制。其代码通过判断当前步数与上一次存储的步数是否相等来决定是否拦截渲染逻辑。在“自动一键规划路径”和“导入”操作下，如果生成的/导入的新轨迹长度正好与原来的相等，就会因为缓存拦截导致背景颜色的片段没有被重新生成，也就不会更新左/右脚状态颜色映射以及其对应的 Tooltip 信息。

**解决方案**:
不再仅仅依赖于长度。通过 `arcs.map(a => a.state).join('-')` 生成一个表征当前动作状态流的唯一签名 (Signature)，如果状态改变（比如 `LFO` 变成了 `RBO`），签名就会改变，确保重绘机制被正确触发，同时又保留了性能优化的初衷。

### 用户需求

修复“轨迹动态模拟”模块底层的时间轴片段颜色和对应的状态在“自动规划”和“导入”场景（当总步数不变时）不会跟随新轨迹刷新的 Bug。

### 评论

这是一个典型的细微 UI 缓存更新漏洞，将步长作为唯一标识在动态组合生成的复杂系统下显然是不够严谨的。引入基于序列具体状态的联合签名机制，能够在性能优化和准确的响应之间做到优雅平衡。

### 目标

1. 定位 `web/js/app.js` 中的 `updateLinearTimelineUI` 函数。
2. 将基于 `arcs.length` 判等的判断逻辑，替换为基于整个 `arcs` 中 `state` 的联合签名（如 `LFO-RFI-LBI`）的判断逻辑。

### 基本原理

通过 `Array.prototype.map` 将时间轴数组中的所有状态码提取出来，并合并为一个字符串（指纹）。当组件收到新的数据时，首先比对前后两者的状态指纹，若不同，才进行 DOM 清理和重建操作，确保视图和数据的实时同步，消除残留状态显示。

### 标签

#intent/fix #flow/ready #priority/high #comp/ui #scope/ux #ai/instruct #task/domain/ui #task/object/timeline-progress #task/action/fix #task/state/begin

---

### Script

#### Acts 1: 修正渲染函数的缓存判定机制

修改 `web/js/app.js`，将原本依赖 `currentStepCount` 判断的性能优化逻辑升级为对 `currentSignature` 指纹的判断。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
    if (!arcs || arcs.length === 0) {
        container.innerHTML = "";
        return;
    }

    // 只有当路径步数发生变化时才重新渲染背景片段，优化性能
    const currentStepCount = arcs.length;
    if (container.dataset.lastCount == currentStepCount) return;
    container.dataset.lastCount = currentStepCount;

    container.innerHTML = "";
~~~~~
~~~~~javascript.new
    if (!arcs || arcs.length === 0) {
        container.innerHTML = "";
        return;
    }

    // 只有当路径状态序列发生变化时才重新渲染背景片段，优化性能
    const currentSignature = arcs.map(a => a.state).join('-');
    if (container.dataset.lastSignature === currentSignature) return;
    container.dataset.lastSignature = currentSignature;

    container.innerHTML = "";
~~~~~

### 下一步建议

在代码替换执行完成后，可以在浏览器中刷新页面：
1. 手动生成一个包含 5 步的序列。
2. 使用“自动一键规划路径”生成一个也是 5 步的全新序列。
3. 检查底部的指示条颜色和 hover 弹出的提示是否已正确切换并匹配新轨迹。
如果一切正常，可以通过创建一个新计划以提交 (commit) 这个变更。
