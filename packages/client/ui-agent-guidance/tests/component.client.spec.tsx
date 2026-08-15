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
  value: { enabled: true, prompt: 'Initial prompt.' },
  base: { enabled: true, prompt: 'Default prompt.' },
  user: {},
  revision: 0,
  writable: true,
  mode: 'host',
}

function renderSection(
  state: SettingsScopeSnapshot<AgentGuidanceSettings>,
  actions: Partial<Omit<AgentGuidanceSectionInjected, 'hooks'>> = {},
) {
  const setEnabled = actions.setEnabled ?? vi.fn(() => Promise.resolve())
  const savePrompt = actions.savePrompt ?? vi.fn(() => Promise.resolve())
  const resetPrompt = actions.resetPrompt ?? vi.fn(() => Promise.resolve())
  const props = {
    t: (key: keyof typeof en) => en[key],
    useAgentGuidance: <T,>(selector: (snapshot: typeof state) => T): T => selector(state),
    setEnabled,
    savePrompt,
    resetPrompt,
  } as AgentGuidanceSectionProps
  return { ...render(<AgentGuidanceSection {...props} />), setEnabled, savePrompt, resetPrompt }
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
    const { setEnabled, savePrompt, resetPrompt } = renderSection(ready)
    expect(screen.getByText(en.newSessionsOnly)).toBeTruthy()
    const input = screen.getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: 'Changed prompt.' } })
    expect(input.value).toBe('Changed prompt.')
    expect(screen.getAllByText('Changed prompt.')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: en.save }))
    await waitFor(() => { expect(savePrompt).toHaveBeenCalledWith('Changed prompt.') })
    fireEvent.click(screen.getByRole('checkbox'))
    await waitFor(() => { expect(setEnabled).toHaveBeenCalledWith(false) })
    fireEvent.click(screen.getByRole('button', { name: en.reset }))
    await waitFor(() => { expect(resetPrompt).toHaveBeenCalled() })
  })

  it('shows saving state until a write settles', async () => {
    let settle!: () => void
    const savePrompt = vi.fn(() => new Promise<void>((resolve) => { settle = resolve }))
    renderSection(ready, { savePrompt })
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Pending.' } })
    fireEvent.click(screen.getByRole('button', { name: en.save }))
    expect((await screen.findByRole('button', { name: en.saving })).hasAttribute('disabled')).toBe(true)
    settle()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: en.save }).hasAttribute('disabled')).toBe(false)
    })
  })

  it('disables every write control for a read-only namespace', () => {
    renderSection({ ...ready, writable: false })
    expect(screen.getByText(en.readOnly)).toBeTruthy()
    expect(screen.getByRole('textbox').hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('checkbox').hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: en.save }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: en.reset }).hasAttribute('disabled')).toBe(true)
  })
})
