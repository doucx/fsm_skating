import { getCurvature } from './state.js';

export function updateStats(path, undoCallback) {
    const stepsCount = path.length - 1;
    document.getElementById("stat-steps").innerText = `${stepsCount} 步`;

    let totalDiff = 0;
    let cwCount = 0;
    let ccwCount = 0;

    path.forEach((step) => {
        if (step.move) {
            totalDiff += step.move.difficulty;
            if (step.move.rotation_dir === "CW") cwCount++;
            if (step.move.rotation_dir === "CCW") ccwCount++;
        }
    });

    document.getElementById("stat-total-diff").innerText = totalDiff;
    document.getElementById("stat-cw").innerText = cwCount;
    document.getElementById("stat-ccw").innerText = ccwCount;

    const totalRots = cwCount + ccwCount;
    const cwBar = document.getElementById("cw-bar");
    const ccwBar = document.getElementById("ccw-bar");
    const balanceP = document.getElementById("stat-balance-p");

    if (totalRots > 0) {
        const cwWidth = (cwCount / totalRots) * 100;
        cwBar.style.width = `${cwWidth}%`;
        ccwBar.style.width = `${100 - cwWidth}%`;

        if (cwCount > 0 && ccwCount > 0) {
            balanceP.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-400 mr-1"></i> <span class="text-emerald-400 font-semibold">双向平衡良好！符合 ISU 高级别评级要求。</span>';
        } else {
            balanceP.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-amber-400 mr-1"></i> <span class="text-amber-400">目前仅包含单一转弯。建议增加交替方向。</span>';
        }
    } else {
        cwBar.style.width = `50%`;
        ccwBar.style.width = `50%`;
        balanceP.innerHTML = '<i class="fa-solid fa-info-circle text-sky-400 mr-1"></i> 暂不包含显著转体类步法。';
    }

    const trail = document.getElementById("choreography-trail");
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

    if (stepsCount > 0) {
        const undoBtn = document.createElement("button");
        undoBtn.className = "ml-auto px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-xs text-rose-400 transition";
        undoBtn.onclick = undoCallback;
        undoBtn.innerHTML = '<i class="fa-solid fa-arrow-rotate-left mr-1"></i> 回撤';
        trail.appendChild(undoBtn);
    }
}

export function updateCurrStateUI(stateStr) {
    document.getElementById("curr-state-badge").innerText = stateStr;
    const descMap = {
        'LFO': '左脚 (L) | 向前 (F) | 外刃 (O)',
        'LFI': '左脚 (L) | 向前 (F) | 内刃 (I)',
        'LBO': '左脚 (L) | 向后 (B) | 外刃 (O)',
        'LBI': '左脚 (L) | 向后 (B) | 内刃 (I)',
        'RFO': '右脚 (R) | 向前 (F) | 外刃 (O)',
        'RFI': '右脚 (R) | 向前 (F) | 内刃 (I)',
        'RBO': '右脚 (R) | 向后 (B) | 外刃 (O)',
        'RBI': '右脚 (R) | 向后 (B) | 内刃 (I)',
    };
    document.getElementById("curr-state-desc").innerText = descMap[stateStr] || "";

    const curve = getCurvature(stateStr);
    const isCW = curve === "CW";
    const curveDesc = isCW ? "CW 顺时针 ↻" : "CCW 逆时针 ↺";
    const curveDescEl = document.getElementById("curr-curve-desc");
    curveDescEl.innerText = curveDesc;
    curveDescEl.className = isCW ? "ml-1 font-semibold text-sky-300" : "ml-1 font-semibold text-teal-300";
}

export function renderTransitionOptions(currState, options, onChoose) {
    const container = document.getElementById("transition-options");
    container.innerHTML = "";

    options.forEach((opt) => {
        const next = opt.target_state;
        const move = opt.move;
        const rotDir = move.rotation_dir;
        let rotBadge = "";
        if (rotDir === "CW") {
            rotBadge = '<span class="text-[10px] bg-sky-950 text-sky-300 border border-sky-800 px-1.5 py-0.5 rounded-md ml-2">↻ 顺旋转</span>';
        } else if (rotDir === "CCW") {
            rotBadge = '<span class="text-[10px] bg-teal-950 text-teal-300 border border-teal-800 px-1.5 py-0.5 rounded-md ml-2">↺ 逆旋转</span>';
        }

        const item = document.createElement("button");
        item.className = "w-full text-left bg-slate-800/40 hover:bg-slate-700/60 border border-slate-700/60 rounded-xl p-3 flex justify-between items-center transition group";
        item.onclick = () => onChoose(next, move);
        item.innerHTML = `
            <div>
                <span class="font-bold text-slate-200 group-hover:text-sky-300 transition tracking-wider mr-2">${currState} ──▶ ${next.foot}${next.direction}${next.edge}</span>
                ${rotBadge}
                <div class="text-xs text-slate-400 mt-1">${move.name}</div>
            </div>
            <div class="text-right">
                <span class="text-xs font-semibold px-2 py-1 rounded bg-slate-900 border border-slate-700/80 text-sky-400">难度: ${move.difficulty}</span>
            </div>
        `;
        container.appendChild(item);
    });
}