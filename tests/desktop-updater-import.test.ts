import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const updaterSource = readFileSync(
  resolve(process.cwd(), 'apps/desktop/src/main/updates.ts'),
  'utf8',
)

describe('desktop updater module interop', () => {
  it('uses the named CommonJS export so the packaged main process can start', () => {
    expect(updaterSource).toContain(`import { autoUpdater } from 'electron-updater'`)
    expect(updaterSource).not.toContain(`import electronUpdater from 'electron-updater'`)
  })
})
