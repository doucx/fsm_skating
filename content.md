## [COMMIT] chore: 重构项目目录结构并将前端资源分离，优化配置文件管理

### 评论
此次重构成功地将配置文件移至 `config/` 目录，并实现了前端 HTML、CSS 和 JS 的代码分离。这不仅提升了项目的可读性和专业性，还为后续可能的静态资源托管和配置热加载提供了基础。所有测试用例已验证通过，系统运行状态稳定。

### 目标
1. 完成项目结构优化（目录移动、资源拆分）。
2. 更新代码中的配置引用路径。
3. 确保所有单元测试覆盖路径变更后的逻辑。

### 基本原理
通过执行一系列文件搬迁 (`move_file`) 和内容 patch (`patch_file`) 操作，我们在不改变核心功能逻辑的前提下，规范化了项目的目录树。通过 `pytest` 的自动化回归测试，确保了路径变更未破坏现有的业务逻辑和配置读取行为。

### 标签
#intent/tooling #flow/ready #priority/medium
#comp/build #comp/tests #comp/cli #concept/config #scope/dx
#ai/delegate
#task/domain/ui
#task/object/frontend-and-config-structure
#task/action/refactor
#task/state/end
#task/status/completed

---

### Script

#### Acts 1: 暂存变更并执行提交

我们将本次重构的所有变动（包括移动的文件、更新的路径引用以及新创建的 CSS/JS 文件）暂存并提交至 Git 仓库。

~~~~~act
git_add
config/moves_config.yaml
src/fsm_skating/api/main.py
src/fsm_skating/cli/main.py
tests/test_engine.py
web/css/style.css
web/js/app.js
web/index.html
~~~~~

~~~~~act
git_commit
~~~~~
~~~~~text
chore(refactor): restructure project directories and decouple frontend

- Moved 'moves_config.yaml' to 'config/' directory.
- Updated all backend references (API, CLI, Engine) to point to the new configuration location.
- Decoupled 'web/index.html' into separate 'css/style.css' and 'js/app.js' files.
- Adjusted unit tests to reflect the new directory structure.
- Verified system integrity with pytest.
~~~~~

### 下一步建议
- **前端扩展**: 如果后续需要引入大型组件库或构建工具，可以考虑在该项目根目录下初始化 `package.json` 或配置 `webpack/vite` 来对 `web/` 下的资源进行自动化打包与压缩。
- **配置文档**: 建议在 `README.md` 中说明 `config/moves_config.yaml` 的结构，方便其他开发者快速上手动作库的配置扩展。
