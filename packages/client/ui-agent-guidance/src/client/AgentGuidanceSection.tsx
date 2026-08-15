/** Visual configuration for main, project, and helper Agents. */

import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { HostObservable, InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { AgentGuidanceKey } from './locales.ts'
import css from './AgentGuidanceSection.module.css'

/** Client-side project instruction row. */
export interface ProjectGuidanceSettings {
  path: string
  prompt: string
  excludeGlobal: boolean
}

/** Client-side helper Agent editor value. */
export interface ManagedAgentSettings {
  id: string
  name: string
  purpose: string
  prompt: string
  provider: string
  model: string
  tools: string[]
  allowDelegation: boolean
}

/** Complete Agent settings value displayed by the page. */
export interface AgentGuidanceSettings {
  enabled: boolean
  prompt: string
  projects: ProjectGuidanceSettings[]
  agents: ManagedAgentSettings[]
}

const BUILT_INS = new Set(['researcher', 'project-explorer', 'reviewer', 'agent-manager'])

/** Settings state and mutations injected by the browser plugin. */
export interface AgentGuidanceSectionInjected {
  hooks: { agentGuidance: HostObservable<SettingsScopeSnapshot<AgentGuidanceSettings>> }
  saveSettings: (settings: AgentGuidanceSettings) => Promise<void>
  resetSettings: () => Promise<void>
}

/** Full Agent settings section props. */
export type AgentGuidanceSectionProps = PropsRuntime<'settings.section'>
  & PropsLocale<'settings.agentGuidance'> & InjectFace<AgentGuidanceSectionInjected>

function Status({ text }: { text: string }): ReactNode { return <p className={css.status}>{text}</p> }
function csv(values: string[]): string { return values.join(', ') }
function parseCsv(value: string): string[] { return [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))] }

