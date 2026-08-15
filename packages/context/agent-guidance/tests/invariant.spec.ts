import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import SessionStore, { SessionId, type SessionEvent, type UserMessage } from '@deepseek-ai/dsh-session'
import * as GuidanceInvariant from '@deepseek-ai/dsh-agent-guidance/invariant'

function message(
  text: string,
  options: { content?: unknown[]; source?: Record<string, unknown> } = {},
): UserMessage {
  return createUserMessage({
    content: (options.content ?? [{ type: 'text', text }]) as never,
    source: (options.source ?? {
      kind: 'plugin',
      plugin: 'agent-guidance',
      form: 'snapshot',
      sections: [{ name: 'global-agent-guidance', text }],
    }) as never,
  })
}

function event(data: UserMessage, seq = 0): SessionEvent<'user/message'> {
  return { type: 'user/message', seq, time: seq + 1, data, surfaceOp: 'append' }
}

async function context(): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(InvariantRegistry, { enabled: true })
  return ctx
}

async function lateCheck(messages: UserMessage[], meta: { origin?: 'subagent'; delegationDepth?: number } = {}) {
  const ctx = await context()
  const session = ctx.sessions.create(SessionId('late'), { meta })
  for (const data of messages) session.append('user/message', data, { surfaceOp: 'append' })
  return ctx.plugin(GuidanceInvariant).await()
}

describe('agent-guidance invariant', () => {
  it('accepts one stable snapshot and ignores unrelated session events', async () => {
    await expect(lateCheck([message('Fixed.')])).resolves.toBeDefined()
    const ctx = await context()
    await ctx.plugin(GuidanceInvariant)
    const session = ctx.sessions.create(SessionId('live'))
    session.append('turn/start', { turn: 1 })
    expect(() => { ctx.emit('session/event', session, event(message('Other.', {
      source: { kind: 'plugin', plugin: 'other' },
    }))) }).not.toThrow()
  })

  it('checks sessions created after registration', async () => {
    const ctx = await context()
    await ctx.plugin(GuidanceInvariant)
    expect(() => {
      ctx.sessions.create(SessionId('seeded'), {
        seed: [event(message('Fixed.'))],
      })
    }).not.toThrow()
  })

  it('rejects snapshots with anything other than one text block', async () => {
    await expect(lateCheck([message('Fixed.', { content: [] })]))
      .rejects.toThrow(/exactly one text block/)
    await expect(lateCheck([message('Fixed.', {
      content: [{ type: 'text', text: 'Fixed.' }, { type: 'text', text: 'Extra.' }],
    })])).rejects.toThrow(/exactly one text block/)
  })

  it.each([
    { kind: 'plugin', plugin: 'agent-guidance' },
    { kind: 'plugin', plugin: 'agent-guidance', form: 'instructions', sections: [] },
    { kind: 'plugin', plugin: 'agent-guidance', form: 'snapshot', sections: [] },
    { kind: 'plugin', plugin: 'agent-guidance', form: 'snapshot', sections: [{ name: 'wrong', text: 'Fixed.' }] },
    { kind: 'plugin', plugin: 'agent-guidance', form: 'snapshot', sections: [{ name: 'global-agent-guidance', text: 'Different.' }] },
  ])('rejects incomplete or mismatched source metadata: %o', async (source) => {
    await expect(lateCheck([message('Fixed.', { source })]))
      .rejects.toThrow(/exact durable snapshot text/)
  })

  it('rejects guidance in delegated sessions', async () => {
    await expect(lateCheck([message('Fixed.')], { origin: 'subagent', delegationDepth: 1 }))
      .rejects.toThrow(/only to top-level Agent sessions/)
    await expect(lateCheck([message('Fixed.')], { delegationDepth: 1 }))
      .rejects.toThrow(/only to top-level Agent sessions/)
  })

  it('rejects a changed snapshot later in the same session', async () => {
    await expect(lateCheck([message('First.'), message('Second.')]))
      .rejects.toThrow(/remain fixed/)
  })

  it('validates a newly appended owned event through dispatch', async () => {
    const ctx = await context()
    await ctx.plugin(GuidanceInvariant)
    const session = ctx.sessions.create(SessionId('dispatch'))
    session.append('user/message', message('First.'), { surfaceOp: 'append' })
    session.append('user/message', message('Second.'), { surfaceOp: 'append' })
    expect(() => {
      ctx.emit('session/event', session, event(message('Second.'), 1))
    }).toThrow(/remain fixed/)
  })
})
