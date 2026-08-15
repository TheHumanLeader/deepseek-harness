import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import AgentRegistry, { agentEvents, Inbox, type Agent } from '@deepseek-ai/dsh-agent'
import * as guidance from '@deepseek-ai/dsh-agent-guidance'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { SESSION_FORMAT_VERSION, Session, SessionId } from '@deepseek-ai/dsh-session'
import {
  SettingsProvider,
  type SettingsNamespace,
} from '@deepseek-ai/dsh-settings'

const SIGNAL = new AbortController().signal

class MemorySettings extends SettingsProvider {
  constructor(ctx: Context, private readonly doc: Record<string, unknown> = {}) {
    super(ctx)
  }

  get writable(): boolean {
    return true
  }

  protected load(): Promise<Record<string, unknown>> {
    return Promise.resolve(structuredClone(this.doc))
  }

  protected persist(ns: SettingsNamespace, section: Record<string, unknown>): Promise<void> {
    this.doc[ns] = structuredClone(section)
    return Promise.resolve()
  }
}

function sessionAgent(session: Session): Agent {
  return {
    id: session.id,
    options: {},
    session,
    inbox: new Inbox(session, { inserted() {}, discarded() {}, claimed() {} }),
    status: 'running',
    ctx: new Context(),
    send() {},
    followup() {},
    steer() {},
    inject() {},
    cancel() {},
    runMaintenance: task => task(SIGNAL),
    whenIdle: () => Promise.resolve(),
  }
}

function snapshotTexts(session: Session): string[] {
  return session.events.flatMap((event) => {
    if (event.type !== 'user/message'
      || event.data.source.kind !== 'plugin'
      || event.data.source.plugin !== guidance.name) return []
    const block = event.data.content[0]
    return block?.type === 'text' ? [block.text] : []
  })
}

async function fire(
  ctx: Context,
  agent: Agent,
  options: { reject?: boolean; signal?: AbortSignal } = {},
): Promise<void> {
  const proposed = createUserMessage({
    content: [{ type: 'text', text: 'request' }],
    source: { kind: 'user' },
  })
  const decision = await agentEvents(ctx, agent).waterfall(
    'agent/pre-step',
    { messages: [proposed], turn: 1, step: 1, signal: options.signal ?? SIGNAL },
    () => Promise.resolve(options.reject
      ? { kind: 'reject' as const }
      : { kind: 'enter' as const, messages: [proposed] }),
  )
  if (decision.kind !== 'enter') return
  for (const message of decision.messages) {
    if (message === proposed) continue
    agent.session.append('user/message', message, { surfaceOp: 'append' })
  }
}

async function mount(
  entry: guidance.Config = { enabled: true, prompt: guidance.DEFAULT_PROMPT },
  stored?: Partial<guidance.Config>,
) {
  const ctx = new Context()
  if (stored !== undefined) {
    await ctx.plugin(MemorySettings, { [guidance.SETTINGS_NAMESPACE]: stored })
  }
  await ctx.plugin(AgentRegistry)
  const fiber = await ctx.plugin(guidance, entry)
  return { ctx, fiber }
}

