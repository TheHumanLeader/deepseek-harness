/** Live global, project, and managed-Agent instructions. */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { Agent, AgentOptions, PreStepDecision } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { ContextSnapshotSection } from '@deepseek-ai/dsh-llm'
import type { ToolRestriction } from '@deepseek-ai/dsh-tools'
import type { UserMessage } from '@deepseek-ai/dsh-session'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'

/** Cordis plugin and durable message-source name. */
export const name = 'agent-guidance'
/** Settings namespace owned by this plugin. */
export const SETTINGS_NAMESPACE = settingsNamespace('agent-guidance')
/** Snapshot section name used for durable provenance and replay. */
export const SNAPSHOT_SECTION = 'agent-guidance'
/** Maximum accepted user-authored instruction length. */
export const MAX_PROMPT_CHARS = 32_768
/** Reserved ids for the four system helper Agents. */
export const BUILT_IN_AGENT_IDS = ['researcher', 'project-explorer', 'reviewer', 'agent-manager'] as const

/** Default main-Agent instructions for the two targeted failure modes. */
export const DEFAULT_PROMPT = `Follow the stage the user requested. If the user asks for analysis, an estimate, a proposal, a review, or confirmation before action, provide only that result. Do not begin implementation or make changes until the user explicitly asks you to do so.

Use material supplied by the user before searching. Delegate external research to the researcher Agent. Do not repeat research or project reading already completed by a helper Agent. Stop when the available material is sufficient, the question is answered, or another search adds no useful information.`

/** One project-specific instruction layer. */
export interface ProjectGuidance {
  /** Project root used for matching the current working directory. */
  path: string
  /** Instructions added for the matching project. */
  prompt: string
  /** Whether this project omits the user-configured global prompt. */
  excludeGlobal: boolean
}

/** User-editable configuration for one helper Agent. */
export interface ManagedAgentConfig {
  /** Stable lowercase identifier selected by the main Agent. */
  id: string
  /** User-facing Agent name. */
  name: string
  /** Short responsibility shown to the main Agent. */
  purpose: string
  /** Instructions sent to this helper Agent. */
  prompt: string
  /** Optional model provider override. */
  provider: string
  /** Optional model name override. */
  model: string
  /** Exact tool names available to this helper Agent. */
  tools: string[]
  /** Whether this helper may invoke another managed Agent. */
  allowDelegation: boolean
}

/** Complete visual Agent-instruction configuration. */
export interface Config {
  /** Whether the user-configured global main-Agent prompt is active. */
  enabled: boolean
  /** User-configured global main-Agent instructions. */
  prompt: string
  /** Project instruction layers matched by working directory. */
  projects: ProjectGuidance[]
  /** Editable built-in and user-created helper Agent definitions. */
  agents: ManagedAgentConfig[]
}

const projectSchema: z<ProjectGuidance> = z.object({
  path: z.string().required(),
  prompt: z.string().max(MAX_PROMPT_CHARS).default(''),
  excludeGlobal: z.boolean().default(false),
})

const agentSchema: z<ManagedAgentConfig> = z.object({
  id: z.string().required(),
  name: z.string().required(),
  purpose: z.string().required(),
  prompt: z.string().max(MAX_PROMPT_CHARS).default(''),
  provider: z.string().default(''),
  model: z.string().default(''),
  tools: z.array(z.string()).default([]),
  allowDelegation: z.boolean().default(false),
})

