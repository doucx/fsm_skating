好的，这是一个很棒的项目结构优化构想。将配置文件和前端的表现/逻辑层剥离出代码和核心结构中，能够极大提升项目的可维护性和整洁度。我将为你生成一个完整的结构迁移与代码重构计划。

## [WIP] refactor: 重构项目目录结构与前端代码，实现配置与表现分离

### 用户需求
1. 将 `moves_config.yaml` 移出代码层和项目根目录，存放到全新的 `config/` 目录下。
2. 相应更新 Python 后端中对配置文件的查找路径和默认 fallback 路径，确保 API、CLI 和测试组件能够正常加载配置。
3. 重构前端代码空间，将 `web/index.html` 拆分为：
   - 纯净的表现层 `web/index.html`
   - 样式层 `web/css/style.css`
   - 逻辑与 Canvas 渲染层 `web/js/app.js`

### 评论
这个重构举措非常契合清晰界限（Separation of Concerns）的工程设计原则。将配置文件外置，不仅使项目根目录更加干净，也为将来的多环境部署和动态挂载配置奠定了基础；同时，对前端 HTML、CSS、JS 的物理分离也是标准的现代 Web 工程化实践。

### 目标
1. 创建物理目录 `config/`、`web/css/`、`web/js/`。
2. 移动并重命名配置文件 `moves_config.yaml` 到 `config/` 目录下。
3. 修改 `src/fsm_skating/api/main.py` 中的物理路径定位。
4. 修改 `src/fsm_skating/cli/main.py` 中的默认配置路径及 fallback。
5. 修改 `tests/test_engine.py` 中的测试引擎初始化配置路径。
6. 完成对 `web/index.html` 的结构与脚本分离，创建 `web/css/style.css` 和 `web/js/app.js` 并保持交互和 2D Canvas 渲染行为一致。

### 基本原理
- **配置文件外置**：在后端程序中，配置通常由环境变量或专用配置文件夹管理。我们将后端的查找相对路径调整为向上爬升 3 层目录寻找 `config/moves_config.yaml`（因为 API/CLI 文件位于 3 级深度的包目录中）。
- **前端分离**：利用 `<link>` 与 `<script src="...">` 引用外部静态资源，减小单个 HTML 文件的体积，提高代码可读性和在 TUI/IDE 环境下的高亮/补全体验。

### 标签
#intent/refine #flow/ready #priority/medium
#comp/cli #comp/engine #comp/tests #concept/config #concept/ui #scope/dx #scope/ux
#ai/instruct
#task/domain/ui
#task/object/frontend-and-config-structure
#task/action/refactor
#task/state/begin

---

### Script

#### Acts 1: 创建物理文件夹并搬迁配置文件

我们将首先建立对应的文件夹目录，然后把根目录下的配置文件转移到全新的 `config` 文件夹中。

~~~~~act
run_command
~~~~~
~~~~~
mkdir -p config web/css web/js
~~~~~

~~~~~act
move_file
moves_config.yaml
config/moves_config.yaml
~~~~~

#### Acts 2: 修正后端 API 的配置文件引用

我们需要修改 `src/fsm_skating/api/main.py` 以将配置文件读取路径重定向到 `config/moves_config.yaml`。

~~~~~act
patch_file
src/fsm_skating/api/main.py
~~~~~
~~~~~python.old
config_path = os.path.join(os.path.dirname(__file__), "../../../moves_config.yaml")
if not os.path.exists(config_path):
    config_path = "moves_config.yaml"
~~~~~
~~~~~python.new
config_path = os.path.join(os.path.dirname(__file__), "../../../config/moves_config.yaml")
if not os.path.exists(config_path):
    config_path = "config/moves_config.yaml"
~~~~~

#### Acts 3: 修正后端 CLI 的配置文件引用与 fallback 路径

我们需要修改 `src/fsm_skating/cli/main.py` 内部 `argparse` 的默认配置文件路径，以及在找不到配置时用于兜底的物理 fallback 路径。

