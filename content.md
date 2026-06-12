这是一个非常棒的视觉改进！当前的灰色小箭头在冰面上显得过于沉闷，暗淡了步法转移的丰富程度。

将转移节点改造成**“橙色微光指示灯（LED Indicator）”**样式，不仅建立起了明晰的“天蓝用刃状态 ➜ 橙黄变刃动作”的对比视觉结构，更能让整条冰面流向像高精密电子原理图一样，闪烁出动感。

我将为你修改 `uiController.js` 中的轨道渲染逻辑，将其升级为带有微光扩散投影的 LED 舱室卡片。

### [WIP] style(web): 将已规划轨迹流向动作节点升级为橙色微光指示灯

### 用户需求
将轨迹流向中的灰色箭头和步法名称更换为橙色动作节点。节点应包含简称和难度级别，并带有柔和的橙色发光扩散投影，像指示灯一样亮眼。

### 评论
这样调整后，动作节点（物理转移）与状态片段（圆弧滑跑）在色彩体系上形成了经典的“双色中控台”结构。这也极大增加了“设计难度积分”的视觉存在感。

### 目标
1.  重构 `uiController.js` 中的 `updateStats` 方法，不再绘制灰色文本，而是创建富有质感的橙色 LED 元素。
2.  在动作节点两侧增加细微的过渡箭头（Chev），保证拓扑图的单向可读性。

### 标签
#intent/tune #flow/ready #priority/medium #comp/docs #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/visual-trail #task/action/style-tune #task/state/continue

---

### Script

#### Acts 1: 重构动作节点的渲染逻辑
升级为橙色高亮微光微缩卡片，并配以极简的衔接剪头。

~~~~~act
patch_file
web/js/uiController.js
~~~~~
~~~~~javascript.old
    trail.innerHTML = "";
    path.forEach((step, idx) => {
        const stateNode = document.createElement("span");
        stateNode.className = "px-2.5 py-1 text-xs font-bold font-mono tracking-wider bg-sky-950 text-sky-300 rounded-md border border-sky-800 glow-ice";
        stateNode.innerText = step.state;
        trail.appendChild(stateNode);

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
    });
~~~~~
~~~~~javascript.new
    trail.innerHTML = "";
    path.forEach((step, idx) => {
        // 绘制用刃状态节点 (天蓝微光)
        const stateNode = document.createElement("span");
        stateNode.className = "px-2.5 py-1 text-xs font-bold font-mono tracking-wider bg-sky-950 text-sky-300 rounded-md border border-sky-800 glow-ice flex items-center";
        stateNode.innerText = step.state;
        trail.appendChild(stateNode);

        if (step.move) {
            // 1. 动作节点前置衔接箭头 (柔和暗灰)
            const preArrow = document.createElement("span");
            preArrow.className = "text-[9px] text-slate-600 self-center px-0.5";
            preArrow.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
            trail.appendChild(preArrow);

            // 2. 橙色 LED 动作转换节点
            const actNode = document.createElement("div");
            // 内置柔和的 amber 发光滤镜与投影
            actNode.className = "flex items-center space-x-1.5 px-2.5 py-1 bg-amber-950/40 border border-amber-500/40 rounded-md shadow-[0_0_10px_rgba(245,158,11,0.25)] text-amber-400 text-[10px] font-semibold";
            
            const miniName = step.move.name.split(" ")[0];
            actNode.innerHTML = `
                <span class="tracking-tight">${miniName}</span>
                <span class="px-1 py-0.2 bg-amber-500 text-slate-950 rounded-[3px] text-[8px] font-extrabold leading-none scale-90 origin-right">
                    ${step.move.difficulty}级
                </span>
            `;
            trail.appendChild(actNode);

            // 3. 动作节点后置衔接箭头
            const postArrow = document.createElement("span");
            postArrow.className = "text-[9px] text-slate-600 self-center px-0.5";
            postArrow.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
            trail.appendChild(postArrow);
        }
    });
~~~~~

### 下一步建议
- **步法拖拽重组**：当前已规划轨迹只能通过“回撤”重新排布。未来可以允许直接拖拽这些橙色 LED 动作块来改变其在链路中的先后顺序，支持可视化重排。
- **指示灯交互**：当鼠标悬停在轨迹图的动作图标上时，点亮对应位置的橙色 LED 节点，提供双向的图形-文字联动。
