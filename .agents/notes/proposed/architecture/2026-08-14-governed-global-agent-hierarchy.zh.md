# Agent Note: 受治理的全局 agent 层级

Status: proposed

[English](2026-08-14-governed-global-agent-hierarchy.md) | 中文

## Problem

Harness 已经可以通过 per-session preset（单会话预设）组合不同 agent（智能体），用 persona（角色提示词）、可见工具过滤器和深度限制约束进程内 subagent，并加载全局与项目指令。这些机制决定模型能看到什么，却不表示谁有权授予权限、用户授权了哪个阶段，也不表示父级及其所有后代如何共享一份资源预算。现有 subagent 组合决策明确指出，工具可见性并不是权限。

这一缺口产生两类用户可见故障。第一，模型可能把“先预估”之类的阶段约束弱化为实施许可；一次已观察到的 turn（轮次）在用户纠正前执行了九次变更操作。第二，同一个模型自行判断继续推理或检索是否有价值，也自行决定能否再消耗一次请求；一次已观察到的价格任务发起了 45 次搜索，其中 14 次发生在用户提供官方来源之后，最终只因用户中断才结束。

只修改提示词无法消除任何一类故障。误读指令的模型仍会成为判断自身是否遵循指令的组件，而让 child（子级）监管自己的工具，也会允许它扩大或重新解释本应执行的策略。持久的设计需要唯一 root（根级）所有者、项目级约束、系统拥有的 child 角色，以及位于所有模型之外的确定性授权机制。

## Proposal

增加受治理的层级，复用 agent preset、作用域注册表、项目指令发现、subagent provider（提供方）、审批和工具拦截。它不增加新的核心模型工具。一个全局 main-agent（主 agent）profile（配置档）拥有委派和最终用户沟通；项目策略针对一个 workspace（工作区）收紧该 profile；不可删除的系统目录定义四个可调整 child 角色；host（宿主）侧 governor（治理器）对完整委派树强制执行阶段、权限和聚合预算。

### 全局主 agent 管理

部署提供一个由现有 agent-preset 组合支撑、id 为 `main` 的特殊 profile。用户可以通过全局 settings（设置）overlay（覆盖层）选择其他模型、推理强度、提示词覆盖、预算和启用的 capability（能力）组，也可以把每个字段恢复为随产品提供的值。随产品提供的 profile id 和恢复副本不能删除或重命名。

主 agent 拥有任务解释、当前阶段、分解、委派、综合、实施、验证协调和最终响应。它可以让系统 child 执行有界工作，但仍对结果负责，也不能把 child 报告当作新的用户授权。

每个被接受的用户 turn 在第一次副作用之前创建结构化 turn contract（轮次契约）。契约记录请求的交付物、当前阶段（`analyze`、`propose`、`execute` 或 `verify`）、禁止的影响、来源要求、预算和完成条件。模型可以收紧契约。只有用户操作或 turn 开始前固定的部署策略可以扩大契约。因此，“分析”“预估”“审查”和同类仅提案请求不能因为模型认为实施有帮助而变成 execution lease（执行许可）。

稳定的 baseline prompt（基准提示词）只陈述层级和阶段不变量。详细的检索、审查和策略流程属于对应的系统 child profile，工具专属指南继续由所属工具 package（包）负责。基准或 preset 修改在新 session（会话）生效；它绝不重建运行中对话的 system-prompt（系统提示词）前缀。

### 全局主 agent 在项目中的约束

workspace 在现有已提交指令文件和本地指令文件旁提供项目策略 overlay。它可以选择允许的主 preset、收紧工具 capability class（能力类别）、限制外部 domain（域名）、声明来源优先级、设置 branch（分支）和 worktree（工作树）规则、定义项目预算并指定必需验证。它不能授予系统或全局用户策略禁止的 capability 或预算。

解析遵循一条单调顺序：

1. 系统不变量定义不可绕过的行为和随产品提供的恢复 profile。
2. 全局用户策略选择默认值，并可以收紧部署权限。
3. 项目策略针对一个 workspace 收紧 agent。
4. turn contract 针对一个用户请求收紧权限。
5. delegation grant（委派授权）针对一次 child run（运行）收紧权限。

每个下层都可以删除权限，但不能增加所有上层均未提供的权限。有效策略随 session 记录，并由后代以 snapshot（快照）方式继承，因此项目修改或父级切换不会追溯改变运行中的 child。项目指令仍是模型可见的指导；项目策略单独解析、验证和强制执行，因此 repository（仓库）中的 prose（自然语言内容）不能静默重写 governor。

### 系统级子 agent 管理

部署提供一个具有稳定 id 的系统 child profile 目录。profile 可以通过 overlay 调整——模型、推理强度、persona 扩展、工具 capability 子集、预算、来源策略和输出 schema（模式）——但随产品提供的定义始终可用于恢复，并且其 id 不能删除。项目可以禁用对某个角色的委派或进一步收紧它，但不能在同一 id 下用权限更大的 profile 替换系统角色。