~~~~~act
patch_file
src/fsm_skating/cli/main.py
~~~~~
~~~~~python.old
    parser = argparse.ArgumentParser(description="花样滑冰步法智能编排状态机系统 CLI")
    parser.add_argument(
        "--config",
        default="moves_config.yaml",
        help="配置文件 (moves_config.yaml) 路径，默认使用当前目录文件",
    )
    args = parser.parse_args()

    try:
        engine = ChoreographyEngine(args.config)
    except FileNotFoundError:
        parent_config = os.path.join(
            os.path.dirname(__file__), "../../moves_config.yaml"
        )
        if os.path.exists(parent_config):
            engine = ChoreographyEngine(parent_config)
        else:
            print(f"❌ 运行失败：未找到外部动作配置文件 '{args.config}'。")
            sys.exit(1)
~~~~~
~~~~~python.new
    parser = argparse.ArgumentParser(description="花样滑冰步法智能编排状态机系统 CLI")
    parser.add_argument(
        "--config",
        default="config/moves_config.yaml",
        help="配置文件 (config/moves_config.yaml) 路径，默认使用当前目录文件",
    )
    args = parser.parse_args()

    try:
        engine = ChoreographyEngine(args.config)
    except FileNotFoundError:
        parent_config = os.path.join(
            os.path.dirname(__file__), "../../../config/moves_config.yaml"
        )
        if os.path.exists(parent_config):
            engine = ChoreographyEngine(parent_config)
        else:
            print(f"❌ 运行失败：未找到外部动作配置文件 '{args.config}'。")
            sys.exit(1)
~~~~~

#### Acts 4: 更新单元测试中的测试引擎加载路径

修改 `tests/test_engine.py` 的 pytest fixture，以让测试用例在根目录执行 pytest 时，正确从新路径载入配置。

~~~~~act
patch_file
tests/test_engine.py
~~~~~
~~~~~python.old
@pytest.fixture
def engine():
    return ChoreographyEngine("moves_config.yaml")
~~~~~
~~~~~python.new
@pytest.fixture
def engine():
    return ChoreographyEngine("config/moves_config.yaml")
~~~~~

#### Acts 5: 剥离并编写前端样式文件 (CSS)

新建 `web/css/style.css`，将原有 index.html 内联的个性化冰面背景、光晕卡片等样式移入此文件。

~~~~~act
write_file
web/css/style.css
~~~~~
~~~~~css
body {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: #f1f5f9;
}
.ice-card {
    background: rgba(30, 41, 59, 0.45);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(148, 163, 184, 0.15);
}
.glow-ice {
    box-shadow: 0 0 15px rgba(56, 189, 248, 0.25);
}
~~~~~

#### Acts 6: 剥离并编写前端逻辑脚本 (JS)

新建 `web/js/app.js`，迁移所有原有的前端事件绑定、FSM 交互、后端 API 通信和 2D Canvas 自适应冰痕绘制逻辑。

~~~~~act
write_file
web/js/app.js
~~~~~
~~~~~javascript
const API_BASE = "http://127.0.0.1:8000/api";
let path = []; // 存储结构: [ { state: 'LFO', move: null } ]

// 初始化
document.addEventListener("DOMContentLoaded", () => {
    initChoreography();
});

// 1. 初始化或重置编排
function initChoreography() {
    const startState = document.getElementById("start-state-select").value;
    path = [{ state: startState, move: null }];
    updateCurrStateUI(startState);
    fetchNextTransitions();
    updateStats();
}

function resetChoreography() {
    initChoreography();
}

// 状态转弯（滑行轨迹弯曲方向）计算公式
function getCurvature(stateStr) {
    let isL = stateStr[0] === 'L';
    let isF = stateStr[1] === 'F';
    let isO = stateStr[2] === 'O';
    let isCW = false;
    if (isL) {
        isCW = isF ? (!isO) : isO;
    } else {
        isCW = isF ? isO : (!isO);
    }
    return isCW ? "CW" : "CCW";
}

