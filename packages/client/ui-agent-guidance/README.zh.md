# @deepseek-ai/dsh-client-ui-agent-guidance

[English](README.md) | 中文

`@deepseek-ai/dsh-agent-guidance` 所拥有的全局主 Agent 指令 Web 设置页。它编辑 `agent-guidance` 设置命名空间，并明确说明修改只影响之后开始的主 Agent 会话。

该页面可以启用或禁用指令、编辑指令文本、恢复部署默认值，并预览可编辑的完整内容。远程或只读部署会显示命名空间不可用或只读，不会假装写入成功。

## 模型体验

### 通过设置编写的指令

#### 模型看到的内容

本浏览器包本身不会向模型发送内容。Host 包会在下一个顶层会话中固定已保存的提示词；其 README 定义了完整的模型可见包裹文本。

#### Token 影响

没有直接 Token 影响。保存的文本会改变 `dsh-agent-guidance` 添加到之后顶层会话中的有界快照。

#### KV Cache 影响

没有直接 Cache 影响。Host 只把设置应用到之后的会话，并保持活动会话不变。

## 已知限制与暂缓事项

- **仅限全局主 Agent**：项目级继承与辅助 Agent 管理需要各自的设置页面。
- **不能在会话中途修改**：本页面不会改变运行中会话已经固定的指令。
