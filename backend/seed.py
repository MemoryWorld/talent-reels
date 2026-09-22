"""Entirely fictional portfolios. No real candidate or employer data."""

JOBS = [
    {"id": "agent", "title": "AI 应用 / Agent 工程师", "team": "产品研发 · 杉影实验室", "summary": "把可靠的 AI 能力带进真实产品，连接工具、检索和用户体验。", "required": ["Python", "TypeScript", "Agent", "RAG"], "preferred": ["FastAPI", "评测", "React"], "evidence_types": ["code", "demo"]},
    {"id": "llm", "title": "大模型算法工程师", "team": "模型研究 · 杉影实验室", "summary": "围绕检索、后训练和可复现评测，改善模型在具体任务上的表现。", "required": ["Python", "PyTorch", "RAG", "评测"], "preferred": ["SFT", "向量检索", "Agent"], "evidence_types": ["code", "study"]},
    {"id": "infra", "title": "AI Infra 工程师", "team": "基础架构 · 杉影实验室", "summary": "关注推理延迟、资源利用和工程可观测性，提供稳定的模型服务。", "required": ["Python", "CUDA", "推理优化", "Docker"], "preferred": ["C++", "PyTorch", "可观测性"], "evidence_types": ["code", "study"]},
]


def evidence(id, title, kind, summary, details, tools):
    return {"id": id, "title": title, "type": kind, "summary": summary, "details": details, "tools": tools}


