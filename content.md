您的观察非常敏锐。

在 `web/js/app.js` 中，那三行代码在多个不同的事件处理与生命周期函数中被完全重复地调用，这的确属于经典的 DRY (Don't Repeat Yourself) 冗余设计。
为了解决这个问题，我将为您设计并执行一个重构方案，将这三行高频重复的代码统一抽取为一个辅助函数 `syncChoreographyUI()`。这不仅可以消除代码重复、减少文件行数，也使得未来对 UI 同步逻辑的修改和维护变得更为简单。

## [WIP] refactor: 消除 web/js/app.js 中重复的 UI 同步逻辑

### 用户需求
识别并消除在 `web/js/app.js` 中多处重复调用的三行 UI 同步代码，以提高代码库的可维护性和整洁度。

### 评论
这是一个对代码库质量非常有益的重构建议。在手动编排、撤销、验证路径载入、生成和导入逻辑中，都出现了这三行相同的调用。这种重复不仅显得臃肿，而且一旦未来需要扩展状态更新步骤（例如加入日志、保存草稿），就需要修改所有这些分布的位置，极易引入不一致的问题。重构后，所有的状态同步调用都将收拢到单一函数。

### 目标
1. 在 `web/js/app.js` 中定义一个公共的辅助同步函数 `syncChoreographyUI`，封装以下三步调用：
   - `ui.updateStats(path, undoMove);`
   - `drawPath(true);`
   - `updateTrajectorySourceUI();`
2. 替换文件中共计 7 处冗余的重复代码段。
3. 确保功能不发生任何倒退，依然维持页面加载、编排、回滚、导入导出时的逻辑完全正确。

### 基本原理
由于此重构不涉及物理模型逻辑改变，仅影响前端界面的刷新触发，将该公共部分抽取为 `syncChoreographyUI` 是最直接有效的方法。通过局部精确替换 (Patch) 的方式对 `web/js/app.js` 进行修改。

### 标签
#intent/refine #flow/ready #priority/medium #concept/ui #scope/dx #ai/refine
#task/domain/ui
#task/object/ui-choreography-sync
#task/action/refactor
#task/state/begin
#task/status/active

---

### Script

#### Acts 1: 定义并注册辅助同步函数

在 `updateTrajectorySourceUI` 之后声明并定义公共方法 `syncChoreographyUI`。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
function updateTrajectorySourceUI() {
    const sourceData = path.map(step => ({
        state: step.state,
        move_id: step.move ? step.move.id : null
    }));
    document.getElementById("trajectory-source").value = JSON.stringify(sourceData);
}
~~~~~
~~~~~javascript.new
function updateTrajectorySourceUI() {
    const sourceData = path.map(step => ({
        state: step.state,
        move_id: step.move ? step.move.id : null
    }));
    document.getElementById("trajectory-source").value = JSON.stringify(sourceData);
}

function syncChoreographyUI() {
    ui.updateStats(path, undoMove);
    drawPath(true);
    updateTrajectorySourceUI();
}
~~~~~

#### Acts 2: 替换 `initChoreography` 中的重复代码

替换手动编排初始化处的冗余代码。

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
    drawPath(true); // 保证起始滑跑状态建立时，第一段滑行弧线就被立即绘制出来，并强制初始化 DOM 时间轴
    updateTrajectorySourceUI();
}
~~~~~
~~~~~javascript.new
function initChoreography() {
    const startState = document.getElementById("start-state-select").value;
    path = [{ state: startState, move: null }];
    ui.updateCurrStateUI(startState);
    fetchNextTransitions();
    syncChoreographyUI();
}
~~~~~

#### Acts 3: 替换 `chooseNextMove` 中的重复代码

替换推荐选择分支处理处的冗余代码。

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
    drawPath(true);
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
    syncChoreographyUI();
}
~~~~~

#### Acts 4: 替换 `undoMove` 中的重复代码

替换回滚动作处理处的冗余代码。

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
    drawPath(true);
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
    syncChoreographyUI();
}
~~~~~

#### Acts 5: 替换 `loadVerifiedPathToCanvas` 中的重复代码

替换载入验证路径到画布处的冗余代码。

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
    drawPath(true);
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
    syncChoreographyUI();
}
~~~~~

#### Acts 6: 替换 `generateSequence` 中的重复代码

替换智能路径生成完成处的冗余代码。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
        const lastState = path[path.length - 1].state;
        ui.updateCurrStateUI(lastState);
        fetchNextTransitions();
        ui.updateStats(path, undoMove);
        drawPath(true);
        updateTrajectorySourceUI();
    } catch (err) {
        alert(`[-] 生成失败: ${err.message}`);
    }
}
~~~~~
~~~~~javascript.new
        const lastState = path[path.length - 1].state;
        ui.updateCurrStateUI(lastState);
        fetchNextTransitions();
        syncChoreographyUI();
    } catch (err) {
        alert(`[-] 生成失败: ${err.message}`);
    }
}
~~~~~

#### Acts 7: 替换 `importTrajectorySource` 中的两处重复代码

替换导入轨迹源码处的两个重复逻辑段。

第一处：
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
            drawPath(true);
            updateTrajectorySourceUI();
            return;
        }
~~~~~
~~~~~javascript.new
        if (statesList.length === 1) {
            const startState = statesList[0];
            path = [{ state: startState, move: null }];
            ui.updateCurrStateUI(startState);
            fetchNextTransitions();
            syncChoreographyUI();
            return;
        }
~~~~~

第二处：
~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
        path = newPath;
        ui.updateCurrStateUI(path[path.length - 1].state);
        fetchNextTransitions();
        ui.updateStats(path, undoMove);
        drawPath(true);
        updateTrajectorySourceUI();

    } catch (err) {
        alert(`导入解析失败: ${err.message}`);
    }
}
~~~~~
~~~~~javascript.new
        path = newPath;
        ui.updateCurrStateUI(path[path.length - 1].state);
        fetchNextTransitions();
        syncChoreographyUI();

    } catch (err) {
        alert(`[-] 导入解析失败: ${err.message}`);
    }
}
~~~~~

### 下一步建议
1. 建议在浏览器中加载并刷新该应用，验证手动编排、分支跳转、动作撤销、以及一键生成逻辑，确认画布轨迹正常重绘。
2. 确认其没有引入功能性回归后，可通过 Git 进行后续归档和提交。
