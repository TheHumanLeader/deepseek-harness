/** Wire decoder for the `agent-guidance` settings namespace. */

import type { AgentGuidanceSettings } from './AgentGuidanceSection.tsx'

/**
 * Accept one complete Host-resolved settings section.
 * @param value - JSON value returned by the Settings RPC.
 * @returns Narrowed settings, or undefined when the section is incomplete.
 */
export function decodeSettings(value: unknown): AgentGuidanceSettings | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  if (typeof record.enabled !== 'boolean' || typeof record.prompt !== 'string') return undefined
  return { enabled: record.enabled, prompt: record.prompt }
}
