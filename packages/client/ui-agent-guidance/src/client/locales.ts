/** Copy for the global main-Agent instructions settings page. */

/** Locale keys rendered by this page. */
export type AgentGuidanceKey =
  | 'nav' | 'title' | 'description' | 'newSessionsOnly' | 'enabled'
  | 'enabledHint' | 'prompt' | 'promptHint' | 'save' | 'saving'
  | 'reset' | 'loading' | 'unavailable' | 'readOnly' | 'preview'

/** English copy. */
export const en: Record<AgentGuidanceKey, string> = {
  nav: 'Agent instructions',
  title: 'Global main-Agent instructions',
  description: 'Tell the main Agent how to work across projects.',
  newSessionsOnly: 'Changes apply only to main-Agent sessions that start afterward. Running sessions keep the instructions they started with.',
  enabled: 'Use global instructions',
  enabledHint: 'Auxiliary Agents do not receive these instructions.',
  prompt: 'Instructions',
  promptHint: 'Write direct rules that should apply across tasks and projects.',
  save: 'Save',
  saving: 'Saving…',
  reset: 'Restore default',
  loading: 'Loading instructions…',
  unavailable: 'This deployment does not expose global Agent instructions.',
  readOnly: 'These settings are read-only in this deployment.',
  preview: 'What the main Agent will receive',
}

/** Simplified Chinese copy. */
export const zh: Record<AgentGuidanceKey, string> = {
  nav: 'Agent 指令',
  title: '全局主 Agent 指令',
  description: '统一设置主 Agent 在不同项目中的工作方式。',
  newSessionsOnly: '修改只对之后开始的主 Agent 会话生效。正在运行的会话继续使用开始时的指令。',
  enabled: '使用全局指令',
  enabledHint: '辅助 Agent 不会收到这里的指令。',
  prompt: '指令内容',
  promptHint: '填写适用于不同任务和项目的直接规则。',
  save: '保存',
  saving: '正在保存…',
  reset: '恢复默认',
  loading: '正在加载指令…',
  unavailable: '当前部署没有提供全局 Agent 指令。',
  readOnly: '当前部署中的这些设置是只读的。',
  preview: '主 Agent 将收到的内容',
}