主 agent 选择并调用角色；它不会在 turn 中编辑角色定义。governor 创建签名的 delegation grant，其中包含角色 id、父级身份、任务、允许的 capability class、委派树剩余预算、最大深度和必需输出形状。child agent 不能批准请求、修改自己的 grant、改变 baseline prompt、编辑插件策略，也不能创建另一个 child，除非其系统角色明确允许委派。

四个系统角色是最小充分默认集合：

- `researcher` 在只读、具有网络预算的 grant 下执行外部检索，返回紧凑 evidence packet（证据包），其中包含主张、来源、未解决字段、置信度、用量和停止原因。
- `project-explorer` 在不产生变更的前提下检查本地项目结构、代码、文档和历史，返回有范围的项目地图或证据包；把它与外部检索分开，可让本地工作和网络工作采用不同权限与停止规则。
- `reviewer` 根据 turn contract 和项目策略独立检查提案、patch（补丁）或验证结果；它报告 findings（发现），但不能修复，除非后续经用户授权的执行任务授予该工作。
- `policy-steward` 检查 baseline prompt、preset、插件 descriptor（描述符）和有效权限，并提出配置补丁；它不能应用自己的提案，已接受的基准变更也只在新 session 中生效。

Planner（规划者）和 builder（建工者）不是默认 child，因为规划、建工和最终问责属于主 agent。专用费用估算 agent 不是第五个角色，因为价格证据属于检索，算术综合属于主 agent。其他 specialist（专用）角色继续作为普通用户或项目 profile，而不是永久系统表面。

### 受治理的检索

只要 `researcher` 角色可用，外部检索就委派给它。主 agent 发送 research brief（检索简报），其中包含问题、必填字段、用户提供的来源、来源优先级、调用与时间预算以及停止条件。它不会发送“搜索到完整为止”之类无边界请求。

researcher 首先读取用户提供的来源，优先采用官方一手材料，并把每个新查询关联到一个未解决字段。它维护 evidence ledger（证据账本），并在必填字段已满足、预算耗尽、权威来源已经确定答案，或连续两次检索没有新增来源、主张或必填字段时停止。缺失证据会形成明确的未解决项；它绝不会自动授权另一份预算。

所有具有网络能力的检索工具消耗同一份 grant 预算。改变工具名、查询文本、插件、并行分支或 child session 都不会重置预算。父级接收证据包，而不是 child 的完整检索轨迹，从而保持父级上下文紧凑，并防止第二轮不受治理的搜索。

### 确定性治理器

host 侧策略插件拥有权限和预算状态。它通过现有 extension point（扩展点）检查 agent 创建、subagent start（启动）、模型 step（步骤）准入和工具 pre-execution（执行前检查）。governor 不是 subagent，任何模型都不能在 turn 内卸载、重新配置或绕过它。

工具和插件定义增加 host-only（仅宿主可见）的 capability descriptor，而不是增加更多模型可见 schema：effect class（影响类别，包括 `local-read`、`network-read`、`local-write`、`external-write` 或 `execute-install`）、操作是否可能产生 provider 费用、credential（凭据）要求、并发行为，以及是否可以委派。governor 在执行时比较这些描述符与有效 grant。因此，新插件会自动进入同一策略，而不是依赖工具名 denylist（拒绝列表）。

预算覆盖 root turn 及其所有后代：模型 step、网络操作、变更、耗时，以及 provider 能提供用量时的 provider 用量。当 provider 不提供 token 或价格数据时，请求次数继续作为 fail-closed（失败时关闭）后备。并行 reservation（预留）发生在执行之前，因此 sibling（同级）不能超额占用余额。预算耗尽以持久的 blocked（阻塞）或 awaiting-user（等待用户）状态结束；只有用户可以授予扩展。

### 插件信息与权限管理

每个面向用户的插件声明一个权威 descriptor，由配置参考生成、settings UI（设置界面）、agent 检查和治理共同使用。它包括用途、提供的工具或服务、影响与费用类别、网络与 credential 要求、适用 agent 角色、提示词或工具 schema 占用、配置所有者、失败行为和文档链接。

Plugins settings 页面区分用户 capability、治理策略和内部 infrastructure（基础设施）。卡片显示配置状态和 runtime（运行时）状态、有效角色访问权、缺失要求，以及插件不可用的原因。loader（加载器）和 registry（注册表）等内部条目仍可检查，但默认折叠，而不是表现得与用户 capability 等价。

policy steward 可以提出提示词、preset、descriptor 和角色权限补丁。用户检查 diff（差异）并通过现有 privileged（特权）配置路径应用。任何 child 都不能授予自身插件访问权，已接受的变更也不会修改活跃对话的 system prompt 或工具 roster（名单）。

### 与现有决策的关系