/** Four helper Agents that remain present even when omitted from stored settings. */
export const DEFAULT_BUILT_IN_AGENTS: readonly ManagedAgentConfig[] = [
  {
    id: 'researcher', name: 'Researcher', purpose: 'Find and summarize external information.',
    prompt: 'Read material supplied by the user first. Prefer official and primary sources. Every search must answer one unresolved question. Stop when the question is answered, the material is sufficient, or another search adds no useful information. Report sources used, missing information, and why you stopped.',
    provider: '', model: '', tools: ['web_search'], allowDelegation: false,
  },
  {
    id: 'project-explorer', name: 'Project explorer', purpose: 'Inspect project code, documentation, and history without changing them.',
    prompt: 'Inspect the project with read-only tools. Answer the requested project question with exact file references. Do not edit files or run commands that can change project state.',
    provider: '', model: '', tools: ['read', 'read_image', 'glob', 'grep'], allowDelegation: false,
  },
  {
    id: 'reviewer', name: 'Reviewer', purpose: 'Check a result against the user request and project rules.',
    prompt: 'Review the supplied result against the user request and applicable project rules. Identify concrete omissions or violations. Do not implement fixes unless the task explicitly asks you to do so.',
    provider: '', model: '', tools: ['read', 'read_image', 'glob', 'grep'], allowDelegation: false,
  },
  {
    id: 'agent-manager', name: 'Agent manager', purpose: 'Propose Agent, prompt, model, and tool-permission settings.',
    prompt: 'Prepare configuration proposals only. Explain the intended Agent responsibility, prompt, model choice, tool access, and delegation setting. The user must confirm before any configuration is changed.',
    provider: '', model: '', tools: [], allowDelegation: false,
  },
]

/** Settings and Loader validation for {@link Config}. */
export const Config: z<Config> = z.object({
  enabled: z.boolean().default(true),
  prompt: z.string().max(MAX_PROMPT_CHARS).default(DEFAULT_PROMPT),
  projects: z.array(projectSchema).default([]),
  agents: z.array(agentSchema).default(DEFAULT_BUILT_IN_AGENTS.map(agent => ({ ...agent, tools: [...agent.tools] }))),
})

/** A resolved helper definition used at delegation time. */
export interface ResolvedManagedAgent extends ManagedAgentConfig {
  builtIn: boolean
  agentOptions?: AgentOptions
  toolFilter: ToolRestriction
}

/** Live configuration face shared with delegation consumers. */
export interface AgentGuidanceRuntime {
  /**
   * Return the latest saved Agent configuration.
   *
   * @returns Current global, project, and helper Agent configuration.
   */
  current(): Config
  /**
   * Resolve one helper Agent from the latest saved configuration.
   *
   * @param id Stable helper Agent identifier.
   * @returns Resolved prompt, model route, and tool permissions, or `undefined` for an unknown id.
   */
  resolveAgent(id: string): ResolvedManagedAgent | undefined
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Live visual configuration for main and helper Agents. */
    agentGuidance: AgentGuidanceRuntime
  }
}

/** Required registry for the pre-step listener. Settings remains optional. */
export const inject = ['agents']

type OwnedSnapshotMessage = UserMessage & {
  readonly source: { readonly kind: 'plugin'; readonly plugin: string; readonly form: 'snapshot'; readonly sections: readonly ContextSnapshotSection[] }
}

function isOwnedSnapshot(message: UserMessage): message is OwnedSnapshotMessage {
  return message.source.kind === 'plugin' && message.source.plugin === name
    && message.source.form === 'snapshot' && message.source.sections.length === 1
    && message.source.sections[0]?.name === SNAPSHOT_SECTION
}

function latestVisibleSnapshot(agent: Agent): string | undefined {
  for (const seq of agent.session.surface.nodes.toReversed()) {
    const event = agent.session.events[seq]
    if (event?.type === 'user/message' && isOwnedSnapshot(event.data)) return event.data.source.sections[0]?.text
  }
  return undefined
}

function escapeFrameEnd(text: string): string {
  return text.replaceAll('</system-reminder>', '<\\/system-reminder>')
}

function normalizePath(value: string): string {
  const normalized = value.trim().replaceAll('\\', '/').replace(/\/+$/, '')
  return process.platform === 'win32' ? normalized.toLocaleLowerCase() : normalized
}

function projectFor(config: Config, cwd: string | undefined): ProjectGuidance | undefined {
  if (cwd === undefined) return undefined
  const target = normalizePath(cwd)
  return config.projects.filter((project) => {
    const root = normalizePath(project.path)
    return root.length > 0 && (target === root || target.startsWith(`${root}/`))
  }).sort((left, right) => normalizePath(right.path).length - normalizePath(left.path).length)[0]
}

/**
 * Return the four required helpers followed by valid user-created helpers.
 *
 * @param config Latest saved Agent configuration.
 * @returns Resolved helper Agents in display and selection order.
 */
