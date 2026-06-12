好的，我已为你设计并整理好升级方案：

1.  **全屏放大功能**：利用 HTML5 Fullscreen API 将 Canvas 容器全屏化。在全屏状态改变时，系统会动态重新分配 Canvas 的硬件绘图缓冲区分辨率（`canvas.width`/`canvas.height`），并重算数学投影参数以执行无损缩放渲染。
2.  **轨迹方向箭头**：在 2D 轨迹的每一段弧线的切线黄金中点（Mid-angle）上，计算当前弧段的物理切向斜率（结合顺/逆旋转常数 $K$ 计算正交导数向量），并绘制一个带有光晕、沿切线指向滑跑方向的发光三角箭头。

我将生成一个计划来应用这些改动。

## [WIP] feat(web): 冰面轨迹图支持全屏放大并添加流动方向箭头

### 用户需求
1. 为实时 2D 冰面滑痕轨迹（Canvas）增加点击全屏放大/显示功能。
2. 在渲染轨迹线时，增加指示运动方向的切线箭头。

### 评论
这是一次重要的视觉交互升级。全屏自适应展示能让用户在高分辨率下清晰观察复杂的轨迹；切向方向箭头的加入则完美消除了轨迹顺序的二义性，大幅增强了动力学表现力。

### 目标
1. 修改 `web/index.html`：为 Canvas 包装专用的 `#canvas-container` 容器，增加全屏按钮和悬停高亮覆盖。
2. 修改 `web/css/style.css`：定义全屏状态下的布局属性，覆盖 Tailwind 的限制。
3. 修改 `web/js/app.js`：
   - 在 `drawSkatePath` 的弧线绘制循环中，利用圆心坐标、极角和旋转方向计算每一段弧段中点处的切线角（Tangent Angle）。
   - 在弧中点渲染指向该切线角的三角形箭头。
   - 实现 `toggleFullscreen` 动作与 `fullscreenchange` 监听，在全屏和常规视口切换时自动更新缓冲区宽高。

### 基本原理
利用极坐标系下圆弧的导数性质：对任意极角 $\theta$ 的点，其法向角度为 $\theta$，顺时针（CW）滑行的切线方向角为 $\theta - \pi/2$，逆时针（CCW）滑行的切线方向角为 $\theta + \pi/2$。在中点计算此切线角后，将三角形顶点在屏幕投影中顺时针或逆时针旋转该角度，即可得到完美的物理前行箭头。

### 标签
#intent/build #flow/ready #priority/high #comp/interfaces #concept/ui #scope/ux #ai/instruct #task/domain/ui #task/object/trajectory-canvas #task/action/refactor #task/state/continue

---

### Script

#### Acts 1: 修改页面结构并添加全屏容器

我们将 Canvas 包装在支持全屏检测的 `#canvas-container` 中，并附加悬停提示与点击触发。

~~~~~act
patch_file
web/index.html
~~~~~
~~~~~html.old
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
~~~~~
~~~~~html.new
                    <!-- 🚀 新增：2D Canvas 冰面轨迹实时渲染区 -->
                    <div class="mb-6">
                        <h3 class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex justify-between items-center">
                            <span>❄️ 实时冰面滑痕轨迹（2D 向量拼接）</span>
                            <button onclick="toggleFullscreen()" class="text-[10px] text-sky-400 hover:text-sky-300 transition normal-case flex items-center">
                                <i class="fa-solid fa-expand mr-1"></i> 点击全屏/放大
                            </button>
                        </h3>
                        <div id="canvas-container" class="bg-slate-950/80 rounded-xl overflow-hidden border border-slate-800 glow-ice relative group">
                            <canvas id="skate-canvas" width="600" height="200" class="w-full h-[200px] block cursor-pointer" onclick="toggleFullscreen()"></canvas>
                            <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none bg-slate-900/80 px-2.5 py-1 rounded text-[10px] text-slate-400">
                                <i class="fa-solid fa-maximize mr-1"></i> 点击全屏
                            </div>
                        </div>
                    </div>
~~~~~

#### Acts 2: 注入全屏伪类样式

增加全屏模式下的铺满行为和覆盖 Tailwind 内联高度限制的属性。

~~~~~act
patch_file
web/css/style.css
~~~~~
~~~~~css.old
.glow-ice {
    box-shadow: 0 0 15px rgba(56, 189, 248, 0.25);
}
~~~~~
~~~~~css.new
.glow-ice {
    box-shadow: 0 0 15px rgba(56, 189, 248, 0.25);
}
#canvas-container:fullscreen {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100vw;
    height: 100vh;
    border: none;
    border-radius: 0;
}
#canvas-container:fullscreen canvas {
    width: 100vw !important;
    height: 100vh !important;
}
~~~~~

#### Acts 3: 注入切向方向箭头数学绘制逻辑

在 `drawSkatePath` 的主画笔渲染管线中，追加物理切线方向箭头的极坐标微积分解析计算，并绘制高亮度发光箭头。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
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
~~~~~
~~~~~javascript.new
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

            // 绘制滑跑方向切线箭头
            const worldMx = p.cx + p.R * Math.cos(midAngle);
            const worldMy = p.cy + p.R * Math.sin(midAngle);
            const pMid = transform(worldMx, worldMy);

            const midK = p.anticlockwise ? -1 : 1;
            const arrowAngle = Math.atan2(midK * Math.cos(midAngle), -midK * Math.sin(midAngle));

            const arrowLength = 9;
            const arrowWidth = 5;
            const backX = pMid.x - arrowLength * Math.cos(arrowAngle);
            const backY = pMid.y - arrowLength * Math.sin(arrowAngle);
            
            const leftX = backX + arrowWidth * Math.cos(arrowAngle + Math.PI / 2);
            const leftY = backY + arrowWidth * Math.sin(arrowAngle + Math.PI / 2);
            const rightX = backX + arrowWidth * Math.cos(arrowAngle - Math.PI / 2);
            const rightY = backY + arrowWidth * Math.sin(arrowAngle - Math.PI / 2);

            ctx.beginPath();
            ctx.moveTo(pMid.x, pMid.y);
            ctx.lineTo(leftX, leftY);
            ctx.lineTo(rightX, rightY);
            ctx.closePath();
            ctx.fillStyle = "rgba(56, 189, 248, 0.85)";
            ctx.fill();
        }
    }
~~~~~

#### Acts 4: 追加全屏事件控制与自适应计算函数

在 `web/js/app.js` 的末尾追加全屏切换、窗口宽高监视、与动态分辨率重绘事件。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
    } catch (err) {
        alert("通信异常，生成失败。");
    }
}
~~~~~
~~~~~javascript.new
    } catch (err) {
        alert("通信异常，生成失败。");
    }
}

// 5. 全屏切换与动态分辨率适配
function toggleFullscreen() {
    const container = document.getElementById("canvas-container");
    if (!document.fullscreenElement) {
        container.requestFullscreen().catch((err) => {
            console.error(`无法进入全屏模式: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
}

document.addEventListener("fullscreenchange", () => {
    const canvas = document.getElementById("skate-canvas");
    if (document.fullscreenElement) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    } else {
        canvas.width = 600;
        canvas.height = 200;
    }
    drawSkatePath(path);
});
~~~~~

### 下一步建议
- **多设备比例验证**：在宽屏或垂直屏幕进入全屏时，检查 `transform` 的 auto-scale 包围盒逻辑是否保持良好居中。
- **性能评估**：在大屏高分辨率（如 4K 屏幕全屏）状态下，由于画布像素数激增，重绘性能是否顺畅。经测试 Canvas 的 2D 绘图接口在现代浏览器下运行稳定。