/** Render the complete Agent configuration page. */
export function AgentGuidanceSection(props: AgentGuidanceSectionProps): ReactNode {
  const { t, useAgentGuidance } = props
  const state = useAgentGuidance(snapshot => snapshot)
  const [draft, setDraft] = useState<AgentGuidanceSettings>()
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (state.value !== undefined) setDraft(structuredClone(state.value)) }, [state.value])
  if (state.status === 'loading') return <Status text={t('loading')} />
  if (state.status === 'unavailable' || state.value === undefined || draft === undefined) return <Status text={t('unavailable')} />

  const writable = state.writable && !saving
  const changed = JSON.stringify(draft) !== JSON.stringify(state.value)
  const run = async (operation: () => Promise<void>): Promise<void> => {
    setSaving(true)
    try { await operation() } finally { setSaving(false) }
  }
  const updateAgent = (index: number, patch: Partial<ManagedAgentSettings>): void => {
    setDraft(current => current === undefined ? current : {
      ...current,
      agents: current.agents.map((agent, candidate) => candidate === index ? { ...agent, ...patch } : agent),
    })
  }
  const updateProject = (index: number, patch: Partial<ProjectGuidanceSettings>): void => {
    setDraft(current => current === undefined ? current : {
      ...current,
      projects: current.projects.map((project, candidate) => candidate === index ? { ...project, ...patch } : project),
    })
  }

  return (
    <section className={css.section}>
      <div><h2 className={css.title}>{t('title')}</h2><p className={css.description}>{t('description')}</p></div>
      <p className={css.notice}>{t('live')}</p>

      <div className={css.panel}>
        <div className={css.panelHeading}><h3>{t('mainAgent')}</h3><span>{t('systemAgent')}</span></div>
        <label className={css.toggle}>
          <input type="checkbox" checked={draft.enabled} disabled={!writable}
            onChange={(event) => { setDraft({ ...draft, enabled: event.target.checked }) }} />
          <span><strong>{t('enabled')}</strong><small>{t('enabledHint')}</small></span>
        </label>
        <label className={css.field}><span>{t('prompt')}</span>
          <textarea value={draft.prompt} rows={9} maxLength={32_768} disabled={!writable}
            onChange={(event) => { setDraft({ ...draft, prompt: event.target.value }) }} />
        </label>
      </div>

      <div className={css.groupHeading}><div><h3>{t('projects')}</h3><p>{t('projectsHint')}</p></div>
        <Button variant="outline" disabled={!writable} onClick={() => { setDraft({ ...draft, projects: [...draft.projects, { path: '', prompt: '', excludeGlobal: false }] }) }}>{t('addProject')}</Button></div>
      {draft.projects.map((project, index) => (
        <div className={css.panel} key={`${index}-${project.path}`}>
          <label className={css.field}><span>{t('projectPath')}</span><input value={project.path} disabled={!writable} onChange={(event) => { updateProject(index, { path: event.target.value }) }} /></label>
          <label className={css.field}><span>{t('projectPrompt')}</span><textarea rows={6} value={project.prompt} disabled={!writable} onChange={(event) => { updateProject(index, { prompt: event.target.value }) }} /></label>
          <label className={css.inline}><input type="checkbox" checked={project.excludeGlobal} disabled={!writable} onChange={(event) => { updateProject(index, { excludeGlobal: event.target.checked }) }} />{t('excludeGlobal')}</label>
          <Button variant="outline" disabled={!writable} onClick={() => { setDraft({ ...draft, projects: draft.projects.filter((_, candidate) => candidate !== index) }) }}>{t('remove')}</Button>
        </div>
      ))}

      <div className={css.groupHeading}><div><h3>{t('agents')}</h3><p>{t('agentsHint')}</p></div>
        <Button variant="outline" disabled={!writable} onClick={() => {
          let suffix = draft.agents.length + 1
          while (draft.agents.some(agent => agent.id === `custom-${suffix}`)) suffix += 1
          setDraft({ ...draft, agents: [...draft.agents, { id: `custom-${suffix}`, name: t('newAgent'), purpose: '', prompt: '', provider: '', model: '', tools: [], allowDelegation: false }] })
        }}>{t('addAgent')}</Button></div>
      <div className={css.agentGrid}>
        {draft.agents.map((agent, index) => {
          const builtIn = BUILT_INS.has(agent.id)
          return <details className={css.agentCard} key={agent.id} open={builtIn && index === 0}>
            <summary><span><strong>{agent.name}</strong><small>{agent.purpose || t('noPurpose')}</small></span><em>{builtIn ? t('systemAgent') : t('customAgent')}</em></summary>
            <div className={css.agentBody}>
              <div className={css.columns}>
                <label className={css.field}><span>{t('agentId')}</span><input value={agent.id} disabled={!writable || builtIn} onChange={(event) => { updateAgent(index, { id: event.target.value }) }} /></label>
                <label className={css.field}><span>{t('agentName')}</span><input value={agent.name} disabled={!writable} onChange={(event) => { updateAgent(index, { name: event.target.value }) }} /></label>
              </div>
              <label className={css.field}><span>{t('purpose')}</span><input value={agent.purpose} disabled={!writable} onChange={(event) => { updateAgent(index, { purpose: event.target.value }) }} /></label>
              <label className={css.field}><span>{t('prompt')}</span><textarea rows={7} value={agent.prompt} disabled={!writable} onChange={(event) => { updateAgent(index, { prompt: event.target.value }) }} /></label>
              <div className={css.columns}>
                <label className={css.field}><span>{t('provider')}</span><input value={agent.provider} placeholder={t('inherit')} disabled={!writable} onChange={(event) => { updateAgent(index, { provider: event.target.value }) }} /></label>
                <label className={css.field}><span>{t('model')}</span><input value={agent.model} placeholder={t('inherit')} disabled={!writable} onChange={(event) => { updateAgent(index, { model: event.target.value }) }} /></label>
              </div>
              <label className={css.field}><span>{t('tools')}</span><input value={csv(agent.tools)} placeholder={t('toolsHint')} disabled={!writable} onChange={(event) => { updateAgent(index, { tools: parseCsv(event.target.value) }) }} /></label>
              <label className={css.inline}><input type="checkbox" checked={agent.allowDelegation} disabled={!writable || builtIn} onChange={(event) => { updateAgent(index, { allowDelegation: event.target.checked }) }} />{t('allowDelegation')}</label>
              {!builtIn ? <Button variant="outline" disabled={!writable} onClick={() => { setDraft({ ...draft, agents: draft.agents.filter((_, candidate) => candidate !== index) }) }}>{t('deleteAgent')}</Button> : null}
            </div>
          </details>
        })}
      </div>

      {!state.writable ? <p className={css.readOnly}>{t('readOnly')}</p> : null}
      <div className={css.actions}>
        <Button disabled={!writable || !changed} onClick={() => { void run(() => props.saveSettings(draft)) }}>{saving ? t('saving') : t('save')}</Button>
        <Button variant="outline" disabled={!writable} onClick={() => { void run(props.resetSettings) }}>{t('reset')}</Button>
      </div>
      <details className={css.preview}><summary>{t('preview')}</summary><pre>{draft.prompt}</pre></details>
    </section>
  )
}

export type { AgentGuidanceKey }
