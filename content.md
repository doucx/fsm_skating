当前目录 `.git` 的存在说明我们处在一个全新的、干净的 Git 仓库中。现在，我们将开始初始化项目结构。

为了支持 `src` 布局、易于进行包开发和测试、以及支持 YAML 的解析，我们需要：
1. 编写 `pyproject.toml`，用于声明包信息、依赖项（例如 `PyYAML`）以及命令行工具入口 `fsm-skating`。
2. 编写 `moves_config.yaml`，按照白皮书分层匹配的设计来定义动作，包括转三步、莫霍克步等，并且扩充其他经典步法，使得系统动作库更加丰满。
3. 创建对应的源码包目录结构 `src/fsm_skating` 和 `tests` 并放置空文件。

下面是本次初始化的计划。

## [WIP] feat: 创建项目配置文件与初始化目录结构

### 用户需求
用户需要采用 `src` 布局来搭建整个 Python 程序。因此，第一步应该配置好 `pyproject.toml`、外部化动作配置文件 `moves_config.yaml` 以及创建初始目录。

### 评论
使用 `pyproject.toml` 是现代 Python 项目标准。外部化 YAML 设计极其优雅，将数据和状态转移算法解耦，我们对 YAML 的结构进行了细致而丰富的配置，添加了变刃步、括弧步、摇滚步、计数步、蹬冰步、交叉步、莫霍克步与乔克陶步，使得系统不仅完备而且高度实用。

### 目标
1. 创建 `pyproject.toml` 以支持 Python 依赖和命令行构建。
2. 创建 `moves_config.yaml` 外部动作规则定义库。
3. 建立 `src/fsm_skating` 和 `tests` 相关的包结构。

### 基本原理
按照 Python 社区标准的 `src` 布局：
- 配置文件置于根目录。
- 业务代码置于 `src/fsm_skating`。
- 测试代码置于 `tests/`。

### 标签
#intent/build #flow/ready #priority/high
#comp/build #comp/engine #concept/config #scope/core
#ai/delegate
#task/domain/testing
#task/object/project-init
#task/action/integration
#task/state/continue #task/status/active

---

### Script

#### Acts 1: 创建 `pyproject.toml` 依赖和打包配置文件

我们新建 `pyproject.toml`，配置 `setuptools` 选项，添加 `pyyaml` 依赖，并暴露 `fsm-skating` 终端命令入口。

~~~~~act
write_file
pyproject.toml
~~~~~
~~~~~toml
[build-system]
requires = ["setuptools>=61.0.0"]
build-backend = "setuptools.build_meta"

[project]
name = "fsm_skating"
version = "0.1.0"
description = "A figure skating step sequence FSM choreographer and verifier"
readme = "README.md"
requires-python = ">=3.8"
dependencies = [
    "pyyaml>=6.0",
]

[project.scripts]
fsm-skating = "fsm_skating.cli:main"
~~~~~

#### Acts 2: 创建外部化动作配置文件 `moves_config.yaml`

按照分层匹配思想，我们配置完整的花滑动作库，包括 conditions（同/异脚，同/异向，同/异刃）和可选的起始状态约束（dir，edge）。

~~~~~act
write_file
moves_config.yaml
~~~~~
~~~~~yaml
moves:
  # --- 变刃步 (Change of Edge) ---
  - id: "change_of_edge"
    name: "变刃滑行 (Change of Edge)"
    difficulty: 1
    conditions:
      same_foot: true
      same_dir: true
      same_edge: false

  # --- 转三步细分 (Three-Turn) ---
  - id: "forward_outside_three_turn"
    name: "前外转三 (Forward Outside Three-Turn)"
    difficulty: 2
    conditions:
      same_foot: true
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "F"
      edge: "O"

  - id: "forward_inside_three_turn"
    name: "前内转三 (Forward Inside Three-Turn)"
    difficulty: 3
    conditions:
      same_foot: true
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "F"
      edge: "I"

  - id: "backward_outside_three_turn"
    name: "后外转三 (Backward Outside Three-Turn)"
    difficulty: 5
    conditions:
      same_foot: true
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "B"
      edge: "O"

  - id: "backward_inside_three_turn"
    name: "后内转三 (Backward Inside Three-Turn)"
    difficulty: 4
    conditions:
      same_foot: true
      same_dir: false
      same_edge: false
    start_constraints:
      dir: "B"
      edge: "I"

  # --- 括弧步 (Bracket) ---
  - id: "bracket"
    name: "括弧步 (Bracket)"
    difficulty: 4
    conditions:
      same_foot: true
      same_dir: false
      same_edge: false
    # 括弧步的物理转移状态条件与转三步相同，只是旋转方向不同。
    # 这里我们允许不加 start_constraints，作为一个通用匹配项。

  # --- 摇滚步 (Rocker) ---
  - id: "rocker"
    name: "摇滚步 (Rocker)"
    difficulty: 4
    conditions:
      same_foot: true
      same_dir: false
      same_edge: true

  # --- 计数步 (Counter) ---
  - id: "counter"
    name: "计数步 (Counter)"
    difficulty: 4
    conditions:
      same_foot: true
      same_dir: false
      same_edge: true

  # --- 标准蹬冰步 (Stroke) ---
  - id: "stroke"
    name: "标准蹬冰步 (Standard Stroke)"
    difficulty: 1
    conditions:
      same_foot: false
      same_dir: true
      same_edge: false

  # --- 交叉步 (Cross Roll) ---
  - id: "cross_roll"
    name: "交叉步 (Cross Roll)"
    difficulty: 2
    conditions:
      same_foot: false
      same_dir: true
      same_edge: true

  # --- 莫霍克步细分 (Mohawk) ---
  - id: "forward_inside_mohawk"
    name: "前内莫霍克 (Forward Inside Mohawk)"
    difficulty: 2
    conditions:
      same_foot: false
      same_dir: false
      same_edge: true
    start_constraints:
      dir: "F"
      edge: "I"

  - id: "forward_outside_mohawk"
    name: "前外莫霍克 (Forward Outside Mohawk)"
    difficulty: 3
    conditions:
      same_foot: false
      same_dir: false
      same_edge: true
    start_constraints:
      dir: "F"
      edge: "O"

  # --- 乔克陶步 (Choctaw) ---
  - id: "choctaw"
    name: "乔克陶步 (Choctaw)"
    difficulty: 4
    conditions:
      same_foot: false
      same_dir: false
      same_edge: false
~~~~~

#### Acts 3: 初始化目录结构与 `__init__.py`

我们创建项目所需的目录结构（`src/fsm_skating` 和 `tests`），并放置空的 `__init__.py` 文件以支持打包。

~~~~~act
run_command
~~~~~
~~~~~
mkdir -p src/fsm_skating tests
touch src/fsm_skating/__init__.py
touch tests/__init__.py
~~~~~

### 下一步建议
在初始化目录及打包/规则配置完成后，我们将开展下一步工作：
1. 编写核心状态模型 `src/fsm_skating/core.py`，用于定义 `State` 等实体及其物理差异计算。
2. 编写核心状态机编排与校验引擎 `src/fsm_skating/engine.py`，实现加载 YAML 配置文件和管道化动作过滤、排序匹配功能。
