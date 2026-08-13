import type { DesktopBridge } from '@mobi/shared/types/desktop'
import { DESKTOP_BRIDGE_KEY, DESKTOP_BRIDGE_VERSION } from '@mobi/shared/types/desktop'

function readBridge(): DesktopBridge | null {
  if (typeof window === `undefined`) {
    return null
  }

  const candidate = (window as unknown as Record<string, unknown>)[DESKTOP_BRIDGE_KEY] as
    | DesktopBridge
    | undefined

  // 版本对不上说明壳和页面不是一起构建出来的，宁可退回浏览器那套也别猜
  if (!candidate || candidate.version !== DESKTOP_BRIDGE_VERSION) {
    return null
  }

  return candidate
}

let resolved: DesktopBridge | null | undefined

/** preload 在任何页面脚本之前执行完，所以第一次读到什么就是什么 */
export function getDesktopBridge(): DesktopBridge | null {
  if (resolved === undefined) {
    resolved = readBridge()
  }
  return resolved
}

export function isDesktopRuntime(): boolean {
  return getDesktopBridge() !== null
}
