# @deepseek-ai/dsh-agent-guidance

[English](README.md) | 中文

由用户为主 Agent 配置的持久全局指令。默认指令处理两个常见问题：Agent 超出用户要求的阶段直接行动，以及在已有足够信息后继续检索。

## 配置

```yaml
- id: agent-guidance
  name: '@deepseek-ai/dsh-agent-guidance'
  config:
    enabled: true
    prompt: |
      Follow the stage the user requested.
      Stop searching when the available material is sufficient.
```

`enabled` 默认为 `true`。`prompt` 默认使用“模型体验”中完整的指令遵循与停止检索规则，最多接受 32,768 个字符。Settings 服务可用时，用户设置会覆盖这些部署默认值。

## 会话行为

顶层会话第一次进入 `agent/pre-step` 时，会把当前设置固定为一条持久的用户角色快照。之后的设置修改只影响尚未进入模型步骤的会话。子 Agent 会话不会收到该快照。

如果压缩遮蔽了快照，下一个进入的步骤会从持久会话事件中恢复同一份已固定文本。禁用该功能时仍会记录一条很小的禁用快照，因此之后启用功能不会改变已有会话。

## 模型体验

### 全局主 Agent 指令

#### 模型看到的内容

默认启用的快照如下：

##### 默认启用快照

```markdown
<system-reminder>
The following global instructions were configured by the user for the main Agent. Follow them throughout this session unless the user gives a more specific instruction. They do not override system or developer instructions.

Follow the stage the user requested. If the user asks for analysis, an estimate, a proposal, a review, or confirmation before action, provide only that result. Do not begin implementation or make changes until the user explicitly asks you to do so.

Use material supplied by the user before searching. Every search must answer a specific unresolved question. Stop searching when the available material is sufficient, when the question is answered, or when another search adds no useful information.
</system-reminder>
```

#### Token 影响

每个顶层会话保留一份有长度上限的快照。禁用功能的会话只保留禁用标记。压缩使快照不再可见时，系统可能再次追加同一份已固定快照。

#### KV Cache 影响

仅追加。快照添加在可复用的历史前缀之后，不会改写先前上下文。压缩后恢复时会追加相同文本。

## 已知限制与暂缓事项

- **自然语言约束**：这些指令可以改善模型行为，但不能从程序上拦截未经允许的工具调用。执行授权需要独立的策略插件。
- **仅限主 Agent**：辅助 Agent 的默认配置与权限属于 Agent 管理设计的另一部分。
- **本页面没有项目覆盖选项**：项目指令仍由 `dsh-agent-instructions` 提供；是否包含全局层的可视化项目级选择不属于本包。
