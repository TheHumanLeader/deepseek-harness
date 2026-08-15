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
  if (typeof record.enabled !== 'boolean' || typeof record.prompt !== 'string'
    || !Array.isArray(record.projects) || !record.projects.every(isProject)
    || !Array.isArray(record.agents) || !record.agents.every(isAgent)) return undefined
  return {
    enabled: record.enabled,
    prompt: record.prompt,
    projects: record.projects,
    agents: record.agents,
  }
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function isProject(value: unknown): value is AgentGuidanceSettings['projects'][number] {
  return object(value) && typeof value.path === 'string' && typeof value.prompt === 'string' && typeof value.excludeGlobal === 'boolean'
}

function isAgent(value: unknown): value is AgentGuidanceSettings['agents'][number] {
  return object(value) && typeof value.id === 'string' && typeof value.name === 'string'
    && typeof value.purpose === 'string' && typeof value.prompt === 'string'
    && typeof value.provider === 'string' && typeof value.model === 'string'
    && strings(value.tools) && typeof value.allowDelegation === 'boolean'
}
