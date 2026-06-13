# ⛸️ FSM Skating: 花样滑冰步法智能编排沙盒

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-05998b.svg)](https://fastapi.tiangolo.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.0-38bdf8.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **基于有限状态机 (FSM) 的花样滑冰动力学编排、验证与 2D 轨迹可视化系统。**

`FSM Skating` 是一个专为花样滑冰爱好者与教练设计的辅助工具。它将复杂的滑冰步法（转三、括弧、摇滚、计数等）抽象为数学上的有限状态机模型，能够自动校验步法序列的物理合法性，并实时生成优雅的冰面轨迹。

---

## ✨ 核心特性

- **🌀 动力学校验引擎 (Physics Engine)**: 基于 (脚, 方向, 刃) 的状态转移模型，严谨校验每一处物理变刃与变向。
- **🤖 智能路径规划 (DFS Auto-Choreographer)**: 使用深度优先搜索算法，在设定的难度阈值内自动规划不进入“死胡同”的连贯滑跑路径。
- **📊 ISU 多样性度量**: 自动统计顺/逆时针旋转比例，分析编排的均衡度，符合国际滑联 (ISU) 的难度评级参考。
- **❄️ 2D 轨迹实时渲染**: 基于 HTML5 Canvas 渲染高精度的冰面弧线，支持前后向虚实线显示与专业 ISU 符号标注。
- **🎮 多端交互体验**:
  - **CLI 终端**: 极客风格的交互式编排与库完整性诊断。
  - **Web Sandbox**: 包含播放控制、进度拖拽、全屏 HUD 看板的现代 Web 界面。

---

## 🚀 快速开始

项目使用 [uv](https://github.com/astral-sh/uv) 进行依赖管理，确保环境极致纯净且快速。

### 1. 环境准备
```bash
# 克隆仓库
git clone https://github.com/your-username/fsm_skating.git
cd fsm_skating

# 同步依赖
uv sync
```

### 2. 启动交互式命令行 (CLI)
```bash
# 进入手动编排、序列验证或库诊断模式
uv run fsm-skating
```

### 3. 启动 Web 可视化沙盒 (Web UI)
```bash
# 启动 API 服务与 Web 静态托管
uv run fsm-skating-web --port 8000
```
访问：`http://127.0.0.1:8000` 即可开启冰面编排之旅。

---

## 🏗️ 架构说明

项目遵循轻量级的 **领域驱动设计 (DDD)** 架构，逻辑分层清晰：

- **`domain/` (领域层)**: 定义 `State` 模型、物理翻转逻辑与自然圆弧计算。不依赖任何外部框架。
- **`services/` (服务层)**: `ChoreographyEngine` 核心逻辑，处理路径搜索、配置加载与序列翻译。
- **`api/` (接口层)**: 使用 FastAPI 暴露 REST 接口，支持跨域访问。
- **`cli/` (表现层 - 终端)**: 基于 `argparse` 的分模块命令行工具。
- **`web/` (表现层 - 前端)**:
  - `canvasRenderer.js`: 负责物理坐标到 Canvas 像素的投影转换。
  - `state.js`: 轨迹几何算法，纠正 Y 轴向下坐标系的弧线渲染。

---

## ⚙️ 动作库配置

你可以通过修改 `config/moves_config.yaml` 轻松扩展动作库。每个动作包含：
- `conditions`: 描述脚、向、刃的相对变化。
- `start_constraints`: 限定起滑的初始状态（如必须前外刃起步）。
- `geometry_config`: 调整该动作在画布上的圆弧半径因子与张角因子。

---

## 🛠️ 技术栈

- **Backend**: Python 3.8+, FastAPI, Pydantic v2, PyYAML
- **Frontend**: Vanilla JS (ES6 Modules), Tailwind CSS, FontAwesome 6
- **Tooling**: `uv` (Build System), `pytest` (Testing)

---

## ⚖️ 开源协议

本项目采用 [MIT License](LICENSE) 许可协议。

---
*滑行愉快！保持内外刃平衡。❄️*