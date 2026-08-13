import type { WebContents } from 'electron'
import { session } from 'electron'
import { APP_ORIGIN } from '../shared/scheme'
import { devServerUrl, isDev } from './env'

/**
 * 编辑器要用的就这几样：读写用户选的文件夹、把排版结果写进剪贴板。
 * 其余一律拒掉——一个本地写作工具没有理由去问定位、摄像头或者通知。
 *
 * fileSystem 放行是为了让重启后恢复文件夹这件事对用户无感：
 * 页面从 IndexedDB 取回目录 handle 之后还要过一次权限检查，
 * 不放行的话每次开应用都要再点一遍授权，那持久化就白做了。
 */
const ALLOWED_PERMISSIONS = new Set([
  `fileSystem`,
  `clipboard-read`,
  `clipboard-sanitized-write`,
])

function isOwnPage(contents: WebContents | null, requestingUrl: string) {
  const url = contents?.getURL() || requestingUrl || ``

  if (url.startsWith(APP_ORIGIN)) {
    return true
  }

  return Boolean(devServerUrl) && url.startsWith(new URL(devServerUrl).origin)
}

export function installPermissionHandlers(): void {
  const target = session.defaultSession

  target.setPermissionRequestHandler((contents, permission, callback, details) => {
    const granted = ALLOWED_PERMISSIONS.has(permission)
      && isOwnPage(contents, details?.requestingUrl || ``)

    if (!granted && isDev) {
      console.log(`[mobi] 拒绝权限请求：${permission}`)
    }

    callback(granted)
  })

  target.setPermissionCheckHandler((contents, permission, requestingOrigin) => {
    return ALLOWED_PERMISSIONS.has(permission) && isOwnPage(contents, requestingOrigin)
  })
}
