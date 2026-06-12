为了进一步提升编排的分享和协作效率，我们将为 Web 沙盒增加**“剪贴板导入/导出”**功能。用户可以一键将当前规划好的复杂轨迹导出为纯文本字符串（如 `LFO -> stroke -> RFI`），也可以将从他处获得的字符串直接导入沙盒进行可视化。

## [WIP] feat(web): 为编排沙盒增加剪贴板导入与导出功能

### 用户需求
用户需要一种简单的方式来备份、分享或恢复他们的编排设计。通过剪贴板导入/导出功能，用户可以轻松地将沙盒中的轨迹保存为文本，或将文本化的轨迹重新载入画布进行编辑。

### 评论
这是一个增强工具连通性的关键功能。它不仅方便了用户之间的分享，还使得本工具可以与其他基于文本的文档（如滑冰笔记、ISU 评分系统草稿）无缝对接。

### 目标
1. 在“交互式手动编排沙盒”卡片的头部增加“导出序列”和“导入序列”两个功能按钮。
2. 实现 `exportPathToClipboard` 方法：将当前 `path` 数组序列化为符合校验器格式的字符串并写入剪贴板。
3. 实现 `importPathFromClipboard` 方法：通过读取剪贴板或用户输入，利用现有的逻辑解析并重新加载画布。

### 基本原理
- **导出**：遍历 `path` 数组，将每个步骤的 `state` 和 `move.id` 拼接成由 `->` 分隔的字符串。
- **导入**：弹出输入框接收字符串，利用现有的多模式解析逻辑尝试识别它是“状态链”还是“动作链”，验证通过后调用 `loadVerifiedPathToCanvas` 将其注入沙盒。

### 标签
#intent/build #flow/ready #priority/medium
#comp/interfaces #concept/ui #scope/ux #scope/dx
#ai/instruct
#task/domain/ui
#task/object/clipboard-integration
#task/action/implementation
#task/state/continue #task/status/active

---

### Script

#### Acts 1: 在界面中添加导入/导出按钮

我们修改 `web/index.html`，在手动编排卡片的头部增加两个新的交互按钮。

~~~~~act
patch_file
web/index.html
~~~~~
~~~~~html.old
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-lg font-semibold flex items-center text-sky-300"><i class="fa-solid fa-compass mr-2"></i> 1. 交互式手动编排沙盒</h2>
                        <button onclick="resetChoreography()" class="text-xs text-rose-400 hover:text-rose-300 flex items-center transition"><i class="fa-solid fa-rotate-left mr-1"></i> 重置编排</button>
                    </div>
~~~~~
~~~~~html.new
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-lg font-semibold flex items-center text-sky-300"><i class="fa-solid fa-compass mr-2"></i> 1. 交互式手动编排沙盒</h2>
                        <div class="flex space-x-3">
                            <button onclick="exportPathToClipboard()" class="text-[10px] text-sky-400 hover:text-sky-300 flex items-center transition"><i class="fa-solid fa-copy mr-1"></i> 导出序列</button>
                            <button onclick="importPathFromClipboard()" class="text-[10px] text-teal-400 hover:text-teal-300 flex items-center transition"><i class="fa-solid fa-file-import mr-1"></i> 导入序列</button>
                            <button onclick="resetChoreography()" class="text-[10px] text-rose-400 hover:text-rose-300 flex items-center transition"><i class="fa-solid fa-rotate-left mr-1"></i> 重置</button>
                        </div>
                    </div>
~~~~~

#### Acts 2: 在 `app.js` 中实现导入/导出逻辑

我们向 `web/js/app.js` 导出新的 window 方法，并实现序列化与解析载入的函数。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
    window.handleVerify = handleVerify;
    window.switchVerifyMode = switchVerifyMode;
    window.loadVerifiedPathToCanvas = loadVerifiedPathToCanvas;
    window.generateSequence = generateSequence;
~~~~~
~~~~~javascript.new
    window.handleVerify = handleVerify;
    window.switchVerifyMode = switchVerifyMode;
    window.loadVerifiedPathToCanvas = loadVerifiedPathToCanvas;
    window.exportPathToClipboard = exportPathToClipboard;
    window.importPathFromClipboard = importPathFromClipboard;
    window.generateSequence = generateSequence;
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
    drawPath();
}

async function exportPathToClipboard() {
    if (path.length <= 1) {
        alert("⚠️ 当前沙盒为空，无可导出的轨迹。");
        return;
    }

    // 序列化为: LFO -> stroke -> RFI -> ...
    const sequence = path.map((step, i) => {
        let s = step.state;
        if (step.move) s += ` -> ${step.move.id}`;
        return s;
    }).join(" -> ");

    try {
        await navigator.clipboard.writeText(sequence);
        // 使用简单的提示，或者可以扩展为漂亮的 Toast
        const btn = document.querySelector('button[onclick="exportPathToClipboard()"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check mr-1"></i> 已复制';
        setTimeout(() => btn.innerHTML = originalText, 2000);
    } catch (err) {
        alert("无法访问剪贴板，请手动复制序列字符串。");
    }
}

async function importPathFromClipboard() {
    const input = prompt("请粘贴要导入的轨迹序列字符串\n(支持状态链如 'LFO -> RFI' 或步法链如 'stroke -> three_turn'):");
    if (!input || !input.trim()) return;

    const sequence = input.trim();
    
    // 自动判定模式：如果包含 LFO/RFI 等状态字样，尝试状态校验，否则尝试步法校验
    const hasState = /[LR][FB][OI]/.test(sequence.toUpperCase());
    
    try {
        if (hasState) {
            const data = await api.verifySequence(sequence);
            if (!data.valid) throw new Error(data.error);
            window.verifiedPathData = data.transitions.map(t => ({
                state: `${t.to_state.foot}${t.to_state.direction}${t.to_state.edge}`,
                move: t.selected_move
            }));
            window.verifiedInitialState = `${data.states[0].foot}${data.states[0].direction}${data.states[0].edge}`;
        } else {
            const moveIds = sequence.split(/->|,|\s+/).map(m => m.trim().toLowerCase()).filter(m => m.length > 0);
            const data = await api.verifyMovesSequence(moveIds, null);
            if (!data.valid) throw new Error(data.error);
            window.verifiedPathData = data.trace.map(t => ({
                state: `${t.to_state.foot}${t.to_state.direction}${t.to_state.edge}`,
                move: t.move
            }));
            window.verifiedInitialState = `${data.trace[0].from_state.foot}${data.trace[0].from_state.direction}${data.trace[0].from_state.edge}`;
        }
        
        loadVerifiedPathToCanvas();
    } catch (err) {
        alert(`[-] 导入失败：${err.message}`);
    }
}
~~~~~

### 下一步建议
1. **测试互操作性**：在一个浏览器窗口中“导出序列”，然后在另一个窗口（或刷新后）通过“导入序列”贴入，验证 2D 轨迹和统计数据是否完全同步还原。
2. **UI 微调**：目前使用 `prompt` 进行导入比较原始，未来可以考虑在页面底部增加一个专门的“导入控制台”侧边栏，提供更好的交互反馈。
3. **完成所有任务**：如果你对目前的导入/导出功能满意，我们就完成了这次重构的所有核心目标。
