import type { DesktopIpcResult } from '@mobi/shared/types/desktop'
import { DESKTOP_IPC_CHANNELS } from '@mobi/shared/types/desktop'
import { ipcMain } from 'electron'
import {
  describeTransferError,
  parseStableTokenRequest,
  parseUploadImageRequest,
  requestStableToken,
  uploadImage,
} from './wechat'

/**
 * ipcMain.handle 抛出的异常到渲染进程会被包成
 * "Error invoking remote method '...'"，用户看到的提示就废了。
 * 所以这里统一收成 result，preload 再拆回干净的 Error。
 */
async function toResult<T>(run: () => Promise<T>): Promise<DesktopIpcResult<T>> {
  try {
    return { ok: true, data: await run() }
  }
  catch (error) {
    return { ok: false, message: describeTransferError(error) }
  }
}

export function registerWechatIpc(): void {
  ipcMain.handle(DESKTOP_IPC_CHANNELS.wechatStableToken, (_event, payload: unknown) =>
    toResult(() => requestStableToken(parseStableTokenRequest(payload))))

  ipcMain.handle(DESKTOP_IPC_CHANNELS.wechatUploadImage, (_event, payload: unknown) =>
    toResult(() => uploadImage(parseUploadImageRequest(payload))))
}