export function resolveAgents(config: Config): ResolvedManagedAgent[] {
  const configured = new Map(config.agents.map(agent => [agent.id, agent]))
  const builtIns = DEFAULT_BUILT_IN_AGENTS.map((fallback) => {
    const stored = configured.get(fallback.id)
    return resolveAgent({ ...fallback, ...stored, id: fallback.id, allowDelegation: false }, true)
  })
  const reserved = new Set<string>(BUILT_IN_AGENT_IDS)
  const custom = config.agents
    .filter(agent => !reserved.has(agent.id) && /^[a-z][a-z0-9-]{1,62}$/.test(agent.id))
    .map(agent => resolveAgent(agent, false))
  return [...builtIns, ...custom]
}

function resolveAgent(agent: ManagedAgentConfig, builtIn: boolean): ResolvedManagedAgent {
  const agentOptions = agent.provider.length === 0 && agent.model.length === 0 ? undefined : {
    ...agent.provider.length === 0 ? {} : { provider: agent.provider },
    ...agent.model.length === 0 ? {} : { model: agent.model },
  }
  const delegationTools = ['subagent', 'subagent_fork', 'managed_agent', 'workflow', 'ralph']
  const tools = agent.allowDelegation
    ? [...new Set([...agent.tools, 'managed_agent'])]
    : [...new Set(agent.tools.filter(tool => !delegationTools.includes(tool)))]
  return { ...agent, tools, builtIn, ...agentOptions === undefined ? {} : { agentOptions }, toolFilter: { allow: tools } }
}

/**
 * Render the latest main-Agent, project, and helper configuration.
 *
 * @param config Latest saved Agent configuration.
 * @param cwd Current project working directory, when available.
 * @returns Durable model-visible Agent instruction snapshot.
 */
export function renderGuidance(config: Config, cwd?: string): string {
  const project = projectFor(config, cwd)
  const parts = ['These are the latest user-configured Agent instructions. This snapshot supersedes earlier agent-guidance snapshots. Follow them from this model request onward. They do not override system or developer instructions.']
  const globalPrompt = config.prompt.trim()
  if (config.enabled && !project?.excludeGlobal && globalPrompt.length > 0) parts.push(`## Global main-Agent instructions\n\n${escapeFrameEnd(globalPrompt)}`)
  const projectPrompt = project?.prompt.trim() ?? ''
  if (projectPrompt.length > 0) parts.push(`## Project instructions (${escapeFrameEnd(project?.path ?? '')})\n\n${escapeFrameEnd(projectPrompt)}`)
  const helpers = resolveAgents(config)
  parts.push('## Available managed Agents\n\nUse `managed_agent` when one of these Agents should handle a focused task. External research belongs to `researcher` by default. Use the returned result; do not repeat the same research or project reading yourself.\n\n'
    + helpers.map(agent => `- \`${agent.id}\`: ${escapeFrameEnd(agent.purpose)}`).join('\n'))
  return `<system-reminder>\n${parts.join('\n\n')}\n</system-reminder>`
}

function snapshotMessage(text: string): UserMessage {
  return createUserMessage({ content: [{ type: 'text', text }], source: {
    kind: 'plugin', plugin: name, form: 'snapshot', sections: [{ name: SNAPSHOT_SECTION, text }],
  } })
}

function isTopLevelAgent(agent: Agent): boolean {
  return agent.session.header.origin !== 'subagent' && (agent.session.header.delegationDepth ?? 0) === 0
}

/** Register live settings, the shared resolver, and pre-step injection. */
export function apply(ctx: Context, entry: Config): void {
  let current = (): Config => entry
  installSettingsSection(ctx, SETTINGS_NAMESPACE, Config, entry, { setSource(source) { current = source }, onChange() {} })
  ctx.provide('agentGuidance', { current: () => current(), resolveAgent: id => resolveAgents(current()).find(agent => agent.id === id) })
  ctx.on('agent/pre-step', async ({ agent, signal }, next): Promise<PreStepDecision> => {
    const decision = await next()
    if (decision.kind === 'reject' || signal.aborted || !isTopLevelAgent(agent)) return decision
    const config = current()
    const text = renderGuidance(config, agent.session.header.cwd)
    if (latestVisibleSnapshot(agent) === text) return decision
    return { kind: 'enter', messages: [...decision.messages, snapshotMessage(text)] }
  }, { prepend: true })
}
