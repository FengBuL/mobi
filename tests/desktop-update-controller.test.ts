import { describe, expect, it, vi } from 'vitest'
import { createDesktopUpdateController } from '../apps/desktop/src/main/updateController'

function createFakeUpdater() {
  const listeners = new Map<string, Array<(...args: any[]) => void>>()
  return {
    checkForUpdates: vi.fn(async () => {}),
    downloadUpdate: vi.fn(async () => {}),
    quitAndInstall: vi.fn(),
    on(event: string, listener: (...args: any[]) => void) {
      const current = listeners.get(event) || []
      current.push(listener)
      listeners.set(event, current)
    },
    emit(event: string, ...args: any[]) {
      for (const listener of listeners.get(event) || []) {
        listener(...args)
      }
    },
  }
}

describe(`桌面更新控制器`, () => {
  it(`发现新版后等待用户确认再下载`, async () => {
    const updater = createFakeUpdater()
    const states: any[] = []
    const controller = createDesktopUpdateController(updater, state => states.push(state))

    updater.emit(`update-available`, {
      version: `2.2.0`,
      releaseNotes: `新增应用内更新`,
    })

    expect(states.at(-1)).toEqual({
      status: `available`,
      version: `2.2.0`,
      releaseNotes: `新增应用内更新`,
    })
    expect(updater.downloadUpdate).not.toHaveBeenCalled()

    await controller.download()
    expect(updater.downloadUpdate).toHaveBeenCalledOnce()
  })

  it(`报告下载进度并由用户触发重启安装`, () => {
    const updater = createFakeUpdater()
    const states: any[] = []
    const controller = createDesktopUpdateController(updater, state => states.push(state))

    updater.emit(`update-available`, { version: `2.2.0`, releaseNotes: null })
    updater.emit(`download-progress`, {
      percent: 48.2,
      transferred: 482,
      total: 1000,
      bytesPerSecond: 100,
    })
    updater.emit(`update-downloaded`, { version: `2.2.0`, releaseNotes: null })

    expect(states).toContainEqual({
      status: `downloading`,
      version: `2.2.0`,
      percent: 48.2,
      transferred: 482,
      total: 1000,
      bytesPerSecond: 100,
    })
    expect(states.at(-1)).toEqual({
      status: `downloaded`,
      version: `2.2.0`,
      releaseNotes: ``,
    })

    controller.install()
    expect(updater.quitAndInstall).toHaveBeenCalledOnce()
  })
})
