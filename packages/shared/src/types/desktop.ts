/**
 * 桌面版（Electron）主进程与渲染进程之间的契约。
 *
 * preload 只按 `DesktopBridge` 的形状挂一层白名单出去，渲染进程拿不到 ipcRenderer 本体，
 * 也就没法自己拼频道名去调用没被列进来的能力。
 *
 * 这个文件同时被 preload（Node 侧）和 apps/web（浏览器侧）引用，
 * 所以不能 import 任何 electron 或 DOM 专属的东西。
 */

export const DESKTOP_BRIDGE_KEY = `mobiDesktop`

/** 契约有破坏性改动时 +1，渲染进程据此决定要不要信任挂进来的 bridge */
export const DESKTOP_BRIDGE_VERSION = 3

export const DESKTOP_IPC_CHANNELS = {
  wechatStableToken: `mobi:wechat:stable-token`,
  wechatUploadImage: `mobi:wechat:upload-image`,
  updateCheck: `mobi:update:check`,
  updateDownload: `mobi:update:download`,
  updateInstall: `mobi:update:install`,
  updateState: `mobi:update:state`,
  folderChoose: `mobi:folder:choose`,
  folderRemember: `mobi:folder:remember`,
  folderReadDirectory: `mobi:folder:read-directory`,
  folderReadFile: `mobi:folder:read-file`,
  folderWriteFile: `mobi:folder:write-file`,
} as const

export interface DesktopFolderRoot {
  name: string
  path: string
}

export interface DesktopFolderEntry extends DesktopFolderRoot {
  type: `file` | `directory`
}

export interface WechatStableTokenRequest {
  appID: string
  appsecret: string
}

/** 微信原样返回的 JSON，字段名保持它那边的下划线风格，方便和浏览器直连的响应互换 */
export interface WechatStableTokenResult {
  access_token?: string
  expires_in?: number
  errcode?: number
  errmsg?: string
}

/** 小于 1MB 的 jpeg/png 走 uploadimg，其余走 add_material，和浏览器端的判断保持一致 */
export type WechatUploadEndpoint = `uploadimg` | `add_material`

export interface WechatUploadImageRequest {
  accessToken: string
  endpoint: WechatUploadEndpoint
  filename: string
  contentType: string
  /** File 过不了结构化克隆，渲染进程先读成字节再传。写死 ArrayBuffer 是为了让主进程能直接拿去构造 Blob */
  bytes: Uint8Array<ArrayBuffer>
}

export interface WechatUploadImageResult {
  url?: string
  media_id?: string
  errcode?: number
  errmsg?: string
}

/**
 * IPC 层面的成败。微信自己返回的 errcode 不算失败——那是业务结果，
 * 原样放在 data 里交给渲染进程判断，免得两边对错误的定义打架。
 */
export type DesktopIpcResult<T>
  = | { ok: true, data: T }
    | { ok: false, message: string }

export type DesktopUpdateState
  = | { status: `idle` }
    | { status: `checking` }
    | { status: `available`, version: string, releaseNotes: string }
    | { status: `not-available`, version: string }
    | {
      status: `downloading`
      version: string
      percent: number
      transferred: number
      total: number
      bytesPerSecond: number
    }
    | { status: `downloaded`, version: string, releaseNotes: string }
    | {
      status: `manual-update-required`
      version: string
      releaseNotes: string
      downloadUrl: string
    }
    | { status: `error`, message: string }

export interface DesktopBridge {
  readonly version: number
  readonly platform: string
  /**
   * 复制链路回源抓远程图片的地址前缀。浏览器里这个位置是用户填的 mp-proxy，
   * 桌面版换成主进程注册的自定义协议，省掉再跑一个 HTTP 服务。
   */
  readonly imageFetchOrigin: string
  readonly folders: {
    choose: () => Promise<DesktopFolderRoot | null>
    remember: (path: string) => Promise<DesktopFolderRoot | null>
    readDirectory: (path: string) => Promise<DesktopFolderEntry[]>
    readFile: (path: string) => Promise<string>
    writeFile: (path: string, content: string) => Promise<void>
  }
  readonly wechat: {
    requestStableToken: (payload: WechatStableTokenRequest) => Promise<WechatStableTokenResult>
    uploadImage: (payload: WechatUploadImageRequest) => Promise<WechatUploadImageResult>
  }
  readonly updates: {
    check: () => Promise<void>
    download: () => Promise<void>
    install: () => Promise<void>
    onState: (listener: (state: DesktopUpdateState) => void) => () => void
  }
}