CANDIDATES = [
    {"id": "a01", "alias": "知行", "code": "A01", "headline": "让 Agent 从回答问题，走到可靠地完成任务。", "summary": "关注工具调用边界、检索质量和产品交付。喜欢把一次失败拆成可观测、可复现、可改进的步骤。", "focus": "Agent 应用与全栈交付", "skills": ["Python", "TypeScript", "Agent", "RAG", "FastAPI", "React", "评测", "Docker"], "theme": "teal", "project": "Atlas · 研究助理工作台", "project_subtitle": "从资料到可追溯的回答", "visual": "pipeline", "evidence": [
        evidence("a01-1", "工具执行与人工确认", "code", "把检索、引用和有副作用的动作拆成不同执行路径。", ["工具输入先经过结构校验，再进入执行队列。", "写入动作生成待确认记录，重复请求使用同一幂等键。", "失败保留 trace 与错误类型，便于人工定位。"], ["Python", "FastAPI", "SQLite"]),
        evidence("a01-2", "端到端交互演示", "demo", "在同一个界面查看检索片段、引用来源和工具执行状态。", ["流式状态反馈覆盖加载、失败和重试。", "答案引用可定位到选中的知识片段。", "人工确认与 Agent 建议有独立视觉状态。"], ["React", "TypeScript", "RAG"]),
        evidence("a01-3", "失败类型评测说明", "study", "用固定任务集拆分检索错误、引用错误和工具参数错误。", ["每条任务保存输入、预期约束及工具事件。", "内容正确性与执行有效性分开记录。", "该页面为虚构工作样例，不代表真实基准成绩。"], ["评测", "Agent"]),
    ]},
    {"id": "a02", "alias": "林予", "code": "A02", "headline": "把复杂流程，变成一眼能理解的产品。", "summary": "习惯从用户任务出发设计 AI 工作台，连接前端状态、后端数据和可控的工具执行。", "focus": "AI 产品与交互工程", "skills": ["TypeScript", "React", "Agent", "Python", "FastAPI", "可观测性"], "theme": "purple", "project": "Orbit · 团队自动化工作台", "project_subtitle": "每一个动作都有来路", "visual": "workspace", "evidence": [
        evidence("a02-1", "流程编排交互原型", "demo", "将工具步骤、人工节点和执行结果放在可追踪的任务流里。", ["键盘可完成流程选择与任务详情查看。", "离线、空列表和权限不足有独立状态。", "不让模型输出直接触发外部写入。"], ["React", "TypeScript"]),
        evidence("a02-2", "任务状态与事件接口", "code", "用事件记录解释任务当前处于哪一步。", ["任务状态与展示状态通过类型契约连接。", "接口请求失败后保留上一份有效数据。", "记录工具名称、耗时与错误分类。"], ["FastAPI", "Agent", "可观测性"]),
    ]},
    {"id": "a03", "alias": "沈序", "code": "A03", "headline": "不只看一个总分，也看模型为什么做错。", "summary": "侧重检索与训练实验的可复现性，用明确的数据切分和对照设置解释模型变化。", "focus": "检索与大模型评测", "skills": ["Python", "PyTorch", "RAG", "评测", "SFT", "向量检索"], "theme": "amber", "project": "Lens · 检索实验台", "project_subtitle": "让每次实验都有对照", "visual": "retrieval", "evidence": [
        evidence("a03-1", "检索与重排流水线", "code", "分别记录召回、重排和答案生成阶段的输入输出。", ["稀疏与稠密检索结果通过统一格式合并。", "保存检索片段及来源文档标识。", "模型、参数与数据版本随实验一起记录。"], ["Python", "PyTorch", "向量检索"]),
        evidence("a03-2", "后训练实验设计", "study", "对训练数据、验证集和最终测试集做独立约束。", ["先固定测试集合，再选择训练设置。", "不同提示词使用相同样本，保留逐项差异。", "只展示实验结构，不编造性能提升数字。"], ["SFT", "评测", "RAG"]),
    ]},
    {"id": "a04", "alias": "陈岚", "code": "A04", "headline": "让每一次推理，都能被测量和解释。", "summary": "把性能问题拆成排队、计算和数据搬运，关注工作负载下可复现的系统行为。", "focus": "模型服务与性能工程", "skills": ["Python", "CUDA", "推理优化", "Docker", "C++", "PyTorch", "可观测性"], "theme": "blue", "project": "Pulse · 推理观测台", "project_subtitle": "从请求，到 GPU 的每一程", "visual": "metrics", "evidence": [
        evidence("a04-1", "负载与指标采集器", "code", "分开观测首 token 延迟、请求时长和队列长度。", ["负载参数与原始记录一起存档。", "预热请求与正式采样区分统计。", "失败请求和超时不会从报表中静默消失。"], ["Python", "Docker", "可观测性"]),
        evidence("a04-2", "算子对照实验笔记", "study", "先确认数值一致性，再讨论算子耗时。", ["覆盖边界尺寸与不同数据类型。", "同步设备后进行独立重复测量。", "曲线仅作为界面示意，不是实测基准。"], ["CUDA", "C++", "PyTorch"]),
    ]},
    {"id": "a05", "alias": "许应", "code": "A05", "headline": "把知识库做成可以维护的产品。", "summary": "专注文档处理、检索接口与反馈闭环，喜欢通过用户实际遇到的问题改进检索体验。", "focus": "知识检索与应用后端", "skills": ["Python", "RAG", "FastAPI", "向量检索", "Docker", "评测"], "theme": "rose", "project": "Index · 知识检索服务", "project_subtitle": "答案之后，看见来源", "visual": "retrieval", "evidence": [
        evidence("a05-1", "文档到片段的数据链路", "code", "给原文、切片和索引记录分配可追踪的关联标识。", ["保留原文版本及切片参数。", "索引更新支持重复运行而不重复入库。", "检索响应同时返回片段与来源。"], ["Python", "RAG", "向量检索"]),
        evidence("a05-2", "检索反馈界面", "demo", "让用户指出答案未覆盖的问题和引用不准确的地方。", ["反馈关联到一次具体请求。", "错误样本进入待检查列表，不直接改写答案。", "知识更新后能够回看原有反馈。"], ["FastAPI", "评测"]),
    ]},
    {"id": "a06", "alias": "陆澈", "code": "A06", "headline": "把实验代码，变成稳定可交付的服务。", "summary": "擅长连接数据接口、异步任务和应用页面，在小型系统里认真处理失败与恢复。", "focus": "AI 全栈与工程可靠性", "skills": ["Python", "TypeScript", "React", "FastAPI", "Docker", "可观测性"], "theme": "mint", "project": "Relay · 异步任务控制台", "project_subtitle": "状态明确，失败可恢复", "visual": "workspace", "evidence": [
        evidence("a06-1", "任务队列与幂等接口", "code", "相同输入重试时复用同一业务任务。", ["状态转移通过显式规则校验。", "失败结果与业务数据在同一事务边界内处理。", "前端根据服务端状态恢复任务列表。"], ["Python", "FastAPI", "Docker"]),
        evidence("a06-2", "工作台交互与可访问性", "demo", "从键盘导航到错误恢复都有可见反馈。", ["交互元素包含可访问名称。", "切换任务时不会丢失当前筛选条件。", "空状态提供可执行的下一步操作。"], ["TypeScript", "React"]),
    ]},
    {"id": "a07", "alias": "江笙", "code": "A07", "headline": "用小而明确的实验，回答训练里的大问题。", "summary": "关注监督微调、错误分析和数据质量，让实验设计可以被复查。", "focus": "模型训练与数据质量", "skills": ["Python", "PyTorch", "SFT", "评测", "Docker"], "theme": "purple", "project": "Fold · 训练实验记录簿", "project_subtitle": "数据、配置与结果一起记录", "visual": "metrics", "evidence": [
        evidence("a07-1", "训练配置与数据校验", "code", "训练前检查输入结构、重复样本和切分重叠。", ["配置、种子和数据版本随运行保存。", "异常样本单独列出并说明原因。", "训练集和测试集使用独立加载入口。"], ["Python", "PyTorch", "SFT"]),
        evidence("a07-2", "逐项错误分析说明", "study", "将同一任务上的输出差异与实际约束对齐。", ["保留失败例子，避免只选展示性案例。", "将格式错误与内容错误分开记录。", "示例仅用于演示分析流程。"], ["评测", "SFT"]),
    ]},
    {"id": "a08", "alias": "苏问", "code": "A08", "headline": "工具能调用，更要知道何时停下来。", "summary": "围绕 Agent 的工具权限、记忆记录和人工介入设计清晰的执行边界。", "focus": "Agent 运行时与评测", "skills": ["Python", "Agent", "RAG", "评测", "FastAPI", "可观测性"], "theme": "blue", "project": "Boundary · Agent 执行沙盒", "project_subtitle": "把工具行为变得可检查", "visual": "pipeline", "evidence": [
        evidence("a08-1", "工具协议与执行轨迹", "code", "将建议动作、已执行动作和最终结果分开保存。", ["工具输入输出保留结构化记录。", "未知工具和无效参数在执行前被阻止。", "副作用操作需要独立的确认步骤。"], ["Agent", "Python", "FastAPI"]),
        evidence("a08-2", "故障注入与回放设计", "study", "用确定的失败条件检查中途停止与恢复行为。", ["模拟工具超时和无效响应。", "恢复时先检查已有结果，避免重复动作。", "明确本地演示与分布式生产环境的差别。"], ["评测", "可观测性"]),
    ]},
]
