/** Browser registration for global main-Agent instructions. */

import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { AgentGuidanceSection } from './AgentGuidanceSection.tsx'
import type {
  AgentGuidanceSectionInjected, AgentGuidanceSettings,
} from './AgentGuidanceSection.tsx'
import { en, zh, type AgentGuidanceKey } from './locales.ts'
import { decodeSettings } from './settings.ts'

export type {
  AgentGuidanceSectionInjected, AgentGuidanceSectionProps, AgentGuidanceSettings,
} from './AgentGuidanceSection.tsx'

const NS = 'settings.agentGuidance'
const SETTINGS_NS = 'agent-guidance'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Global main-Agent instruction editor copy. */
    'settings.agentGuidance': AgentGuidanceKey
  }
}

/** Required browser services. */
export const inject = ['slots', 'locale', 'connection', 'remote', 'settingsScope']

/** Register the dedicated Agent-instructions settings page. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-agent-guidance: dictionaries')
  const scope = ctx.settingsScope.bind<AgentGuidanceSettings>({
    namespace: SETTINGS_NS,
    decode: decodeSettings,
  })
  const injected = (): AgentGuidanceSectionInjected => ({
    hooks: { agentGuidance: scope },
    setEnabled: enabled => scope.set('enabled', enabled),
    savePrompt: prompt => scope.set('prompt', prompt),
    resetPrompt: () => scope.unset('prompt'),
  })
  const t = ctx.locale.bind(NS)
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'agent-guidance',
    order: 12,
    label: () => t('nav'),
    locale: NS,
    inject: injected,
  }, AgentGuidanceSection))
}
