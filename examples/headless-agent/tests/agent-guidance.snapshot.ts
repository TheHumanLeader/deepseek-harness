/** Assembled-app snapshot for global main-Agent instructions. */

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeSessionLog, scrubRequestHeaders, type NormalizeContext } from '@deepseek-ai/dsh-acp-snapshot'
import { LOADER_SMOKE_TEST_TIMEOUT_MS, runLoaderSmoke } from '@deepseek-ai/dsh-loader-smoke'
import { SessionId } from '@deepseek-ai/dsh-session'
import { describe, expect, it } from 'vitest'

const fixtureDir = fileURLToPath(new URL('./agent-guidance-snapshots/default-rules', import.meta.url))
const sessionExpected = join(fixtureDir, 'session.expected.jsonl')
const configPath = fileURLToPath(new URL('../agent-guidance.cordis.snapshot.yml', import.meta.url))
const binScript = fileURLToPath(new URL('./fixtures/headless-driver.ts', import.meta.url))
const tsconfigPath = fileURLToPath(new URL('../../../tsconfig.json', import.meta.url))
const refreshing = process.env.DSH_SNAPSHOT === 'refresh'

describe('global Agent guidance snapshot', () => {
  it('persists the default instruction-following and search-stopping rules', async () => {
    let normalized = ''
    const result = await runLoaderSmoke({
      label: 'global Agent guidance headless snapshot',
      tempDirPrefix: 'dsh-agent-guidance-',
      binScript,
      libBinScript: binScript,
      configPath,
      binArgs: [configPath, 'Give a proposal only.'],
      tsconfigPath,
      inspect: async (cwd) => {
        const files = (await readdir(join(cwd, '.sessions'), { recursive: true }))
          .filter(file => file.endsWith('.jsonl'))
        expect(files).toHaveLength(1)
        const raw = await readFile(join(cwd, '.sessions', files[0]!), 'utf8')
        const header = JSON.parse(raw.split('\n', 1)[0]!) as { id: string }
        const context: NormalizeContext = { sessionIds: [SessionId(header.id)], cwd }
        normalized = scrubRequestHeaders(normalizeSessionLog(raw, context))
        if (refreshing) {
          await mkdir(fixtureDir, { recursive: true })
          await writeFile(sessionExpected, normalized)
        }
        expect(normalized).toBe(await readFile(sessionExpected, 'utf8'))
      },
    })

    expect(result.stderr).toBe('')
    expect(normalized).toContain('Follow the stage the user requested.')
    expect(normalized).toContain('Every search must answer a specific unresolved question.')
    expect(normalized.match(/"plugin":"agent-guidance"/g)).toHaveLength(1)
  }, LOADER_SMOKE_TEST_TIMEOUT_MS)
})
