/** Browser registration for visual Agent configuration. */

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
    saveSettings: async (settings) => {
      await scope.set('enabled', settings.enabled)
      await scope.set('prompt', settings.prompt)
      await scope.set('projects', settings.projects)
      await scope.set('agents', settings.agents)
    },
    resetSettings: async () => {
      await scope.unset('enabled')
      await scope.unset('prompt')
      await scope.unset('projects')
      await scope.unset('agents')
    },
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
