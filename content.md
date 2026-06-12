你的判断非常敏锐且正确。

在花样滑冰轨迹这个特定的轻量级场景下（一条编排路线通常在 5 至 20 步之间，极少超过 100 步），每次清空并重建这几个 DOM 节点在 CPU 开销上是微乎其微的（甚至低于 0.1 毫秒）。
然而，原本引入优化的根本原因在于：**动画高频重绘。** 
当回放动画开启时，`animationLoop` 频繁被触发，每帧都在清空画布、并重新调用 `drawPath`。如果在 `drawPath` 中去重新清空和拼接底层 DOM（虽然只有几个），那么在每秒 60 帧的高频回放中就会产生无意义的垃圾回收与 DOM 渲染损耗。

**但是，重构不应该在 DOM 层使用不可靠的缓存，而应该彻底解除高频 Canvas 动画重绘对 DOM 时间轴更新的耦合。**
因为，在动画播放过程中，路径数据本身根本没有改变！时间轴背景段也完全无需做任何更新，仅仅需要高效率地改变 Canvas 上的追踪球位置以及 `anim-progress-bar` 的宽度（这一层是由 CSS 直接修改 width 属性处理的，几乎无开销）。

我将生成一个新的计划，采用这一更彻底、更具伸缩性的重构方案。

## [WIP] refactor(web): 重构渲染流程并移除时间轴不必要的 DOM 优化拦截

### 错误分析

**错误原因**: 
之前的性能优化虽然是为了防止动画高频回放时导致 DOM 重构开销，但是它直接侵入在 `updateLinearTimelineUI` 的内部（依赖不安全的 `lastCount` 数据字段做过滤）。这导致在通过 API、一键规划、或是外部导入导致轨迹改变（但长度与之前相同时），重绘机制被错误的拦截了。

**更好的解决方案**:
1. **彻底拆除 DOM 优化阻拦**：在 `updateLinearTimelineUI` 内部去掉不可靠的 `lastCount` 或任何基于指纹的比对。任何时候调用该函数，都将 100% 刷新和重建 DOM。
2. **重构 `drawPath()` 方法的刷新粒度**：允许在 `drawPath` 时指定一个标志位：`drawPath(updateTimeline = false)`。
3. **分流高频动画重绘与 DOM 重构**：
   * Canvas 每帧动画的调用，或是交互拖拽/平移 Canvas 时，调用默认的 `drawPath()`（不触发 DOM 重写）。
   * 凡是涉及修改物理路径结构的操作（例如“初始化编排”、“手动添加路径”、“点击回撤”、“API一键规划生成”、“轨迹文本导入”），均显式调用 `drawPath(true)`，100% 重新生成底层 DOM 时间轴。

### 用户需求

彻底移除多余的缓存优化逻辑，解决“自动规划”和“导入”场景（同等步长时）时间轴色块及 Tooltip 状态无法刷新的 Bug，同时保证动画播放时不会发生高频 DOM 重建操作。

### 评论

这个重构把视图驱动的底层逻辑理顺了。不应该在细枝末节的叶子节点函数上使用“过早优化”，而是应该在事件流的入口层就区分开“高频动画 Canvas 重绘”与“低频路径结构 DOM 更新”。

### 目标

1. 清理 `updateLinearTimelineUI` 内部缓存拦截代码。
2. 重构 `drawPath` 函数定义，使其支持一个可选参数 `updateTimeline`。
3. 在 `web/js/app.js` 各处改变 `path` 结构的操作中，将 `drawPath()` 调用替换为 `drawPath(true)`。

### 基本原理

通过剥离 `animationLoop` 产生的静态路径高频 Canvas 清理对 DOM 渲染管线的无谓调用，我们达到了比之前局部缓存更强大的系统级性能。没有了动画重绘负担后，DOM 时间轴可以在路径改变时进行无条件的刷新，从而 100% 保证了呈现的数据准确性。

