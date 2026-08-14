import type { DesktopIpcResult, DesktopUpdateState } from '@mobi/shared/types/desktop'
import type { BrowserWindow } from 'electron'
import { DESKTOP_IPC_CHANNELS } from '@mobi/shared/types/desktop'
import { app, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { createDesktopUpdateController } from './updateController'

const STARTUP_CHECK_DELAY_MS = 8000

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function toResult(run: () => Promise<void> | void): Promise<DesktopIpcResult<void>> {
  try {
    await run()
    return { ok: true, data: undefined }
  }
  catch (error) {
    return { ok: false, message: toErrorMessage(error) }
  }
}

export function initializeDesktopUpdates(mainWindow: BrowserWindow): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = false

  const emit = (state: DesktopUpdateState) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(DESKTOP_IPC_CHANNELS.updateState, state)
    }
  }
  const controller = createDesktopUpdateController(autoUpdater, emit)

  ipcMain.handle(DESKTOP_IPC_CHANNELS.updateCheck, () =>
    toResult(() => controller.check()))
  ipcMain.handle(DESKTOP_IPC_CHANNELS.updateDownload, () =>
    toResult(() => controller.download()))
  ipcMain.handle(DESKTOP_IPC_CHANNELS.updateInstall, () =>
    toResult(() => controller.install()))

  if (app.isPackaged) {
    setTimeout(() => {
      void controller.check().catch(error => emit({ status: `error`, message: toErrorMessage(error) }))
    }, STARTUP_CHECK_DELAY_MS)
  }
}
