/** Durable global-Agent guidance invariants. @module @deepseek-ai/dsh-agent-guidance/invariant */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantFailure, InvariantInstaller } from '@deepseek-ai/dsh-invariants'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import { SNAPSHOT_SECTION, name as SOURCE_NAME } from './index.ts'

const PACKAGE_NAME = '@deepseek-ai/dsh-agent-guidance'

/** Cordis companion plugin name. */
export const name = 'agent-guidance-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

function owned(event: SessionEvent): event is SessionEvent<'user/message'> {
  return event.type === 'user/message'
    && event.data.source.kind === 'plugin'
    && event.data.source.plugin === SOURCE_NAME
}

function textOf(event: SessionEvent<'user/message'>, fail: InvariantFailure): string {
  const [block] = event.data.content
  if (event.data.content.length !== 1 || block?.type !== 'text') {
    fail('agent-guidance snapshots must contain exactly one text block')
  }
  const text = block.text
  const source = event.data.source
  if (source.kind !== 'plugin'
    || source.plugin !== SOURCE_NAME
    || source.form !== 'snapshot'
    || source.sections.length !== 1
    || source.sections[0]?.name !== SNAPSHOT_SECTION
    || source.sections[0].text !== text) {
    fail('agent-guidance source must carry the exact durable snapshot text')
  }
  return text
}

function validateSession(session: Session, fail: InvariantFailure): void {
  for (const event of session.events) {
    if (!owned(event)) continue
    if (session.header.origin === 'subagent' || (session.header.delegationDepth ?? 0) > 0) {
      fail('agent-guidance snapshots belong only to top-level Agent sessions')
    }
    textOf(event, fail)
  }
}

/* jscpd:ignore-start -- package companions share replay and dispatch plumbing */
const install: InvariantInstaller = Object.assign((ctx: Context, fail: InvariantFailure) => {
  for (const session of ctx.sessions.list()) validateSession(session, fail)
  ctx.on('session/created', (session) => { validateSession(session, fail) }, { global: true })
  ctx.on('internal/dispatch', (_mode, eventName, args) => {
    if (eventName !== 'session/event') return
    const [session, event] = args as [Session, SessionEvent]
    if (!owned(event)) return
    validateSession(session, fail)
  }, { global: true })
}, { inject: ['sessions'] })
/* jscpd:ignore-end */

/** Register the package invariant companion. */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
