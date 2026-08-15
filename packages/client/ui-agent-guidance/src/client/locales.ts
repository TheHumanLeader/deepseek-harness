/** Copy for the visual Agent configuration page. */

/** Simplified Chinese copy for the Agent configuration page. */
export const zh = {
  nav: 'Agent 配置', title: 'Agent 配置', description: '统一管理主 Agent、项目指令和辅助 Agent。',
  live: '保存后，从下一次模型请求开始，当前会话和新会话都会读取最新配置。',
  mainAgent: '全局主 Agent', systemAgent: '系统内置', customAgent: '用户创建', enabled: '使用全局指令',
  enabledHint: '项目可以单独排除这段全局指令。', prompt: '提示词', provider: '模型服务', model: '模型', inherit: '使用当前默认值',
  tools: '工具权限', toolsHint: '工具名用英文逗号分隔；留空表示这个辅助 Agent 不使用工具。',
  projects: '项目级指令', projectsHint: '按项目根目录匹配；更深的目录优先。', addProject: '添加项目', projectPath: '项目根目录',
  projectPrompt: '项目提示词', excludeGlobal: '这个项目排除用户配置的全局指令', remove: '移除项目',
  agents: '辅助 Agent', agentsHint: '四个系统 Agent 可以调整但不能删除。其他 Agent 由用户创建和删除。', addAgent: '创建 Agent',
  newAgent: '新 Agent', noPurpose: '尚未填写用途', agentId: 'Agent ID', agentName: '名称', purpose: '用途',
  allowDelegation: '允许这个 Agent 继续委派', deleteAgent: '删除 Agent', save: '保存全部', saving: '正在保存…',
  reset: '恢复默认', loading: '正在加载 Agent 配置…', unavailable: '当前部署没有提供 Agent 配置。',
  readOnly: '当前部署中的这些设置是只读的。', preview: '主 Agent 全局提示词预览',
} satisfies Record<string, string>

/** Translation key shared by the page locales. */
export type AgentGuidanceKey = keyof typeof zh

/** English copy for the Agent configuration page. */
export const en = {
  nav: 'Agent configuration', title: 'Agent configuration', description: 'Manage the main Agent, project instructions, and helper Agents in one place.',
  live: 'After saving, the current session and new sessions read the latest configuration from the next model request.',
  mainAgent: 'Global main Agent', systemAgent: 'Built in', customAgent: 'User created', enabled: 'Use global instructions',
  enabledHint: 'A project can exclude this user-configured global prompt.', prompt: 'Prompt', provider: 'Provider', model: 'Model', inherit: 'Use current default',
  tools: 'Tool permissions', toolsHint: 'Separate tool names with commas. Empty means this helper Agent uses no tools.',
  projects: 'Project instructions', projectsHint: 'Match by project root; the deepest matching root wins.', addProject: 'Add project', projectPath: 'Project root',
  projectPrompt: 'Project prompt', excludeGlobal: 'Exclude the user-configured global prompt in this project', remove: 'Remove project',
  agents: 'Helper Agents', agentsHint: 'The four system Agents can be edited but not deleted. Users create and delete other Agents.', addAgent: 'Create Agent',
  newAgent: 'New Agent', noPurpose: 'No purpose yet', agentId: 'Agent ID', agentName: 'Name', purpose: 'Purpose',
  allowDelegation: 'Allow this Agent to delegate again', deleteAgent: 'Delete Agent', save: 'Save all', saving: 'Saving…',
  reset: 'Restore defaults', loading: 'Loading Agent configuration…', unavailable: 'This deployment does not expose Agent configuration.',
  readOnly: 'These settings are read-only in this deployment.', preview: 'Global main-Agent prompt preview',
} satisfies Record<AgentGuidanceKey, string>
