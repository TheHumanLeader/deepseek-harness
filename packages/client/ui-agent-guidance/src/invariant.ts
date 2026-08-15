/** Package-owned invariant companion for the browser-only settings surface. */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-agent-guidance'

/** Cordis companion plugin name. */
export const name = 'client-ui-agent-guidance-invariant'
/** Service required before package ownership can be reserved. */
export const inject = ['invariants']

// No runtime invariant: the Host package owns the durable snapshot invariant,
// while this browser package has no node-side state or event stream of its own.
const install: InvariantInstaller = () => {}

/** Register the empty browser-package companion. */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
