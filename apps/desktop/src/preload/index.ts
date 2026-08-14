import type {
  DesktopBridge,
  DesktopIpcResult,
  DesktopUpdateState,
  WechatStableTokenRequest,
  WechatStableTokenResult,
  WechatUploadImageRequest,
  WechatUploadImageResult,
} from '@mobi/shared/types/desktop'
import {
  DESKTOP_BRIDGE_KEY,
  DESKTOP_BRIDGE_VERSION,
  DESKTOP_IPC_CHANNELS,
} from '@mobi/shared/types/desktop'
import { contextBridge, ipcRenderer } from 'electron'
import { IMAGE_FETCH_ORIGIN } from '../shared/scheme'

async function invoke<T>(channel: string, payload: unknown): Promise<T> {
  const result = await ipcRenderer.invoke(channel, payload) as DesktopIpcResult<T> | undefined

  if (!result?.ok) {
    throw new Error(result?.message || `桌面端请求失败`)
  }

  return result.data
}

const bridge: DesktopBridge = {
  version: DESKTOP_BRIDGE_VERSION,
  platform: process.platform,
  imageFetchOrigin: IMAGE_FETCH_ORIGIN,
  wechat: {
    requestStableToken: (payload: WechatStableTokenRequest) =>
      invoke<WechatStableTokenResult>(DESKTOP_IPC_CHANNELS.wechatStableToken, payload),
    uploadImage: (payload: WechatUploadImageRequest) =>
      invoke<WechatUploadImageResult>(DESKTOP_IPC_CHANNELS.wechatUploadImage, payload),
  },
  updates: {
    check: () => invoke<void>(DESKTOP_IPC_CHANNELS.updateCheck, undefined),
    download: () => invoke<void>(DESKTOP_IPC_CHANNELS.updateDownload, undefined),
    install: () => invoke<void>(DESKTOP_IPC_CHANNELS.updateInstall, undefined),
    onState: (listener: (state: DesktopUpdateState) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, state: DesktopUpdateState) => listener(state)
      ipcRenderer.on(DESKTOP_IPC_CHANNELS.updateState, handler)
      return () => ipcRenderer.removeListener(DESKTOP_IPC_CHANNELS.updateState, handler)
    },
  },
}

contextBridge.exposeInMainWorld(DESKTOP_BRIDGE_KEY, bridge)