本提案扩展而不取代现有决策。[Per-session agent presets](../../implemented/architecture/2026-08-03-per-session-agent-presets.md) 继续作为组合机制；[child preset joining](../../implemented/bug-fix/2026-08-10-child-agents-join-their-parent-preset.md) 继续作为继承机制；[subagent persona, tool visibility, and depth](../../implemented/feature/2026-07-12-subagent-persona-tool-filter-and-depth.md) 继续作为组合控制；[delegated approvals pinned to never](../../implemented/feature/2026-08-10-subagent-approval-pinned-never.md) 继续保持 fail-closed，直到父级路由审批设计取代它。governor 提供组合控制注记明确排除的独立权限表示。

[Prompt ownership](../../implemented/architecture/2026-07-05-prompt-variables-and-tool-guidance-ownership.md)、[local instruction overlays](../../implemented/feature/2026-07-21-local-instruction-overlay.md)、[layered skills](../../implemented/architecture/2026-08-09-layered-skill-registry.md) 和 [Plugin settings tabs](../../implemented/architecture/2026-08-11-plugin-settings-tabs.md) 保持当前所有权。新层级增加经过验证的策略和更丰富的 descriptor，而不把提示词 prose、项目文件或 settings 表现层变成权限。

## Alternatives considered

**只强化主 system prompt。** 否决，因为违反阶段或停止条件的模型仍会判断自身是否遵循；详细规则还会扩大每个缓存前缀，却不能强制执行失败的决策。

**让主 agent 直接检索，并设置按工具调用上限。** 否决，因为另一个网络工具或插件可以绕过名称专属限制，主轨迹仍会吸收检索循环。整棵树共享的 capability 预算和有界 researcher 才能解决这一类行为。

**让策略 subagent 直接控制提示词和权限。** 否决，因为模型不能授予自己的权限，不受信任的检索内容可能影响 control plane（控制平面），而会话中途改变提示词或工具集会破坏缓存和 replay（回放）不变量。policy steward 提案；确定性 governor 和用户决定。

**提供超过四个系统 child 角色。** 否决，因为 planner、builder、tester（测试者）、费用估算者、文档作者和其他窄角色，要么重复主 agent，要么属于项目专用 specialization（专门化）。四个角色分离需要不同 grant 的权限类别，又不会把永久目录变成任务分类法。

**创建第二套 agent-profile 系统，而不是使用 preset。** 否决，因为 preset 已经拥有 per-session 工具和提示词组合、standing mount（常驻挂载）、UI 选择、持久身份和 child joining（加入）。治理应增加权限与 overlay，而不是复制组合机制。

## Acceptance criteria

- 全局 settings 提供一个可恢复的主 profile 和四个可恢复的系统 child profile；用户可以调整 overlay 并恢复，但不能删除或冒充随产品提供的 id。
- 项目策略可以收紧全局行为，turn 或 child grant 可以再次收紧；任何下层都不能扩大权限。
- 仅提案请求不会产生变更、安装、外部写入或执行，即使模型尝试通过新插件、shell 命令、嵌套 child 或替代工具名执行。
- 外部检索使用结构化 brief 和 evidence packet，在工具与后代之间消耗同一聚合网络预算，优先处理用户提供的来源，并在完成、饱和或耗尽时停止，不需要用户中断。
- 主 agent 接收紧凑 child 结果，拥有实施和最终沟通，并且不能把 child 输出当作用户授权。
- policy steward 可以生成可审查补丁，但不能应用补丁，也不能改变活跃 session 的提示词、preset、插件权限或预算。
- Plugins settings 区分 capability、治理和 infrastructure，并从同一 descriptor 来源显示用途、影响、费用、credential、角色适用性、runtime 状态和失败行为。
- 现有 preset、scope（作用域）、项目指令、skill、审批、session replay 和 prompt cache（提示词缓存）不变量继续由 unit（单元）、real-composition（真实组合）和 keyless nested-agent（无密钥嵌套 agent）测试覆盖。

## Risks

- 强制检索委派会给小型事实问题增加启动延迟。当不需要外部检索时，主 agent 可以根据已提供上下文或稳定的内部知识回答；部署也可以禁用 researcher，同时保留 governor。
- 四个永久角色产生文档和兼容性义务。稳定 id 加可恢复的随产品提供定义，用该成本换取可预测的全局管理；specialist 角色继续位于系统目录之外。
- capability descriptor 可能错误。验证必须对未声明影响的插件 fail-closed，integration test（集成测试）必须检查执行时强制，而不只是 manifest（清单）渲染。
- 自然语言阶段分类仍具有概率性。歧义 turn 的安全默认值是仅提案或用户确认；governor 保证模型不能静默扩大已经形成的 contract，而不是保证每次初始分类都完美。
- 聚合预算可能停止合法的长任务。blocked 状态必须说明耗尽的维度，并允许用户明确扩展，而不重置已经完成的证据或授予无关权限。
