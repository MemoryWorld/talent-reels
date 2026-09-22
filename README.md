# Talent Reels

**看见作品背后的人。** 面向 HR 的竖向候选人信息流：按岗位浏览技能与工作样例，查看透明的内容匹配说明，手动建立短名单。

这是依据项目作者对 LYCA 黑客松项目的描述重新实现的演示，**不是当年获奖项目的原始源码**。仓库本身不作为获奖证据。全部候选人、公司、项目和作品结构均为虚构；不含真实求职者信息、外部图片或需要密钥的模型调用。

## 使用体验

- 竖向 scroll snap 卡片、上下方向键和翻页按钮；移动端提供底部发现/短名单导航。
- 三个演示岗位：AI 应用 / Agent、大模型算法、AI Infra。切换岗位重排候选人，短名单和跳过记录互相独立。
- 技能、作品类型和关键词筛选；完整加载、空列表、API 错误、重试和状态提示。
- 工作样例弹层展示实现思路、工具和进一步交流的问题；不伪装成真实作品仓库。
- 收藏、移出、跳过和撤销通过真实 API 写入 SQLite；偏好和操作在重启后保留。

## 排序如何工作

只计算材料与职位的**内容相关性**：

| 部分 | 分值 | 计算 |
|---|---:|---|
| 核心技能 | 65 | 已展示核心技能数 / 岗位核心技能数 |
| 加分技能 | 20 | 已展示加分技能数 / 岗位加分技能数 |
| 工作样例类型 | 15 | 已展示的期望样例类型数 / 岗位期望类型数 |

各分量先保留一位小数，总分使用 Python `round` 取整；同分按稳定的档案 ID 排序。姓名、年龄、性别、国籍、学校等身份属性不参与排序；除用于展示的虚构姓名外，样例数据不包含上述属性。缺少材料不代表不具备能力；分数不是录用概率、能力测评或自动淘汰结果。摘要和匹配解释来自确定的规则，不调用 LLM 或 Agent。HR 自行阅读和判断。

## 本地运行

要求 Python 3.12+、Node.js 24。首次安装依赖需要联网或已有完整缓存；**安装之后运行不需要外网或任何 API key**。

```powershell
py -3.12 -m venv .venv
.venv\Scripts\python -m pip install -r backend/requirements-dev.txt
cd web
npm ci
cd ..
.\start.ps1
```

macOS / Linux：

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r backend/requirements-dev.txt
cd web && npm ci && cd ..
.venv/bin/python scripts/start.py
```

打开 <http://127.0.0.1:8789>。API 文档在 <http://127.0.0.1:8790/docs>。一键启动脚本会检查端口，Ctrl+C 关闭自己启动的子进程。

也可分别启动：

```sh
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8790
# 在另一个终端
cd web
npm run dev
```

生产前端构建可用 `npm run build`、`npm run start`。后端默认数据库为 `data/talent-reels.db`，可通过 `TALENT_REELS_DB` 指向其他本地位置；前端构建时 `API_ORIGIN` 默认为 `http://127.0.0.1:8790`。

## Docker

```sh
docker compose up --build
```

浏览器地址仍为 <http://127.0.0.1:8789>，SQLite 存储在 `talent-data` volume。首次构建需要获取基础镜像和依赖。容器端口仅绑定宿主机回环地址。

## 接口与可靠性

- `GET /api/bootstrap`：岗位、技能目录、持久化偏好。
- `GET /api/feed`：岗位、关键词、技能、作品类型、发现/短名单视图。
- `PUT /api/preferences`：保存当前筛选与目标职位。
- `POST /api/actions`：`shortlist` / `remove` / `skip`。
- `POST /api/actions/{event_id}/undo`：恢复该动作之前的状态。

所有状态都在 SQLite，不使用前端静态 mock 代替 API。写事务采用 `BEGIN IMMEDIATE`，动作带唯一 `request_id`：同编号同请求返回已有事件，不重复写入；同编号不同请求返回 409。旧事件不能覆盖同一候选人的更新操作；重复撤销是幂等的。浏览请求使用 AbortController 防止过期结果覆盖新岗位，动作成功前不显示本地假成功。状态仅影响当前岗位的本地发现视图。

## 测试

```sh
python -m pytest -q
cd web
npm run typecheck
npm run test:client
npm run build
```

API 回归覆盖真实数据库读取、排序及筛选、岗位隔离、重启持久化、并发同键重放、冲突请求、撤销的顺序与幂等、无效输入拒绝。前端状态回归覆盖慢响应、岗位加载失败、旧岗位延迟动作、统一写入保护。CI 同时执行这些测试、TypeScript 检查和 Next.js 构建。前端状态测试不等于浏览器端到端测试；浏览器交互和移动端布局需在本地运行后验收。Docker 构建单独依赖可用的 Docker 环境。

## 技术与边界

Next.js 16.2.4 / React 19.2.4 / TypeScript 5.9.3；FastAPI 0.141.1 / Uvicorn 0.53.0 / Python SQLite。版本锁定是为了复现，未宣称所有依赖都是最新发布。产品页面不使用 Google Fonts、远程图片、CDN 或外部模型请求；辅助接口文档 `/docs` 使用 FastAPI 默认的公共 CDN 资源，`/openapi.json` 不依赖 CDN。

此版本是**单工作区、本机演示**：不包含用户认证、多租户隔离、真实招聘数据导入、ATS 集成、简历解析或实际模型推理。不应直接公开部署为处理真实候选人资料的服务。演示排序用于说明交互与可解释方法，没有经过真实招聘数据验证。

官方参考：

- [Next.js 安装与运行要求](https://nextjs.org/docs/app/getting-started/installation)
- [Next.js rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites)
- [FastAPI 测试](https://fastapi.tiangolo.com/tutorial/testing/)
- [Python sqlite3 事务](https://docs.python.org/3/library/sqlite3.html)
- [MDN CSS scroll snap](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll_snap)

## 验收路径

1. 打开发现页，查看第一张卡片、相关性拆分和作品弹层。
2. 加入短名单，切到「我的短名单」，刷新页面确认保留。
3. 切换 AI Infra 岗位，确认排序变化且短名单独立。
4. 搜索不存在的词，检查空状态；清空恢复。
5. 跳过一位候选人，再撤销；确认恢复原来的收藏状态。
6. 使用上下键与手机宽度浏览；停止后端检查错误与重试提示。
