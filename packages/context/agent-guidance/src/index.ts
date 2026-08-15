/**
 * Durable user-configured instructions for top-level Agents.
 *
 * The current settings value is captured when a session first enters a model
 * step. Later requests and resumed processes reuse that durable snapshot, so
 * editing Settings changes only sessions that have not started yet.
 *
 * @module @deepseek-ai/dsh-agent-guidance
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { Agent, PreStepDecision } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { ContextSnapshotSection } from '@deepseek-ai/dsh-llm'
import type { UserMessage } from '@deepseek-ai/dsh-session'
import {
  installSettingsSection,
  settingsNamespace,
} from '@deepseek-ai/dsh-settings'

/** Cordis plugin and durable message-source name. */
export const name = 'agent-guidance'

/** Settings namespace owned by this plugin. */
export const SETTINGS_NAMESPACE = settingsNamespace('agent-guidance')

/** Snapshot section name used for durable provenance and replay. */
export const SNAPSHOT_SECTION = 'global-agent-guidance'

/** Maximum accepted user-authored instruction length. */
export const MAX_PROMPT_CHARS = 32_768

/**
 * Default instructions address the two recurring failure modes without
 * assuming a particular task, tool, provider, or project type.
 */
export const DEFAULT_PROMPT = `Follow the stage the user requested. If the user asks for analysis, an estimate, a proposal, a review, or confirmation before action, provide only that result. Do not begin implementation or make changes until the user explicitly asks you to do so.

Use material supplied by the user before searching. Every search must answer a specific unresolved question. Stop searching when the available material is sufficient, when the question is answered, or when another search adds no useful information.`

/** User-configurable global main-Agent instructions. */
export interface Config {
  /** Whether the configured prompt is included in new top-level sessions. */
  enabled: boolean
  /** Instructions captured for each new top-level session. */
  prompt: string
}

/** Settings and Loader validation for {@link Config}. */
export const Config: z<Config> = z.object({
  enabled: z.boolean().default(true),
  prompt: z.string().max(MAX_PROMPT_CHARS).default(DEFAULT_PROMPT),
})

/** Required registry for the pre-step listener. Settings remains optional. */
export const inject = ['agents']

type OwnedSnapshotMessage = UserMessage & {
  readonly source: {
    readonly kind: 'plugin'
    readonly plugin: string
    readonly form: 'snapshot'
    readonly sections: readonly ContextSnapshotSection[]
  }
}

function isOwnedSnapshot(message: UserMessage): message is OwnedSnapshotMessage {
  return message.source.kind === 'plugin'
    && message.source.plugin === name
    && message.source.form === 'snapshot'
    && message.source.sections.length === 1
    && message.source.sections[0]?.name === SNAPSHOT_SECTION
}

/** Read the exact durable text captured for this session, including shadowed history. */
function latestSnapshot(agent: Agent): string | undefined {
  for (const event of agent.session.events.toReversed()) {
    if (event.type !== 'user/message' || !isOwnedSnapshot(event.data)) continue
    return event.data.source.sections[0]?.text
  }
  return undefined
}

/** Whether the current model-visible surface already carries this session's snapshot. */
function snapshotIsVisible(agent: Agent): boolean {
  for (const seq of agent.session.surface.nodes) {
    const event = agent.session.events[seq]
    if (event?.type === 'user/message' && isOwnedSnapshot(event.data)) return true
  }
  return false
}

function escapeFrameEnd(text: string): string {
  return text.replaceAll('</system-reminder>', '<\\/system-reminder>')
}

/**
 * Render one complete, replayable snapshot from the value captured at session start.
 * @param config - Settings value captured for the session.
 * @returns Model-visible global instruction snapshot.
 */
export function renderGuidance(config: Config): string {
  const prompt = config.prompt.trim()
  if (!config.enabled || prompt.length === 0) {
    return '<system-reminder>\nNo user-configured global main-Agent instructions are enabled for this session.\n</system-reminder>'
  }
  return '<system-reminder>\n'
    + 'The following global instructions were configured by the user for the main Agent. '
    + 'Follow them throughout this session unless the user gives a more specific instruction. '
    + 'They do not override system or developer instructions.\n\n'
    + `${escapeFrameEnd(prompt)}\n`
    + '</system-reminder>'
}

function snapshotMessage(text: string): UserMessage {
  return createUserMessage({
    content: [{ type: 'text', text }],
    source: {
      kind: 'plugin',
      plugin: name,
      form: 'snapshot',
      sections: [{ name: SNAPSHOT_SECTION, text }],
    },
  })
}

function isTopLevelAgent(agent: Agent): boolean {
  return agent.session.header.origin !== 'subagent'
    && (agent.session.header.delegationDepth ?? 0) === 0
}

/**
 * Register the settings section and durable pre-step injection.
 * @param ctx - Host plugin context.
 * @param entry - composition defaults used when no settings provider exists.
 */
export function apply(ctx: Context, entry: Config): void {
  let current = (): Config => entry
  installSettingsSection(ctx, SETTINGS_NAMESPACE, Config, entry, {
    setSource(source) {
      current = source
    },
    // The next session reads `current()` at its first entered step. Existing
    // sessions recover their own text from durable history instead.
    onChange() {},
  })

  ctx.on('agent/pre-step', async (
    { agent, signal },
    next,
  ): Promise<PreStepDecision> => {
    const decision = await next()
    if (decision.kind === 'reject' || signal.aborted || !isTopLevelAgent(agent)) return decision
    if (snapshotIsVisible(agent)) return decision
    const text = latestSnapshot(agent) ?? renderGuidance(current())
    return {
      kind: 'enter',
      messages: [...decision.messages, snapshotMessage(text)],
    }
  }, { prepend: true })
}
