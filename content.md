这是一个非常敏锐的视觉改进建议！

目前的灰色箭头和细小文字在深色背景下确实辨识度较低，且显得有些“凌乱”。将其改为橙色的**“动作节点 (Action Nodes)”**，不仅能与蓝色的“用刃状态”形成鲜明的补色对比，还能在视觉上更清晰地界定“滑行”与“转体/动作”之间的逻辑边界。

我将为你实现：
1.  **高亮节点化**：将步法动作渲染为深橙色的胶囊型节点。
2.  **视觉分层**：节点内部包含动作简称和难度等级，并带有橙色微光，使其在整个“轨迹链”中像指示灯一样清晰。
3.  **布局优化**：调整间距，使节点在状态 Badge 之间更具衔接感。

### [WIP] style(web): 将已规划轨迹流向中的步法显示重构为橙色高亮节点

### 用户需求
将“已规划轨迹流向”中的灰色箭头和步法名称替换为橙色的节点，以增强可视性和观察的便利性。

### 评论
这是一种更好的“视觉语法”。在花样滑冰中，动作（转体、换脚）是瞬间发生的，而用刃是持续的。用鲜艳的节点代表动作，用宽大的 Badge 代表状态，完美符合这种物理特性，能显著降低用户的认知负荷。

### 目标
1.  修改 `uiController.js` 中的 `updateStats` 函数。
2.  重构 `step.move` 对应的 HTML 生成逻辑，从传统的“箭头+文字”模式转为“橙色发光节点”模式。

### 标签
#intent/tune #flow/ready #priority/medium #comp/docs #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/trajectory-trail #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 重构轨迹链渲染逻辑
修改 `uiController.js`，将灰色的 `chevron-right` 元素替换为深橙色风格的 `Action Node`。

~~~~~act
patch_file
web/js/uiController.js
~~~~~
~~~~~javascript.old
        if (step.move) {
            const arrow = document.createElement("span");
            arrow.className = "text-[10px] text-slate-500 flex flex-col items-center px-1";
            const miniName = step.move.name.split(" ")[0];
            arrow.innerHTML = `
                <i class="fa-solid fa-chevron-right"></i>
                <span class="text-[8px] text-slate-400 scale-90 text-center leading-tight">
                    ${miniName}<br/>${step.move.difficulty}级
                </span>`;
            trail.appendChild(arrow);
        }
~~~~~
~~~~~javascript.new
        if (step.move) {
            const actionNode = document.createElement("div");
            actionNode.className = "flex flex-col items-center -space-y-0.5 mx-0.5";
            
            const miniName = step.move.name.split(" ")[0].substring(0, 4);
            actionNode.innerHTML = `
                <div class="px-2 py-0.5 bg-orange-600/20 border border-orange-500/50 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.3)] flex items-center space-x-1">
                    <i class="fa-solid fa-bolt text-[8px] text-orange-400"></i>
                    <span class="text-[9px] font-bold text-orange-300 uppercase tracking-tighter">${miniName}</span>
                </div>
                <div class="text-[8px] text-slate-500 font-mono scale-90">Lev.${step.move.difficulty}</div>
            `;
            trail.appendChild(actionNode);
        }
~~~~~

### 下一步建议
- **悬停高亮联动**：当鼠标悬停在已规划轨迹链中的某个“橙色动作节点”时，在画布上高亮显示对应的物理轨迹段。
- **动作分类颜色**：更进一步，可以根据动作类别（如转三步、括弧步、蹬冰步）分配深浅不同的橙红色系，从而一眼辨识出整套编排的难度分布。
- **步法连线优化**：在 Badge 和 Node 之间增加极细的半透明连线，增强流向的整体感。
