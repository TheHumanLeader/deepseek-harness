# @deepseek-ai/dsh-client-ui-settings-plugin-inventory

[English](README.md) | 中文

Web 设置中的只读**插件列表**标签页。浏览器插件注册一个 id 为 `all` 的本地化 `settings.plugins.tab` 贡献；“插件”分区拥有导航入口与标签栏。插件激活期间不会读取 Remote；首次选择该标签页时才挂载组件，并通过 [`api-remotes`](../../api/remotes/README.md) 懒调用 `ctx.remote.pluginInventory.list()`。

该标签页把插件显示为可搜索的双列卡片。展开后会显示插件用途、功能和工具、读取/修改/发送行为、联网和凭据要求、Agent 使用范围、运行状态、不可用原因及文档入口。搜索同时匹配模块名、Loader 条目 id、用途和功能。

## 模型体验

无，因为本包只在浏览器设置中展示 Host 拥有的部署快照，不注册任何模型接口。

#### KV Cache 影响

无；本包既不组装也不发送提供方请求。

## 已知限制与暂缓事项

- **每次 Settings 挂载或重试只读取一份快照** —— 标签页不订阅 Loader 变化，也不会在重连后自动重新读取；切换标签页会保留当前快照，重新打开 Settings 则会取得新快照。
- **只读 Loader 视图** —— 本地搜索不会额外引入来源、按来源分组、当前浏览器激活诊断或插件修改控件。