// 更新状态 UI 显示
function updateCurrStateUI(stateStr) {
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
    document.getElementById("curr-curve-desc").innerText = curveDesc;
    document.getElementById("curr-curve-desc").className = isCW ? "ml-1 font-semibold text-sky-300" : "ml-1 font-semibold text-teal-300";
}

// 2. 动态拉取下一次的可用变换
async function fetchNextTransitions() {
    const currState = path[path.length - 1].state;
    const maxDiff = document.getElementById("max-difficulty-select").value;
    const container = document.getElementById("transition-options");
    
    container.innerHTML = '<p class="text-xs text-slate-500 animate-pulse">正在调配 FSM 编排逻辑推荐...</p>';

    try {
        const res = await fetch(`${API_BASE}/transitions/${currState}?max_difficulty=${maxDiff}`);
        if (!res.ok) throw new Error("获取转移失败");
        const options = await res.json();

        if (options.length === 0) {
            container.innerHTML = '<p class="text-xs text-rose-400/80 p-2 border border-rose-950 bg-rose-950/20 rounded-lg">⚠️ 当前状态下没有符合最大难度限制的有效滑行变体！请宽限难度限制。</p>';
            return;
        }

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
            item.onclick = () => chooseNextMove(next, move);
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
    } catch (err) {
        container.innerHTML = `<p class="text-xs text-rose-400">加载推荐分支时出现网络故障。请确认后端服务已运行。</p>`;
    }
}

// 选择新状态
function chooseNextMove(nextStateObj, moveObj) {
    path[path.length - 1].move = moveObj;
    const nextStateStr = `${nextStateObj.foot}${nextStateObj.direction}${nextStateObj.edge}`;
    path.push({ state: nextStateStr, move: null });

    updateCurrStateUI(nextStateStr);
    fetchNextTransitions();
    updateStats();
}

// 撤销上一步
function undoMove() {
    if (path.length <= 1) return;
    path.pop();
    path[path.length - 1].move = null;
    const prevState = path[path.length - 1].state;
    updateCurrStateUI(prevState);
    fetchNextTransitions();
    updateStats();
}

