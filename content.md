你的直觉非常准确。在 Web 开发中，如果前端代码被硬编码为访问 `127.0.0.1:8000`，那么即使你通过命令行修改了后端的监听端口，浏览器里的 JS 依然会顽固地尝试连接旧地址，从而导致你看到的“network 故障”。

我将为你生成一个 `[WIP]` 计划，将 API 地址改为**相对路径**，并动态更新 UI 上的状态显示。

## [WIP] fix(web): 移除硬编码的 API 地址以适配动态 Host/Port

### 错误分析
1.  **根因**: `web/js/api.js` 中定义了 `API_BASE = "http://127.0.0.1:8000/api"`。当后端运行在非 8000 端口（如通过 `--port 9000` 启动）时，前端依然尝试请求 8000 端口，导致连接拒绝或 CORS 错误。
2.  **UI 表现**: `index.html` 中的状态栏也是静态文本，无法真实反映当前的连接地址。

### 用户需求
修复前端的硬编码问题，确保 Web 界面无论在哪个端口或 IP 下启动都能正常通信。

### 评论
由于我们的 FastAPI 后端已经通过 `app.mount("/", StaticFiles(...))` 托管了前端文件，前端和后端实际上处于**同一个 Origin（同源）**。在这种情况下，最优雅的解法是使用相对路径 `/api`。这样浏览器会自动根据当前页面的 URL 来补全 Host 和 Port。

### 目标
1.  修改 `web/js/api.js`，将 `API_BASE` 改为相对路径。
2.  修改 `web/index.html`，为 API 状态标签添加 ID。
3.  在 `web/js/app.js` 中添加逻辑，启动时自动识别并显示当前的 `host:port`。

### 标签
#intent/fix #flow/ready #priority/high #comp/interfaces #comp/docs #scope/ux #ai/instruct #task/domain/web-integration #task/object/api-client #task/action/dynamic-binding #task/state/begin

---

### Script

#### Acts 1: 修复 API 客户端硬编码

我们将 `API_BASE` 修改为自适应的相对路径。

~~~~~act
patch_file
web/js/api.js
~~~~~
~~~~~javascript.old
export const API_BASE = "http://127.0.0.1:8000/api";
~~~~~
~~~~~javascript.new
// 使用相对路径，确保前端始终连接到承载它的同一个服务器节点（适配动态 Host/Port）
export const API_BASE = "/api";
~~~~~

#### Acts 2: 优化 UI 状态显示

首先给 `index.html` 中的标签加上 ID，以便 JS 操作。

~~~~~act
patch_file
web/index.html
~~~~~
~~~~~html.old
            <div class="mt-4 md:mt-0 flex space-x-3 text-xs">
                <span class="px-3 py-1.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800"><i class="fa-solid fa-server mr-1"></i> API Local: 127.0.0.1:8000</span>
                <span class="px-3 py-1.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800"><i class="fa-solid fa-bolt mr-1"></i> Mode: Canvas UI</span>
            </div>
~~~~~
~~~~~html.new
            <div class="mt-4 md:mt-0 flex space-x-3 text-xs">
                <span id="api-status-badge" class="px-3 py-1.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800">
                    <i class="fa-solid fa-server mr-1"></i> 
                    API: <span id="api-host-display">Detecting...</span>
                </span>
                <span class="px-3 py-1.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800"><i class="fa-solid fa-bolt mr-1"></i> Mode: Canvas UI</span>
            </div>
~~~~~

然后，在 `web/js/app.js` 中添加代码来填充这个地址。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
document.addEventListener("DOMContentLoaded", () => {
    renderer = new CanvasRenderer("skate-canvas");
    initChoreography();
~~~~~
~~~~~javascript.new
document.addEventListener("DOMContentLoaded", () => {
    renderer = new CanvasRenderer("skate-canvas");
    
    // 动态显示当前 API 地址
    const hostDisplay = document.getElementById("api-host-display");
    if (hostDisplay) {
        hostDisplay.innerText = window.location.host;
    }

    initChoreography();
~~~~~

### 下一步建议

1.  **多环境测试**: 现在你可以尝试运行 `uv run fsm-skating-web --port 9999`，打开 `localhost:9999` 后，你应该能看到界面右上角显示 `API: localhost:9999`，并且所有功能（如“推荐分支”）都能正常工作。
2.  **局域网测试**: 如果你的服务器在局域网内，使用 `--host 0.0.0.0` 启动，然后用手机访问该 IP，现在也应该能正常连接了。
3.  **正式提交**: 确认修复后，将其作为 `[COMMIT]` 提交。