### 标签

#intent/refine #flow/ready #priority/high #comp/ui #scope/ux #scope/dx #ai/brainstorm #task/domain/ui #task/object/timeline-progress #task/action/refactor #task/state/begin

---

### Script

#### Acts 1: 去除 `updateLinearTimelineUI` 内的优化拦截 & 改造 `drawPath` 传参

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
function drawPath() {
    const geometry = computeGeometry(path);
    renderer.draw(geometry);
    
    // 渲染底层物理时间轴
    updateLinearTimelineUI(geometry);
    
    if (isAnimating || animProgress > 0 || isDraggingProgress) {
        renderAnimationStep(geometry);
    }
}

/**
 * 将 2D 轨迹投影到 1D 进度条上
 */
function updateLinearTimelineUI(geometry) {
    const { arcs } = geometry;
    const container = document.getElementById("timeline-segments");
    if (!arcs || arcs.length === 0) {
        container.innerHTML = "";
        return;
    }

    // 只有当路径步数发生变化时才重新渲染背景片段，优化性能
    const currentStepCount = arcs.length;
    if (container.dataset.lastCount == currentStepCount) return;
    container.dataset.lastCount = currentStepCount;

    container.innerHTML = "";
    const totalLength = arcs.reduce((acc, arc) => acc + (arc.R * Math.abs(arc.endAngle - arc.startAngle)), 0);
~~~~~
~~~~~javascript.new
function drawPath(updateTimeline = false) {
    const geometry = computeGeometry(path);
    renderer.draw(geometry);
    
    if (updateTimeline) {
        updateLinearTimelineUI(geometry);
    }
    
    if (isAnimating || animProgress > 0 || isDraggingProgress) {
        renderAnimationStep(geometry);
    }
}

/**
 * 将 2D 轨迹投影到 1D 进度条上
 */
function updateLinearTimelineUI(geometry) {
    const { arcs } = geometry;
    const container = document.getElementById("timeline-segments");
    if (!arcs || arcs.length === 0) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML = "";
    const totalLength = arcs.reduce((acc, arc) => acc + (arc.R * Math.abs(arc.endAngle - arc.startAngle)), 0);
~~~~~

#### Acts 2: 对路径生命周期改变的核心步骤，显式开启时间轴重写

我们将修改 `app.js` 里所有主动更改 `path` 拓扑结构的物理交互函数，使它们重新构造 Canvas 轨迹的同时也强行重构 DOM 时间轴。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
function initChoreography() {
    const startState = document.getElementById("start-state-select").value;
    path = [{ state: startState, move: null }];
    ui.updateCurrStateUI(startState);
    fetchNextTransitions();
    ui.updateStats(path, undoMove);
    drawPath(); // 保证起始滑跑状态建立时，第一段滑行弧线就被立即绘制出来
    updateTrajectorySourceUI();
}
~~~~~
~~~~~javascript.new
function initChoreography() {
    const startState = document.getElementById("start-state-select").value;
    path = [{ state: startState, move: null }];
    ui.updateCurrStateUI(startState);
    fetchNextTransitions();
    ui.updateStats(path, undoMove);
    drawPath(true); // 保证起始滑跑状态建立时，第一段滑行弧线就被立即绘制出来，并强制初始化 DOM 时间轴
    updateTrajectorySourceUI();
}
~~~~~

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
function chooseNextMove(nextStateObj, moveObj) {
    path[path.length - 1].move = moveObj;
    const nextStateStr = `${nextStateObj.foot}${nextStateObj.direction}${nextStateObj.edge}`;
    path.push({ state: nextStateStr, move: null });

    ui.updateCurrStateUI(nextStateStr);
    fetchNextTransitions();
    ui.updateStats(path, undoMove);
    drawPath();
    updateTrajectorySourceUI();
}
~~~~~
~~~~~javascript.new
function chooseNextMove(nextStateObj, moveObj) {
    path[path.length - 1].move = moveObj;
    const nextStateStr = `${nextStateObj.foot}${nextStateObj.direction}${nextStateObj.edge}`;
    path.push({ state: nextStateStr, move: null });

    ui.updateCurrStateUI(nextStateStr);
    fetchNextTransitions();
    ui.updateStats(path, undoMove);
    drawPath(true);
    updateTrajectorySourceUI();
}
~~~~~

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
function undoMove() {
    if (path.length <= 1) return;
    path.pop();
    path[path.length - 1].move = null;
    const prevState = path[path.length - 1].state;
    ui.updateCurrStateUI(prevState);
    fetchNextTransitions();
    ui.updateStats(path, undoMove);
    drawPath();
    updateTrajectorySourceUI();
}
~~~~~
~~~~~javascript.new
function undoMove() {
    if (path.length <= 1) return;
    path.pop();
    path[path.length - 1].move = null;
    const prevState = path[path.length - 1].state;
    ui.updateCurrStateUI(prevState);
    fetchNextTransitions();
    ui.updateStats(path, undoMove);
    drawPath(true);
    updateTrajectorySourceUI();
}
~~~~~

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
function loadVerifiedPathToCanvas() {
    if (!window.verifiedPathData || !window.verifiedInitialState) return;
    path = [{ state: window.verifiedInitialState, move: null }];
    window.verifiedPathData.forEach(step => {
        path[path.length - 1].move = step.move;
        path.push({ state: step.state, move: null });
    });
    ui.updateCurrStateUI(path[path.length - 1].state);
    fetchNextTransitions();
    ui.updateStats(path, undoMove);
    drawPath();
    updateTrajectorySourceUI();
}
~~~~~
~~~~~javascript.new
function loadVerifiedPathToCanvas() {
    if (!window.verifiedPathData || !window.verifiedInitialState) return;
    path = [{ state: window.verifiedInitialState, move: null }];
    window.verifiedPathData.forEach(step => {
        path[path.length - 1].move = step.move;
        path.push({ state: step.state, move: null });
    });
    ui.updateCurrStateUI(path[path.length - 1].state);
    fetchNextTransitions();
    ui.updateStats(path, undoMove);
    drawPath(true);
    updateTrajectorySourceUI();
}
~~~~~

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
async function generateSequence() {
    const steps = document.getElementById("gen-steps").value;
    const maxDiff = document.getElementById("gen-diff").value;
    const selectState = document.getElementById("start-state-select").value;

    try {
        const data = await api.generateSequence(parseInt(steps), parseInt(maxDiff), selectState);
        path = [];
        data.forEach((step) => {
            const stateStr = `${step.state.foot}${step.state.direction}${step.state.edge}`;
            path.push({
                state: stateStr,
                move: step.move
            });
        });

        const lastState = path[path.length - 1].state;
        ui.updateCurrStateUI(lastState);
        fetchNextTransitions();
        ui.updateStats(path, undoMove);
        drawPath();
        updateTrajectorySourceUI();
    } catch (err) {
~~~~~
~~~~~javascript.new
async function generateSequence() {
    const steps = document.getElementById("gen-steps").value;
    const maxDiff = document.getElementById("gen-diff").value;
    const selectState = document.getElementById("start-state-select").value;

    try {
        const data = await api.generateSequence(parseInt(steps), parseInt(maxDiff), selectState);
        path = [];
        data.forEach((step) => {
            const stateStr = `${step.state.foot}${step.state.direction}${step.state.edge}`;
            path.push({
                state: stateStr,
                move: step.move
            });
        });

        const lastState = path[path.length - 1].state;
        ui.updateCurrStateUI(lastState);
        fetchNextTransitions();
        ui.updateStats(path, undoMove);
        drawPath(true);
        updateTrajectorySourceUI();
    } catch (err) {
~~~~~

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
        if (statesList.length === 1) {
            const startState = statesList[0];
            path = [{ state: startState, move: null }];
            ui.updateCurrStateUI(startState);
            fetchNextTransitions();
            ui.updateStats(path, undoMove);
            drawPath();
            updateTrajectorySourceUI();
            return;
        }

        const sequence = statesList.join(" -> ");
        const data = await api.verifySequence(sequence);
        if (!data.valid) {
            alert(`导入失败，动力学合规校验未通过：\n${data.error}`);
            return;
        }

        const newPath = [];
        for (let i = 0; i < data.transitions.length; i++) {
            const t = data.transitions[i];
            const expectedMoveId = jsonData[i] ? jsonData[i].move_id : null;
            
            let matchedMove = t.candidate_moves.find(m => m.id === expectedMoveId);
            if (!matchedMove) {
                matchedMove = t.selected_move;
            }

            const fromStateStr = `${t.from_state.foot}${t.from_state.direction}${t.from_state.edge}`;
            newPath.push({
                state: fromStateStr,
                move: matchedMove
            });
        }

        const lastT = data.transitions[data.transitions.length - 1];
        const lastStateStr = `${lastT.to_state.foot}${lastT.to_state.direction}${lastT.to_state.edge}`;
        newPath.push({
            state: lastStateStr,
            move: null
        });

        path = newPath;
        ui.updateCurrStateUI(path[path.length - 1].state);
        fetchNextTransitions();
        ui.updateStats(path, undoMove);
        drawPath();
        updateTrajectorySourceUI();
~~~~~
~~~~~javascript.new
        if (statesList.length === 1) {
            const startState = statesList[0];
            path = [{ state: startState, move: null }];
            ui.updateCurrStateUI(startState);
            fetchNextTransitions();
            ui.updateStats(path, undoMove);
            drawPath(true);
            updateTrajectorySourceUI();
            return;
        }

        const sequence = statesList.join(" -> ");
        const data = await api.verifySequence(sequence);
        if (!data.valid) {
            alert(`导入失败，动力学合规校验未通过：\n${data.error}`);
            return;
        }

        const newPath = [];
        for (let i = 0; i < data.transitions.length; i++) {
            const t = data.transitions[i];
            const expectedMoveId = jsonData[i] ? jsonData[i].move_id : null;
            
            let matchedMove = t.candidate_moves.find(m => m.id === expectedMoveId);
            if (!matchedMove) {
                matchedMove = t.selected_move;
            }

            const fromStateStr = `${t.from_state.foot}${t.from_state.direction}${t.from_state.edge}`;
            newPath.push({
                state: fromStateStr,
                move: matchedMove
            });
        }

        const lastT = data.transitions[data.transitions.length - 1];
        const lastStateStr = `${lastT.to_state.foot}${lastT.to_state.direction}${lastT.to_state.edge}`;
        newPath.push({
            state: lastStateStr,
            move: null
        });

        path = newPath;
        ui.updateCurrStateUI(path[path.length - 1].state);
        fetchNextTransitions();
        ui.updateStats(path, undoMove);
        drawPath(true);
        updateTrajectorySourceUI();
~~~~~

### 下一步建议

在上述重构补丁执行完成后：
1. 刷新浏览器页面（清除缓存，保证修改生效）。
2. 在“一键随机生成路径”（保持生成步数例如 6 步不变）以及使用 JSON 导入等长轨迹时，由于这些模块中现在都在执行 `drawPath(true)`，因此时间轴的 DOM 都会被无条件且准确地重新构建。
3. 检查即使在新旧序列步长完全相同时，底部的色块和 Tooltip 标签也已可以被实时更新。
4. 开启“回放”，在动画进行时，由于使用的是每帧默认 `drawPath()`（即 `updateTimeline = false`），它会完美跳过对时间轴 DOM 重绘过程，保证动画帧率（FPS）最大化。
