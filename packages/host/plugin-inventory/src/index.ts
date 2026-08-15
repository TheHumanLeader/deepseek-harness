/** Read-only projection of the current Cordis Loader plugin entries. */

import type { Context, FiberState } from '@deepseek-ai/cordis'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'
// Typert-generated ./typert and ./remote artifacts import Zod at runtime.
import type {} from 'zod'
import type {
  PluginEntryId,
  PluginFiberPhase,
  PluginInventoryEntry,
  PluginInventorySnapshot,
} from './types.ts'

export type * from './types.ts'

/** Brand an existing Loader-tree entry id at the owning boundary. */
function pluginEntryId(value: string): PluginEntryId {
  return value as PluginEntryId
}

/** Runtime mirror: FiberState is a cross-package const enum. */
const FIBER_STATE = {
  PENDING: 0 as FiberState.PENDING,
  LOADING: 1 as FiberState.LOADING,
  ACTIVE: 2 as FiberState.ACTIVE,
  FAILED: 3 as FiberState.FAILED,
  DISPOSED: 4 as FiberState.DISPOSED,
  UNLOADING: 5 as FiberState.UNLOADING,
} as const

/** Complete public projection of Cordis Fiber states. */
const FIBER_PHASE = {
  [FIBER_STATE.PENDING]: 'pending',
  [FIBER_STATE.LOADING]: 'loading',
  [FIBER_STATE.ACTIVE]: 'active',
  [FIBER_STATE.FAILED]: 'failed',
  [FIBER_STATE.DISPOSED]: null,
  [FIBER_STATE.UNLOADING]: 'unloading',
} as const satisfies Record<FiberState, PluginFiberPhase>

interface PackageManifest {
  description?: string
  repository?: { url?: string; directory?: string }
}

const require = createRequire(import.meta.url)
const manifestCache = new Map<string, PackageManifest | null>()

function packageManifest(moduleName: string): PackageManifest | null {
  const cached = manifestCache.get(moduleName)
  if (cached !== undefined) return cached
  let manifest: PackageManifest | null = null
  try {
    manifest = JSON.parse(readFileSync(require.resolve(`${moduleName}/package.json`), 'utf8')) as PackageManifest
  } catch (_packageManifestUnavailable) {
    manifest = null
  }
  manifestCache.set(moduleName, manifest)
  return manifest
}

function documentationUrl(manifest: PackageManifest | null): string | null {
  const directory = manifest?.repository?.directory
  const repository = manifest?.repository?.url?.replace(/^git\+/, '').replace(/\.git$/, '')
  return directory === undefined || repository === undefined ? null : `${repository}/blob/master/${directory}/README.md`
}

function describe(moduleName: string, enabled: boolean, phase: PluginFiberPhase) {
  const manifest = packageManifest(moduleName)
  const short = moduleName.split('/').at(-1) ?? moduleName
  const tool = /(?:^|-)tool-/.test(short)
  const networkAccess = /(web|api|remote|llm|e2b|acp|sdk|gateway|client)/.test(short)
  const credentials = /(llm|deepseek|e2b|credential|api-gateway)/.test(short)
  const fileAccess = /(fs|file|workspace|shell|terminal|subprocess|skill)/.test(short)
  const changes = /(write|edit|shell|terminal|subprocess|self-modification|settings)/.test(short)
  const unavailableReason = !enabled
    ? 'Disabled by configuration.'
    : phase === 'failed'
      ? 'Plugin activation failed. Inspect the Host log for the recorded error.'
      : phase === 'pending'
        ? 'The plugin is waiting for a required service.'
        : phase === 'loading'
          ? 'The plugin is still loading.'
          : phase === 'unloading'
            ? 'The plugin is unloading.'
            : phase === null
              ? 'The plugin has no mounted runtime fiber.'
              : null
  return {
    purpose: manifest?.description ?? `Runtime plugin ${moduleName}.`,
    features: [tool ? `Model-facing tool provided by ${short}.` : `Runtime capability provided by ${short}.`],
    reads: fileAccess ? 'May read project or runtime data through its declared service.' : 'No project-data read is declared by the inventory.',
    changes: changes ? 'May change project or runtime state through its declared service.' : 'No project-data change is declared by the inventory.',
    sends: networkAccess ? 'May send request data to its configured external service.' : 'No external data transfer is declared by the inventory.',
    networkAccess,
    credentials,
    agentAccess: tool ? 'Agents whose preset and tool permissions include this tool.' : 'Host or Agent compositions that load this capability.',
    unavailableReason,
    documentation: documentationUrl(manifest),
  }
}

/** Remote-only service exposing the Loader's current non-group entry state. */
export class PluginInventoryGateway extends TypertRemoteService {
  static inject = ['loader']

  constructor(ctx: Context) {
    super(ctx, 'pluginInventory')
  }

  /**
   * Read the Loader directly on every call. Cordis's internal plugin/status
   * events already maintain Entry.fiber and Fiber.state, so a second cache
   * would only add another lifecycle truth to keep synchronized.
   * @returns Current non-group Loader entries in Loader order.
   */
  @Remote('list')
  list(): PluginInventorySnapshot {
    const entries: PluginInventoryEntry[] = []
    for (const entry of this.ctx.loader.entries()) {
      if (entry.options.group) continue
      const enabled = !entry.disabled
      const fiberPhase = entry.fiber === undefined ? null : FIBER_PHASE[entry.fiber.state]
      entries.push({
        entryId: pluginEntryId(entry.id),
        moduleName: entry.options.name,
        enabled,
        fiberPhase,
        ...describe(entry.options.name, enabled, fiberPhase),
      })
    }
    return { entries }
  }
}

export default PluginInventoryGateway