// 🚀 核心渲染引擎：2D 冰面圆弧物理轨迹图
function drawSkatePath(pathData) {
    const canvas = document.getElementById("skate-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (pathData.length === 0) return;

    // 1. 向量数学推演各控制节点坐标
    let points = [];
    let x = 0;
    let y = 0;
    let theta = 0; // 冰滑前行切向角（弧度）
    const R = 50;  // 设定基础滑行半径
    const sweepAngle = Math.PI * 0.65; // 每个物理动作在弧线上转过的张角 (117度)

    points.push({ x, y, state: pathData[0].state, move: null });

    for (let i = 0; i < pathData.length - 1; i++) {
        const step = pathData[i];
        const nextStep = pathData[i+1];
        const stateStr = step.state;
        
        const curve = getCurvature(stateStr);
        const K = (curve === "CW") ? -1 : 1; // 1代表CCW（向左划圆弧），-1代表CW（向右划圆弧）

        // 计算该动作弧段的几何切线圆心
        const cx = x - K * R * Math.sin(theta);
        const cy = y + K * R * Math.cos(theta);

        // 圆心至起点的偏角
        const startAngle = Math.atan2(y - cy, x - cx);
        const sweep = K * sweepAngle;
        const endAngle = startAngle + sweep;

        // 计算终点状态在 2D 平面中的投影位置
        const nextX = cx + R * Math.cos(endAngle);
        const nextY = cy + R * Math.sin(endAngle);
        const nextTheta = theta + sweep; // 继承速度切向

        points.push({
            x: nextX,
            y: nextY,
            cx,
            cy,
            R,
            startAngle,
            endAngle,
            anticlockwise: (K === -1), // 确定 Canvas 绘制方向
            state: nextStep.state,
            move: step.move
        });

        // 迭代坐标与前行切角
        x = nextX;
        y = nextY;
        theta = nextTheta;
    }

    // 2. 计算极值并实现物理包围盒居中自适应缩放 (Auto-scale)
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    points.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    });

    const pad = 35;
    const w = maxX - minX || 1;
    const h = maxY - minY || 1;
    // 自适应缩放比例上限为 1.5 倍，防止少量点时无限放大
    const scale = Math.min((canvas.width - 2 * pad) / w, (canvas.height - 2 * pad) / h, 1.5);

    // 视口平移补偿
    const offsetX = (canvas.width - w * scale) / 2 - minX * scale;
    const offsetY = (canvas.height - h * scale) / 2 - minY * scale;

    // 映射投影函数
    const transform = (px, py) => ({
        x: px * scale + offsetX,
        y: py * scale + offsetY
    });

    // 3. 绘制微光网格冰面 scratch pattern 质感
    ctx.strokeStyle = "rgba(148, 163, 184, 0.04)";
    ctx.lineWidth = 1;
    for (let i = 20; i < canvas.width; i += 30) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let j = 20; j < canvas.height; j += 30) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(canvas.width, j);
        ctx.stroke();
    }

    // 4. 渲染荧光划痕弧线
    for (let i = 1; i < points.length; i++) {
        const p = points[i];
        const centerTrans = transform(p.cx, p.cy);
        const scaledR = p.R * scale;

        ctx.beginPath();
        ctx.arc(centerTrans.x, centerTrans.y, scaledR, p.startAngle, p.endAngle, p.anticlockwise);
        
        // 根据步骤数产生炫目的渐变光痕效果
        const progressRatio = i / points.length;
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.45 + progressRatio * 0.55})`;
        ctx.lineWidth = 3.5;
        ctx.shadowBlur = 12;
        ctx.shadowColor = "rgba(56, 189, 248, 0.65)";
        ctx.stroke();
        ctx.shadowBlur = 0; // 重置发光防止污染文字

        // 绘制动作简写于弧线黄金中点 (Mid-angle)
        if (p.move) {
            const midAngle = p.startAngle + (p.endAngle - p.startAngle) * 0.5;
            const mx = centerTrans.x + scaledR * Math.cos(midAngle);
            const my = centerTrans.y + scaledR * Math.sin(midAngle);
            ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
            ctx.font = "9px sans-serif";
            ctx.textAlign = "center";
            // 只截取中文名称第一部分
            const miniName = p.move.name.split(" ")[0].substring(0, 4);
            ctx.fillText(miniName, mx, my - 5);
        }
    }

    // 5. 渲染边缘节点状态标志球与发光层
    points.forEach((p, idx) => {
        const pt = transform(p.x, p.y);
        const isLast = (idx === points.length - 1);

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isLast ? 6 : 4, 0, 2 * Math.PI);
        ctx.fillStyle = isLast ? "#38bdf8" : "#0f172a";
        ctx.strokeStyle = isLast ? "#ffffff" : "#0284c7";
        ctx.lineWidth = isLast ? 2.5 : 2;
        ctx.fill();
        ctx.stroke();

        // 绘制高亮文字
        ctx.fillStyle = isLast ? "#ffffff" : "#94a3b8";
        ctx.font = isLast ? "bold 11px monospace" : "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(p.state, pt.x, pt.y - (isLast ? 11 : 9));
    });
}

// 渲染编排统计与流向链路
function updateStats() {
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

    // 比例条
    const totalRots = cwCount + ccwCount;
    if (totalRots > 0) {
        const cwWidth = (cwCount / totalRots) * 100;
        document.getElementById("cw-bar").style.width = `${cwWidth}%`;
        document.getElementById("ccw-bar").style.width = `${100 - cwWidth}%`;

        if (cwCount > 0 && ccwCount > 0) {
            document.getElementById("stat-balance-p").innerHTML = '<i class="fa-solid fa-circle-check text-emerald-400 mr-1"></i> <span class="text-emerald-400 font-semibold">双向平衡良好！符合 ISU 高级别评级要求。</span>';
        } else {
            document.getElementById("stat-balance-p").innerHTML = '<i class="fa-solid fa-triangle-exclamation text-amber-400 mr-1"></i> <span class="text-amber-400">目前仅包含单一转弯。建议增加交替方向。</span>';
        }
    } else {
        document.getElementById("cw-bar").style.width = `50%`;
        document.getElementById("ccw-bar").style.width = `50%`;
        document.getElementById("stat-balance-p").innerHTML = '<i class="fa-solid fa-info-circle text-sky-400 mr-1"></i> 暂不包含显著转体类步法。';
    }

    // 更新已完成轨迹流向图
    const trail = document.getElementById("choreography-trail");
    trail.innerHTML = "";
    path.forEach((step, idx) => {
        const stateNode = document.createElement("span");
        stateNode.className = "px-2.5 py-1 text-xs font-bold font-mono tracking-wider bg-sky-950 text-sky-300 rounded-md border border-sky-800 glow-ice";
        stateNode.innerText = step.state;
        trail.appendChild(stateNode);

        if (step.move) {
            const arrow = document.createElement("span");
            arrow.className = "text-[10px] text-slate-500 flex flex-col items-center";
            arrow.innerHTML = `<i class="fa-solid fa-chevron-right"></i><span class="text-[9px] text-slate-400 scale-90">${step.move.difficulty}级</span>`;
            trail.appendChild(arrow);
        }
    });

    if (stepsCount > 0) {
        const undoBtn = document.createElement("button");
        undoBtn.className = "ml-auto px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-xs text-rose-400 transition";
        undoBtn.onclick = undoMove;
        undoBtn.innerHTML = '<i class="fa-solid fa-arrow-rotate-left mr-1"></i> 回撤';
        trail.appendChild(undoBtn);
    }

    // 🚀 重绘冰面轨迹画布
    drawSkatePath(path);
}

// 3. 校验解析
async function verifySequence() {
    const sequence = document.getElementById("verify-input").value;
    const output = document.getElementById("verify-result");
    if (!sequence.trim()) return;

    output.className = "mt-4 p-4 rounded-xl text-sm border bg-slate-900/80";
    output.innerHTML = '<p class="text-slate-400 animate-pulse">正在进行物理路径校验与动力学翻译...</p>';

    try {
        const res = await fetch(`${API_BASE}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sequence })
        });
        const data = await res.json();

        if (!data.valid) {
            output.className = "mt-4 p-4 rounded-xl text-sm border border-rose-950 bg-rose-950/20";
            output.innerHTML = `<p class="text-rose-400 font-semibold"><i class="fa-solid fa-circle-xmark mr-1"></i> 校验失败</p><p class="text-xs text-slate-300 mt-2">${data.error}</p>`;
        } else {
            output.className = "mt-4 p-4 rounded-xl text-sm border border-emerald-950 bg-emerald-950/10 text-slate-300 space-y-3";
            let listHTML = "";
            data.transitions.forEach((t, i) => {
                const rot = t.selected_move.rotation_dir ? ` [${t.selected_move.rotation_dir === 'CW' ? '顺时针' : '逆时针'}]` : "";
                listHTML += `
                    <div class="text-xs pl-3 border-l border-emerald-800">
                        <span class="font-bold text-slate-200">${t.from_state} ──▶ ${t.to_state}</span><br/>
                        <span class="text-emerald-400">${t.selected_move.name}${rot}</span> (难度: ${t.selected_move.difficulty})
                    </div>
                `;
            });

            output.innerHTML = `
                <p class="text-emerald-400 font-bold flex items-center"><i class="fa-solid fa-circle-check mr-1"></i> 验证通过！完全符合动力学规范！</p>
                <p class="text-xs text-slate-400">总设计难度积分: <strong class="text-slate-200 text-sm">${data.total_difficulty}</strong></p>
                <div class="space-y-2 mt-2">${listHTML}</div>
            `;
        }
    } catch (err) {
        output.innerHTML = `<p class="text-xs text-rose-400">通信网络故障。</p>`;
    }
}