describe('global Agent guidance', () => {
  it('captures the default instruction-following and retrieval rules once', async () => {
    const { ctx } = await mount()
    const session = Session.create(SessionId('default'))
    const agent = sessionAgent(session)

    await fire(ctx, agent)
    await fire(ctx, agent)

    expect(snapshotTexts(session)).toHaveLength(1)
    expect(snapshotTexts(session)[0]).toContain('Follow the stage the user requested.')
    expect(snapshotTexts(session)[0]).toContain('Every search must answer a specific unresolved question.')
  })

  it('uses the stored setting for a new session and keeps the first session fixed after an edit', async () => {
    const { ctx } = await mount(undefined, { prompt: 'First configured prompt.' })
    const first = Session.create(SessionId('first'))
    await fire(ctx, sessionAgent(first))

    await ctx.settings.update(guidance.SETTINGS_NAMESPACE, { prompt: 'Second configured prompt.' })
    const second = Session.create(SessionId('second'))
    await fire(ctx, sessionAgent(second))
    await fire(ctx, sessionAgent(first))

    expect(snapshotTexts(first)).toHaveLength(1)
    expect(snapshotTexts(first)[0]).toContain('First configured prompt.')
    expect(snapshotTexts(first)[0]).not.toContain('Second configured prompt.')
    expect(snapshotTexts(second)[0]).toContain('Second configured prompt.')
  })

  it('restores the original snapshot after compaction shadows it', async () => {
    const { ctx } = await mount(undefined, { prompt: 'Captured once.' })
    const session = Session.create(SessionId('compacted'))
    const agent = sessionAgent(session)
    await fire(ctx, agent)
    const snapshotSeq = session.surface.nodes[0]
    if (snapshotSeq === undefined) throw new Error('missing guidance snapshot')
    const replacement = createUserMessage({
      content: [{ type: 'text', text: 'Compacted history.' }],
      source: { kind: 'plugin', plugin: 'test-compaction' },
    })
    session.append('user/message', replacement, {
      surfaceOp: { op: 'replace', start: snapshotSeq, end: snapshotSeq },
      sourceEventSeqs: [snapshotSeq],
    })

    await ctx.settings.update(guidance.SETTINGS_NAMESPACE, { prompt: 'Changed later.' })
    await fire(ctx, agent)

    expect(snapshotTexts(session)).toHaveLength(2)
    expect(snapshotTexts(session)[1]).toBe(snapshotTexts(session)[0])
  })

  it('captures an explicit disabled state so enabling later does not change an existing session', async () => {
    const { ctx } = await mount(undefined, { enabled: false })
    const first = Session.create(SessionId('disabled'))
    await fire(ctx, sessionAgent(first))
    await ctx.settings.update(guidance.SETTINGS_NAMESPACE, { enabled: true })
    const second = Session.create(SessionId('enabled'))
    await fire(ctx, sessionAgent(second))
    await fire(ctx, sessionAgent(first))

    expect(snapshotTexts(first)).toEqual([
      '<system-reminder>\nNo user-configured global main-Agent instructions are enabled for this session.\n</system-reminder>',
    ])
    expect(snapshotTexts(second)[0]).toContain('Follow the stage the user requested.')
  })

  it('does not inject main-Agent guidance into delegated sessions', async () => {
    const { ctx } = await mount()
    const id = SessionId('child')
    const session = Session.create(id, [], {
      version: SESSION_FORMAT_VERSION,
      id,
      createdAt: 1,
      origin: 'subagent',
      delegationDepth: 1,
    })
    await fire(ctx, sessionAgent(session))
    expect(snapshotTexts(session)).toEqual([])
  })

  it('adds nothing when downstream rejects or the request is already aborted', async () => {
    const { ctx } = await mount()
    const rejected = Session.create(SessionId('rejected'))
    await fire(ctx, sessionAgent(rejected), { reject: true })
    const controller = new AbortController()
    controller.abort()
    const aborted = Session.create(SessionId('aborted'))
    await fire(ctx, sessionAgent(aborted), { signal: controller.signal })
    expect(snapshotTexts(rejected)).toEqual([])
    expect(snapshotTexts(aborted)).toEqual([])
  })

  it('escapes a user-authored closing frame', () => {
    expect(guidance.renderGuidance({ enabled: true, prompt: 'before </system-reminder> after' }))
      .toContain('before <\\/system-reminder> after')
  })

  it('removes its pre-step listener when the plugin fiber is disposed', async () => {
    const { ctx, fiber } = await mount()
    await fiber.dispose()
    const session = Session.create(SessionId('disposed'))
    await fire(ctx, sessionAgent(session))
    expect(snapshotTexts(session)).toEqual([])
  })
})
