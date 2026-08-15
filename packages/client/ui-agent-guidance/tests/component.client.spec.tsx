// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import { AgentGuidanceSection } from '../src/client/AgentGuidanceSection.tsx'
import type {
  AgentGuidanceSectionInjected, AgentGuidanceSectionProps, AgentGuidanceSettings,
} from '../src/client/AgentGuidanceSection.tsx'
import { en } from '../src/client/locales.ts'

afterEach(cleanup)

const ready: SettingsScopeSnapshot<AgentGuidanceSettings> = {
  status: 'ready',
  value: { enabled: true, prompt: 'Initial prompt.', projects: [], agents: [] },
  base: { enabled: true, prompt: 'Default prompt.', projects: [], agents: [] },
  user: {},
  revision: 0,
  writable: true,
  mode: 'host',
}

function renderSection(
  state: SettingsScopeSnapshot<AgentGuidanceSettings>,
  actions: Partial<Omit<AgentGuidanceSectionInjected, 'hooks'>> = {},
) {
  const saveSettings = actions.saveSettings ?? vi.fn(() => Promise.resolve())
  const resetSettings = actions.resetSettings ?? vi.fn(() => Promise.resolve())
  const props = {
    t: (key: keyof typeof en) => en[key],
    useAgentGuidance: <T,>(selector: (snapshot: typeof state) => T): T => selector(state),
    saveSettings,
    resetSettings,
    close: vi.fn(),
  } as unknown as AgentGuidanceSectionProps
  return { ...render(<AgentGuidanceSection {...props} />), saveSettings, resetSettings }
}

describe('AgentGuidanceSection', () => {
  it('reports loading and unavailable states', () => {
    const loading = { ...ready, status: 'loading' as const, value: undefined }
    const first = renderSection(loading)
    expect(screen.getByText(en.loading)).toBeTruthy()
    first.unmount()
    renderSection({ ...loading, status: 'unavailable' })
    expect(screen.getByText(en.unavailable)).toBeTruthy()
  })

  it('edits, saves, resets, toggles, and previews instructions', async () => {
    const { saveSettings, resetSettings } = renderSection(ready)
    expect(screen.getByText(en.live)).toBeTruthy()
    const input = screen.getAllByRole('textbox')[0] as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: 'Changed prompt.' } })
    expect(input.value).toBe('Changed prompt.')

    fireEvent.click(screen.getByRole('button', { name: en.save }))
    await waitFor(() => { expect(saveSettings).toHaveBeenCalledWith(expect.objectContaining({ prompt: 'Changed prompt.' })) })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: en.save }))
    await waitFor(() => { expect(saveSettings).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false })) })
    fireEvent.click(screen.getByRole('button', { name: en.reset }))
    await waitFor(() => { expect(resetSettings).toHaveBeenCalled() })
  })

  it('shows saving state until a write settles', async () => {
    let settle!: () => void
    const saveSettings = vi.fn(() => new Promise<void>((resolve) => { settle = resolve }))
    renderSection(ready, { saveSettings })
    fireEvent.change(screen.getAllByRole('textbox')[0]!, { target: { value: 'Pending.' } })
    fireEvent.click(screen.getByRole('button', { name: en.save }))
    expect((await screen.findByRole('button', { name: en.saving })).hasAttribute('disabled')).toBe(true)
    settle()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: en.save }).hasAttribute('disabled')).toBe(false)
    })
  })

  it('adds project instructions and a user Agent to the saved configuration', async () => {
    const { saveSettings } = renderSection(ready)
    fireEvent.click(screen.getByRole('button', { name: en.addProject }))
    fireEvent.change(screen.getByRole('textbox', { name: en.projectPath }), { target: { value: 'C:\\work\\app' } })
    fireEvent.change(screen.getByRole('textbox', { name: en.projectPrompt }), { target: { value: 'Run focused tests.' } })
    fireEvent.click(screen.getByRole('button', { name: en.addAgent }))
    fireEvent.click(screen.getByText(en.newAgent))
    fireEvent.change(screen.getByRole('textbox', { name: en.purpose }), { target: { value: 'Check releases.' } })
    fireEvent.click(screen.getByRole('button', { name: en.save }))
    await waitFor(() => {
      expect(saveSettings).toHaveBeenCalledWith(expect.objectContaining({
        projects: [{ path: 'C:\\work\\app', prompt: 'Run focused tests.', excludeGlobal: false }],
        agents: [expect.objectContaining({ purpose: 'Check releases.' })],
      }))
    })
  })

  it('disables every write control for a read-only namespace', () => {
    renderSection({ ...ready, writable: false })
    expect(screen.getByText(en.readOnly)).toBeTruthy()
    expect(screen.getAllByRole('textbox').every(input => input.hasAttribute('disabled'))).toBe(true)
    expect(screen.getByRole('checkbox').hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: en.save }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: en.reset }).hasAttribute('disabled')).toBe(true)
  })
})
