import type { Branded } from '@deepseek-ai/dsh-brand'

/** Stable Loader-tree identity of one configured plugin entry. */
export type PluginEntryId = Branded<'PluginEntryId'>

/** Lifecycle state of an entry's root Fiber, or null when it has no live root Fiber. */
export type PluginFiberPhase =
  | 'pending'
  | 'loading'
  | 'active'
  | 'failed'
  | 'unloading'
  | null

/** One non-group Loader entry exposed to trusted clients. */
export interface PluginInventoryEntry {
  readonly entryId: PluginEntryId
  /** Exact module specifier imported by the Loader entry. */
  readonly moduleName: string
  /** Effective Loader enablement, including disabled ancestor groups. */
  readonly enabled: boolean
  readonly fiberPhase: PluginFiberPhase
  /** Human-readable package purpose. */
  readonly purpose: string
  /** Main features or model-facing tools provided by the package. */
  readonly features: readonly string[]
  /** Data the plugin may read. */
  readonly reads: string
  /** Data the plugin may change. */
  readonly changes: string
  /** Data the plugin may send outside the local process. */
  readonly sends: string
  /** Whether ordinary operation may require network access. */
  readonly networkAccess: boolean
  /** Whether ordinary operation may require credentials. */
  readonly credentials: boolean
  /** Which Agent surface receives the plugin. */
  readonly agentAccess: string
  /** Direct explanation when the entry is not currently usable. */
  readonly unavailableReason: string | null
  /** Package documentation, when the package declares a repository directory. */
  readonly documentation: string | null
}

/** Point-in-time inventory returned by the plugin inventory Remote. */
export interface PluginInventorySnapshot {
  readonly entries: readonly PluginInventoryEntry[]
}
