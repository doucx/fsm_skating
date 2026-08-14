# ⛸️ FSM Skating: 花样滑冰步法智能编排沙盒 (Pure SPA / PWA)

[![Vite](https://img.shields.io/badge/Vite-5.0-646cff.svg)](https://vitejs.dev/)
[![Preact](https://img.shields.io/badge/Preact-10.0-673ab8.svg)](https://preactjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Vitest-1.0-bcc360.svg)](https://vitest.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.0-38bdf8.svg)](https://tailwindcss.com/)

> **基于有限状态机 (FSM) 的花样滑冰动力学编排、验证与 2D 轨迹可视化系统（纯前端 PWA 单页应用）。**

`FSM Skating` 是一个专为花样滑冰爱好者与教练设计的辅助工具。它将复杂的滑冰步法（转三、括弧、摇滚、计数等）抽象为数学上的有限状态机模型，能够自动校验步法序列的物理合法性，并实时生成优雅的冰面欧拉螺线轨迹。

---

## ✨ 核心特性

- **⚡ 100% 纯前端架构**: 移除服务端依赖，算法与数据完全运行于浏览器，支持秒开与跨平台/移动端（如 Termux）部署。
- **📱 PWA 离线支持**: 支持离线缓存，可一键添加至手机/桌面主屏幕作为原生 App 使用。
- **🌀 动力学校验引擎**: 基于 (脚, 方向, 刃) 的状态转移模型，严谨校验每一处物理变刃与变向。
- **🤖 A* 启发式路径搜索**: 前端原生 Min-Heap 算法，支持自定义步数代价、难度奖励、方向失调及多样性惩罚权重。
- **📊 ISU 多样性度量**: 自动统计顺/逆时针旋转比例，分析编排的均衡度，符合国际滑联 (ISU) 的难度评级参考。
- **❄️ 2D 欧拉螺线轨迹渲染**: 基于 HTML5 Canvas 渲染高精度的冰面弧线，支持手势缩放、全屏 HUD 看板与 1D 线性时间轴。

---

## 🚀 快速开始

开发与构建使用 **Node.js** 环境。

### 1. 安装依赖
```bash
npm install
```

### 2. 启动本地开发服务
```bash
npm run dev
```
访问：`http://localhost:5173` 即可开始编排。

### 3. 运行单元测试
```bash
npm test
```

### 4. 生产打包
```bash
npm run build
```
打包产物将输出在 `dist/` 目录，可直接零成本托管于 GitHub Pages、Vercel、Netlify 或 Cloudflare Pages。

---

## ⚖️ 开源协议

本项目采用 [MIT License](LICENSE) 许可协议。

---
*滑行愉快！保持内外刃平衡。❄️*