// 4. 自动生成
async function generateSequence() {
    const steps = document.getElementById("gen-steps").value;
    const maxDiff = document.getElementById("gen-diff").value;
    const selectState = document.getElementById("start-state-select").value;

    try {
        const res = await fetch(`${API_BASE}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                steps: parseInt(steps),
                max_difficulty: parseInt(maxDiff),
                start_state: selectState
            })
        });

        if (!res.ok) {
            const detail = await res.json();
            alert(`[-] 生成失败: ${detail.detail || "不可抗力"}`);
            return;
        }

        const data = await res.json();
        
        path = [];
        data.forEach((step) => {
            const stateStr = `${step.state.foot}${step.state.direction}${step.state.edge}`;
            path.push({
                state: stateStr,
                move: step.move
            });
        });

        const lastState = path[path.length - 1].state;
        updateCurrStateUI(lastState);
        fetchNextTransitions();
        updateStats();

    } catch (err) {
        alert("通信异常，生成失败。");
    }
}
~~~~~

#### Acts 7: 重写前端主页，引入独立的 CSS 和 JS 资源

我们使用 `write_file` 覆盖并写入一个清爽无脚本、无内联样式的 `web/index.html`，通过静态引入的方式载入刚才剥离出来的外部样式及行为逻辑文件。

~~~~~act
write_file
web/index.html
~~~~~
~~~~~html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>⛸️ 冰面物理 - 花样滑冰步法智能编排沙盒</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="css/style.css">
</head>
<body class="min-h-screen py-8">
    <div class="container mx-auto px-4 max-w-6xl">
        
        <!-- 头部 Header -->
        <header class="mb-8 flex flex-col md:flex-row justify-between items-center border-b border-slate-700 pb-6">
            <div class="flex items-center space-x-3">
                <div class="text-4xl text-sky-400 animate-pulse"><i class="fa-regular fa-snowflake"></i></div>
                <div>
                    <h1 class="text-2xl font-bold tracking-wide bg-gradient-to-r from-sky-400 to-teal-300 bg-clip-text text-transparent">
                        花样滑冰 FSM 步法编排沙盒
                    </h1>
                    <p class="text-sm text-slate-400">基于有限状态机 (FSM) 的滑冰动力学与多样性自动校验系统</p>
                </div>
            </div>
            <div class="mt-4 md:mt-0 flex space-x-3 text-xs">
                <span class="px-3 py-1.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800"><i class="fa-solid fa-server mr-1"></i> API Local: 127.0.0.1:8000</span>
                <span class="px-3 py-1.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800"><i class="fa-solid fa-bolt mr-1"></i> Mode: Canvas UI</span>
            </div>
        </header>

        <!-- 主内容区 Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            <!-- 左侧：交互式手动编排模块 (占7格) -->
            <div class="lg:col-span-7 space-y-6">
                <div class="ice-card rounded-2xl p-6 glow-ice">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-lg font-semibold flex items-center text-sky-300"><i class="fa-solid fa-compass mr-2"></i> 1. 交互式手动编排沙盒</h2>
                        <button onclick="resetChoreography()" class="text-xs text-rose-400 hover:text-rose-300 flex items-center transition"><i class="fa-solid fa-rotate-left mr-1"></i> 重置编排</button>
                    </div>

                    <!-- 参数设定 -->
                    <div class="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label class="block text-xs text-slate-400 mb-1">起始状态设定</label>
                            <select id="start-state-select" onchange="initChoreography()" class="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-sky-500">
                                <option value="LFO">LFO - 左前外刃</option>
                                <option value="LFI">LFI - 左前内刃</option>
                                <option value="LBO">LBO - 左后外刃</option>
                                <option value="LBI">LBI - 左后内刃</option>
                                <option value="RFO">RFO - 右前外刃</option>
                                <option value="RFI">RFI - 右前内刃</option>
                                <option value="RBO">RBO - 右后外刃</option>
                                <option value="RBI">RBI - 右后内刃</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs text-slate-400 mb-1">最大允许动作难度</label>
                            <select id="max-difficulty-select" onchange="fetchNextTransitions()" class="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-sky-500">
                                <option value="5" selected>难度 5 (全动作开放)</option>
                                <option value="4">难度 4 (不包含后外转三等)</option>
                                <option value="3">难度 3 (基础蹬冰/中度动作)</option>
                                <option value="1">难度 1 (标准蹬冰步)</option>
                            </select>
                        </div>
                    </div>

                    <!-- 🚀 新增：2D Canvas 冰面轨迹实时渲染区 -->
                    <div class="mb-6">
                        <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex justify-between items-center">
                            <span>❄️ 实时冰面滑痕轨迹（2D 向量拼接）</span>
                            <span class="text-[10px] text-sky-400 normal-case"><i class="fa-solid fa-minimize mr-1"></i> 物理边界自适应缩放</span>
                        </h3>
                        <div class="bg-slate-950/80 rounded-xl overflow-hidden border border-slate-800 glow-ice">
                            <canvas id="skate-canvas" width="600" height="200" class="w-full h-[200px] block"></canvas>
                        </div>
                    </div>

                    <!-- 动态状态指示 -->
                    <div class="flex items-center space-x-4 bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 mb-6">
                        <div class="bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg p-3 text-center min-w-[70px] glow-ice">
                            <span id="curr-state-badge" class="text-2xl font-bold tracking-wider">LFO</span>
                        </div>
                        <div class="flex-1">
                            <h3 class="text-sm font-medium text-slate-200" id="curr-state-desc">左脚 (L) 向前 (F) 外刃 (O)</h3>
                            <p class="text-xs text-sky-400 mt-1 flex items-center">
                                <i class="fa-solid fa-yin-yang mr-1"></i> 滑行惯性圆弧: <span id="curr-curve-desc" class="ml-1 font-semibold">CCW 逆时针 ↺</span>
                            </p>
                        </div>
                    </div>

                    <!-- 已编排链路可视化 -->
                    <div class="mb-6">
                        <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">🐾 已规划轨迹流向</h3>
                        <div class="bg-slate-900/60 rounded-xl p-4 min-h-[64px] flex flex-wrap items-center gap-2 border border-slate-800" id="choreography-trail">
                            <!-- 动态追加 -->
                        </div>
                    </div>

                    <!-- 候选分支选择 -->
                    <div>
                        <h3 class="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-3">⬇️ FSM 动力学引擎推荐分支 (已排序)</h3>
                        <div class="space-y-2.5 max-h-[220px] overflow-y-auto pr-2" id="transition-options">
                            <!-- 动态加载 -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- 右侧：序列解析、多样性分析与智能生成 (占5格) -->
            <div class="lg:col-span-5 space-y-6">
                
                <!-- 编排统计卡片 -->
                <div class="ice-card rounded-2xl p-6">
                    <h2 class="text-lg font-semibold flex items-center text-teal-400 mb-4"><i class="fa-solid fa-chart-line mr-2"></i> ISU 多样性与难度度量</h2>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-slate-800/40 rounded-xl p-3 border border-slate-700/40">
                            <span class="block text-xs text-slate-400">总难度评分</span>
                            <span id="stat-total-diff" class="text-2xl font-bold text-teal-400">0</span>
                        </div>
                        <div class="bg-slate-800/40 rounded-xl p-3 border border-slate-700/40">
                            <span class="block text-xs text-slate-400">完成动作数</span>
                            <span id="stat-steps" class="text-2xl font-bold text-sky-400">0 步</span>
                        </div>
                    </div>
                    <div class="mt-4 bg-slate-850 rounded-xl p-3 border border-slate-700/50">
                        <span class="block text-xs text-slate-400 mb-2">转体多样性平衡度分析</span>
                        <div class="flex items-center justify-between mb-1.5 text-xs">
                            <span class="text-slate-300">顺时针 (CW) 次数: <strong id="stat-cw" class="text-sky-300">0</strong></span>
                            <span class="text-slate-300">逆时针 (CCW) 次数: <strong id="stat-ccw" class="text-teal-300">0</strong></span>
                        </div>
                        <div class="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
                            <div id="cw-bar" class="bg-sky-400 h-full transition-all" style="width: 50%"></div>
                            <div id="ccw-bar" class="bg-teal-400 h-full transition-all" style="width: 50%"></div>
                        </div>
                        <p id="stat-balance-p" class="text-[11px] text-slate-400 mt-2 flex items-center"><i class="fa-solid fa-info-circle mr-1 text-sky-400"></i> 请添加动作进行分析...</p>
                    </div>
                </div>

                <!-- 序列验证模块 -->
                <div class="ice-card rounded-2xl p-6">
                    <h2 class="text-lg font-semibold flex items-center text-emerald-400 mb-3"><i class="fa-solid fa-spell-check mr-2"></i> 2. 物理步法序列校验器</h2>
                    <p class="text-xs text-slate-400 mb-3">支持对任意输入的边缘状态转移序列进行分析翻译。</p>
                    <div class="space-y-3">
                        <input id="verify-input" type="text" placeholder="例: LFO -> LFI -> RFI -> RBO" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 text-slate-200">
                        <button onclick="verifySequence()" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg text-sm transition shadow-lg shadow-emerald-950/20"><i class="fa-solid fa-magnifying-glass mr-1"></i> 进行验证解析</button>
                    </div>
                    <div id="verify-result" class="mt-4 hidden">
                        <!-- 验证结果展示 -->
                    </div>
                </div>

                <!-- 智能随机路径规划 -->
                <div class="ice-card rounded-2xl p-6">
                    <h2 class="text-lg font-semibold flex items-center text-amber-400 mb-3"><i class="fa-solid fa-wand-magic-sparkles mr-2"></i> 3. DFS 惯性轨迹自动生成器</h2>
                    <p class="text-xs text-slate-400 mb-3">基于深度优先回溯规划出绝不进入“死胡同”的滑跑路径。</p>
                    <div class="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label class="block text-[10px] text-slate-400 mb-1">规划总动作步数</label>
                            <input id="gen-steps" type="number" value="6" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none text-slate-200">
                        </div>
                        <div>
                            <label class="block text-[10px] text-slate-400 mb-1">最大动作难度上限</label>
                            <input id="gen-diff" type="number" value="3" max="5" class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm outline-none text-slate-200">
                        </div>
                    </div>
                    <button onclick="generateSequence()" class="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded-lg text-sm transition"><i class="fa-solid fa-route mr-1"></i> 自动一键规划路径</button>
                </div>
            </div>
        </div>
    </div>

    <script src="js/app.js"></script>
</body>
</html>
~~~~~

#### Acts 8: 运行自动化测试，验证后端的配置重定位结果

运行 pytest 命令，校验后端 API、CLI 还有 Engine 引擎等单元测试是否依然能在新结构下，顺利加载并验证配置文件。

~~~~~act
run_command
~~~~~
~~~~~
pytest
~~~~~

### 下一步建议

- **提交当前修改**: 在验证 pytest 完全通过后，用户可以对本次结构重构和前端分离产生的变动进行一键暂存与代码提交（`git commit`）。
- **运行实机测试**: 使用命令 `fsm-skating-web` 运行后端 API 服务器，并在浏览器中打开 `http://127.0.0.1:8000` 手动测试图形界面的冰面 Canvas 轨迹连线、自适应拉伸、动作难度推荐以及自动规划生成功能是否能正常工作。
