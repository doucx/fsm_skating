你的直觉非常敏锐！这正是导致你遇到 `network` 故障的根本原因。

当你在命令行中通过自定义参数（如 `--port 9000`）启动后端服务时，前端页面（由 FastAPI 静态资源服务托管，因此与后端共享相同的 IP 和端口）仍在尝试向硬编码的 `http://127.0.0.1:8000/api` 发送请求。这导致了跨域或连接失败。

最标准的修复方式是**在前端使用相对路径 `/api`**。这样，无论你在什么 host 或 port 上启动服务，前端都会自动适配当前的连接端点。同时，我们也可以让页面的 API 状态面板动态显示当前实际连接的地址。

我将为你生成一个 `[WIP]` 计划来修复这个问题。

## [WIP] fix(web): 消除前端 API 地址的硬编码以适配自定义 host 和 port

### 错误分析

1.  **硬编码 API 基准地址**: 在 `web/js/api.js` 中，`API_BASE` 被硬编码为 `http://127.0.0.1:8000/api`。当后端运行在非 `8000` 端口时，前端的所有 `fetch` 请求都会失效。
2.  **硬编码 UI 状态显示**: 在 `web/index.html` 中，顶部状态条展示的 `API Local: 127.0.0.1:8000` 也是静态文本，无法准确反映服务实际运行的端口。

### 用户需求
修复前端硬编码导致的连接故障，使其能够根据后端的实际部署端口和主机名动态、自适应地进行通信。

### 评论
使用相对路径是 Web 开发中处理同源/同托管服务 API 通信的标准实践。这能彻底解决因接口、代理、绑定变化带来的连接断开问题。

### 目标
1.  修改 `web/js/api.js` 中的 `API_BASE`，改用相对路径 `"/api"`。
2.  为 `web/index.html` 中的 API 状态组件添加 `id="api-endpoint-badge"`。
3.  在 `web/js/app.js` 初始化时，动态读取 `window.location.host` 填充状态，实时反馈通信端点。

### 基本原理
当静态资源与 API 服务处于同一源（Scheme + Host + Port）时，网络请求可以直接使用相对路径。例如，当你在 `http://127.0.0.1:9000/` 下访问页面，使用相对路径 `/api/transitions/...` 会自动指向 `http://127.0.0.1:9000/api/transitions/...`。

### 标签
#intent/fix #flow/ready #priority/critical #comp/interfaces #concept/sync #scope/ux #ai/instruct #task/domain/cli #task/object/endpoint-adaptation #task/action/bug-fix #task/state/begin

---

### Script

#### Acts 1: 移除 API 基准地址的硬编码

我们将 `web/js/api.js` 中的绝对 URL 更改为自适应的相对路径。

~~~~~act
patch_file
web/js/api.js
~~~~~
~~~~~javascript.old
export const API_BASE = "http://127.0.0.1:8000/api";

export async function fetchTransitions(state, maxDifficulty) {
~~~~~
~~~~~javascript.new
// 采用相对路径，自动适配后端实际绑定的 host 与 port
export const API_BASE = "/api";

export async function fetchTransitions(state, maxDifficulty) {
~~~~~

#### Acts 2: 改造状态面板为动态 DOM 节点

为 `web/index.html` 的 API 状态指示器赋予唯一的 ID 标识，以便后续由 JS 脚本接管。

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
                <span id="api-endpoint-badge" class="px-3 py-1.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800"><i class="fa-solid fa-server mr-1"></i> API: Connecting...</span>
                <span class="px-3 py-1.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800"><i class="fa-solid fa-bolt mr-1"></i> Mode: Canvas UI</span>
            </div>
~~~~~

#### Acts 3: 注入动态感知逻辑

在 `web/js/app.js` 的生命周期入口处，动态获取浏览器地址栏的主机名和端口，重写面板信息。

~~~~~act
patch_file
web/js/app.js
~~~~~
~~~~~javascript.old
document.addEventListener("DOMContentLoaded", () => {
    renderer = new CanvasRenderer("skate-canvas");
    initChoreography();
    initInteraction();

    // 显式挂载动作方法至 window 作用域，确保完美支持 HTML 原生 inline onClick / onChange
~~~~~
~~~~~javascript.new
document.addEventListener("DOMContentLoaded", () => {
    renderer = new CanvasRenderer("skate-canvas");
    initChoreography();
    initInteraction();

    // 动态同步当前 API 实际访问端点
    const apiBadge = document.getElementById("api-endpoint-badge");
    if (apiBadge) {
        apiBadge.innerHTML = `<i class="fa-solid fa-server mr-1"></i> API: ${window.location.host}`;
    }

    // 显式挂载动作方法至 window 作用域，确保完美支持 HTML 原生 inline onClick / onChange
~~~~~

### 下一步建议

- **测试连通性**: 重启你的后端服务（如 `uv run fsm-skating-web --port 8080`），然后在浏览器中访问 `http://127.0.0.1:8080`。确认右上角的状态面板已显示 `API: 127.0.0.1:8080`，且推荐步法能顺畅加载，无 Network 报错。
- **Git 提交**: 验证通过后，请通知我生成 `[COMMIT]` 计划来合并本次 Bug 修复。
