import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import * as AgentGuidanceInvariant from '@deepseek-ai/dsh-client-ui-agent-guidance/invariant'

describe('invariant companion', () => {
  it('reserves package ownership with an empty installer', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry, { enabled: true })
    await expect(ctx.plugin(AgentGuidanceInvariant).await()).resolves.toBeDefined()
  })

  it('keeps the node half empty', async () => {
    const { apply } = await import('../src/index.ts')
    apply()
    expect(typeof apply).toBe('function')
  })
})
