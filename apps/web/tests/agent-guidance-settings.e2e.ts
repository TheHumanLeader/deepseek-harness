// Web e2e scenario: global main-Agent instructions. The shipped Web
// composition opens the dedicated settings page, persists an edited prompt
// through the real settings RPC, and removes that user override when the
// deployment default is restored. Zero model calls: session capture is owned
// by the host package snapshot scenario.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import type { Browser, Page } from 'playwright'
import { chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, onTestFailed } from 'vitest'
import {
  assertFixtureInventory, captureStableAria, compareOrRefreshGolden,
  launchWebScaffold, watchConsole, webSnapshotMode, type WebScaffold,
} from './scaffold.ts'
import { ZH_BROWSER_LOCALE, saveFailureShot } from './support.ts'

const SNAPSHOT_DIR = fileURLToPath(new URL('./snapshots/agent-guidance-settings', import.meta.url))
const SECTION_EXPECTED = join(SNAPSHOT_DIR, 'section.expected.md')
const MODE = webSnapshotMode()

describe('web e2e: global main-Agent instructions', () => {
  let scaffold: WebScaffold
  let browser: Browser
  let page: Page
  let tripwire: ReturnType<typeof watchConsole>

  beforeAll(async () => {
    scaffold = await launchWebScaffold({})
    browser = await chromium.launch()
    page = await browser.newPage({ viewport: { width: 1680, height: 1000 }, locale: ZH_BROWSER_LOCALE })
    tripwire = watchConsole(page)
    await page.goto(scaffold.baseUrl, { waitUntil: 'load' })
    await page.waitForSelector('[class*="frame"]', { timeout: 30_000 })
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
    await scaffold?.close()
  })

  async function openSection() {
    await page.getByRole('button', { name: '设置', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: '设置' })
    await dialog.waitFor({ timeout: 10_000 })
    await dialog.getByRole('button', { name: 'Agent 配置', exact: true }).click()
    await dialog.getByRole('heading', { name: 'Agent 配置', exact: true }).waitFor({ timeout: 10_000 })
    return dialog
  }

  async function settingsDocument(): Promise<string> {
    return readFile(join(scaffold.harnessHome, 'settings.yaml'), 'utf8').catch(() => '')
  }

  it('shows the two default rules in the shipped settings page', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-agent-guidance-default'))
    const dialog = await openSection()
    const prompt = dialog.getByRole('textbox', { name: '提示词', exact: true }).first()
    await prompt.waitFor({ timeout: 10_000 })
    await expect.poll(() => prompt.inputValue(), { timeout: 5_000 })
      .toContain('Follow the stage the user requested.')
    const value = await prompt.inputValue()
    expect(value).toContain('Follow the stage the user requested.')
    expect(value).toContain('Delegate external research to the researcher Agent.')
    expect(await dialog.getByRole('checkbox', { name: '使用全局指令' }).isChecked()).toBe(true)

    const snapshot = await captureStableAria(page, '[role="dialog"]', scaffold.workspaceCwd)
    await compareOrRefreshGolden(SECTION_EXPECTED, snapshot, MODE)
    expect(tripwire.pageErrors).toEqual([])
  }, 60_000)

  it('persists an edit and restores the deployment default', async () => {
    onTestFailed(() => saveFailureShot(page, 'web-e2e-agent-guidance-write'))
    const dialog = page.getByRole('dialog', { name: '设置' })
    const prompt = dialog.getByRole('textbox', { name: '提示词', exact: true }).first()
    const edited = '只完成用户要求的当前阶段。资料已经足够时停止检索。'

    await prompt.fill(edited)
    await dialog.getByRole('button', { name: '保存全部', exact: true }).click()
    await expect.poll(async () => await settingsDocument(), { timeout: 10_000 })
      .toContain('agent-guidance:')
    await expect.poll(async () => await settingsDocument(), { timeout: 10_000 })
      .toContain('prompt: 只完成用户要求的当前阶段。资料已经足够时停止检索。')

    await dialog.getByRole('button', { name: '恢复默认', exact: true }).click()
    await expect.poll(() => prompt.inputValue(), { timeout: 10_000 })
      .toContain('Follow the stage the user requested.')
    await expect.poll(async () => await settingsDocument(), { timeout: 10_000 })
      .not.toContain('prompt:')
    expect(tripwire.pageErrors).toEqual([])
  }, 60_000)

  it.skipIf(MODE === 'record')('keeps the fixture inventory closed', async () => {
    expect(tripwire.warnings).toEqual([])
    await assertFixtureInventory(SNAPSHOT_DIR, ['section.expected.md'])
  })
})
