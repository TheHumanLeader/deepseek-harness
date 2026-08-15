import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import type { RpcResponse, SettingsNamespaceView } from '@deepseek-ai/dsh-api-remotes/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { SlotRegistry } from '@deepseek-ai/dsh-client-runtime/client'
import { TestRemote, usePinnedBrowserLanguages } from '@deepseek-ai/dsh-client-test-runtime'
import { SettingsScopeBinder } from '@deepseek-ai/dsh-client-ui-settings/client'
import { resolveSlotLabel } from '@deepseek-ai/dsh-client-ui-slots'
import { apply, inject } from '@deepseek-ai/dsh-client-ui-agent-guidance/client'
import type { AgentGuidanceSectionInjected } from '../src/client/AgentGuidanceSection.tsx'
import { decodeSettings } from '../src/client/settings.ts'

usePinnedBrowserLanguages('zh-CN')

let rpc = 0

function ok<T>(value: T): RpcResponse<T> {
  return { rpcId: `guidance-${rpc++}` as never, result: { ok: true, value } }
}

function view(value = { enabled: true, prompt: 'Initial prompt.' }, revision = 0): SettingsNamespaceView {
  return {
    ns: 'agent-guidance',
    schema: {},
    value,
    applies: 'live',
    secrets: [],
    revision,
  }
}

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  ctx.provide('locale', new LocaleRuntime(ctx))
  new TestRemote(ctx)
  const mutate = vi.fn((_request: { ops: Array<{ op: string; path: string[]; value?: unknown }> }) =>
    Promise.resolve(ok(view({ enabled: false, prompt: 'Initial prompt.' }, 1))))
  ctx.provide('connection', {
    isLoopback: true,
    api: {
      settings: {
        describe: vi.fn(() => Promise.resolve(ok({
          writable: true,
          hasDocument: true,
          namespaces: [view()],
        }))),
        mutate,
      },
    },
  } as never)
  await ctx.plugin(SettingsScopeBinder).await()
  return { ctx, slots: ctx.get('slots') as SlotRegistry, mutate }
}

function declareRoot(slots: SlotRegistry): () => void {
  return slots.register({
    name: 'root',
    children: { 'settings.section': { kind: 'list', scope: 'root' } },
  } as never, () => null)
}

describe('ui-agent-guidance registration', () => {
  it('declares only the services used by its settings page', () => {
    expect(inject).toEqual(['slots', 'locale', 'connection', 'remote', 'settingsScope'])
  })

  it('registers the localized section, exposes settings actions, and disposes it', async () => {
    const { ctx, slots, mutate } = await bench()
    declareRoot(slots)
    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()

    const entry = slots.entries('settings.section')[0]!
    expect(entry.options).toMatchObject({ id: 'agent-guidance', order: 12 })
    expect(resolveSlotLabel(entry.options.label)).toBe('Agent 指令')
    const face = (entry.inject as unknown as () => AgentGuidanceSectionInjected)()
    await vi.waitFor(() => {
      expect(face.hooks.agentGuidance.getSnapshot()).toMatchObject({
        status: 'ready',
        value: { enabled: true, prompt: 'Initial prompt.' },
      })
    })

    await face.setEnabled(false)
    await face.savePrompt('Changed.')
    await face.resetPrompt()
    expect(mutate.mock.calls.map(([request]) => request.ops[0])).toEqual([
      { op: 'set', path: ['enabled'], value: false },
      { op: 'set', path: ['prompt'], value: 'Changed.' },
      { op: 'unset', path: ['prompt'] },
    ])

    await fiber.dispose()
    expect(slots.entries('settings.section')).toHaveLength(0)
  })

  it('waits for a settings declaration that arrives after apply', async () => {
    const { ctx, slots } = await bench()
    await ctx.plugin({ inject: [...inject], apply }).await()
    declareRoot(slots)
    await vi.waitFor(() => { expect(slots.entries('settings.section')).toHaveLength(1) })
  })
})

describe('agent-guidance settings decoder', () => {
  it('accepts a complete section', () => {
    expect(decodeSettings({ enabled: false, prompt: 'Rule.' }))
      .toEqual({ enabled: false, prompt: 'Rule.' })
  })

  it.each([null, [], 'text', { enabled: 'yes', prompt: 'Rule.' }, { enabled: true }])(
    'rejects incomplete or non-object settings: %o',
    (value) => { expect(decodeSettings(value)).toBeUndefined() },
  )
})
