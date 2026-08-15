/** Global main-Agent instructions editor. */

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { HostObservable, InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { AgentGuidanceKey } from './locales.ts'
import css from './AgentGuidanceSection.module.css'

/** Client-safe mirror of the Host settings section. */
export interface AgentGuidanceSettings {
  enabled: boolean
  prompt: string
}

/** Business face supplied by the slot registration. */
export interface AgentGuidanceSectionInjected {
  hooks: {
    /** Host settings snapshot, bound by the renderer as `useAgentGuidance`. */
    agentGuidance: HostObservable<SettingsScopeSnapshot<AgentGuidanceSettings>>
  }
  /** Enable or disable the instructions for later sessions. */
  setEnabled: (enabled: boolean) => Promise<void>
  /** Save the edited prompt. */
  savePrompt: (prompt: string) => Promise<void>
  /** Clear the user override and restore the deployment default. */
  resetPrompt: () => Promise<void>
}

/** Full component props. */
export type AgentGuidanceSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'settings.agentGuidance'>
  & InjectFace<AgentGuidanceSectionInjected>

function Status({ text }: { text: string }): ReactNode {
  return <p className={css.status}>{text}</p>
}

/** Render the global main-Agent instructions page. */
export function AgentGuidanceSection(props: AgentGuidanceSectionProps): ReactNode {
  const { t, useAgentGuidance } = props
  const state = useAgentGuidance(snapshot => snapshot)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (state.value !== undefined) setDraft(state.value.prompt)
  }, [state.value?.prompt])

  if (state.status === 'loading') return <Status text={t('loading')} />
  if (state.status === 'unavailable' || state.value === undefined) return <Status text={t('unavailable')} />

  const changed = draft !== state.value.prompt
  const writable = state.writable && !saving
  const run = async (operation: () => Promise<void>): Promise<void> => {
    setSaving(true)
    try {
      await operation()
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={css.section}>
      <div>
        <h2 className={css.title}>{t('title')}</h2>
        <p className={css.description}>{t('description')}</p>
      </div>
      <p className={css.notice}>{t('newSessionsOnly')}</p>
      <label className={css.toggle}>
        <input
          type="checkbox"
          checked={state.value.enabled}
          disabled={!writable}
          onChange={(event) => { void run(() => props.setEnabled(event.target.checked)) }}
        />
        <span>
          <strong>{t('enabled')}</strong>
          <small>{t('enabledHint')}</small>
        </span>
      </label>
      <label className={css.field}>
        <span className={css.label}>{t('prompt')}</span>
        <span className={css.hint}>{t('promptHint')}</span>
        <textarea
          className={css.textarea}
          value={draft}
          rows={12}
          maxLength={32_768}
          disabled={!writable}
          onChange={(event) => { setDraft(event.target.value) }}
        />
      </label>
      {!state.writable ? <p className={css.readOnly}>{t('readOnly')}</p> : null}
      <div className={css.actions}>
        <Button
          disabled={!writable || !changed}
          onClick={() => { void run(() => props.savePrompt(draft)) }}
        >
          {saving ? t('saving') : t('save')}
        </Button>
        <Button
          variant="outline"
          disabled={!writable}
          onClick={() => { void run(props.resetPrompt) }}
        >
          {t('reset')}
        </Button>
      </div>
      <details className={css.preview}>
        <summary>{t('preview')}</summary>
        <pre>{draft}</pre>
      </details>
    </section>
  )
}

/** Locale-key witness retained beside the component contract. */
export type { AgentGuidanceKey }
