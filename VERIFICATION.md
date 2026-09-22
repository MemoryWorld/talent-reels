# 本地验收记录

日期：2026-09-23。范围：当前本地实现。本文件不把配置存在等同于外部 CI 已运行。

## 已实际通过

- `python -m pytest -q`：**8 passed**。使用临时 SQLite 文件，覆盖真实数据读取、岗位排序、筛选空结果、持久化、岗位隔离、同请求并发重放、同键不同载荷冲突、撤销顺序及无效输入。
- `npm run typecheck`：通过。
- `npm run test:client`：**4 passed**。覆盖岗位切换慢响应、加载失败时不展示旧岗位、同档案跨岗位延迟动作隔离，以及加载/失败/写入中的统一动作保护。这是组件共用状态策略测试，不冒充浏览器端到端测试。
- `npm run build`：生产构建通过，首页成功生成。
- 本地 HTTP：前端 `/` 返回 200；后端 `/api/health` 返回 SQLite / fictional-demo；前端代理 `/api/feed?job_id=infra` 正确返回 Infra 排序结果。
- `docker compose config --quiet`：配置校验通过。
- `npm ls --depth=0`：仅 7 项顶层依赖，均为版本锁定的 Next、React、TypeScript 及类型定义。
- 主任务已人工浏览器检查桌面和 390×844 窄屏布局、职位切换排序，并独立复核跨岗位状态隔离修复；这不是浏览器自动化测试。

后端测试使用已有 Python 3.12 环境执行，未修改该环境。`httpx` 测试适配和 AnyIO 别名产生两条上游弃用提示，不影响本轮测试结果。

## 未宣称完成

- 2026-09-23 补充容器验收：实际构建 `Dockerfile.api` 与 `web/Dockerfile`，在独立 Docker 网络运行前后端，首页 HTTP 200、经 Next.js 代理读取 3 个岗位与 8 个候选人通过。收藏写入独立 SQLite 数据卷，重启 API 容器后短名单仍为 1，撤销后恢复为 0。验收容器已停止，独立卷保留，不影响本机 8789 演示。
- GitHub Actions 文件已提供，但推送和远端 CI 结果由主任务核实。
- 没有真实招聘数据、线上流量、录用效果或模型性能指标；没有调用 LLM。

## 官方主源核查

- 已阅读 [Next.js rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites) 的外部目标代理说明，应用到同源 `/api` 转发。
- 已阅读 [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/) 的 TestClient / pytest 用法。
- 已阅读 [Python sqlite3](https://docs.python.org/3/library/sqlite3.html) 数据库连接及事务文档。
- 已阅读 [MDN CSS scroll snap](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll_snap) 的滚动吸附说明。

安装期间网络不稳定，采用已验证缓存和锁文件；保留明确版本以复现，没有将锁定版本称为当前最新版本。
