import type { WechatTransport } from './types'
import { getDesktopBridge } from '@/services/desktop/bridge'
import { createBrowserWechatTransport } from './browserTransport'
import { createDesktopWechatTransport } from './desktopTransport'

export { normalizeMpProxyOrigin } from './proxyOrigin'
export type { StableTokenInput, UploadImageInput, WechatTransport, WechatTransportKind } from './types'

let transport: WechatTransport | null = null

export function getWechatTransport(): WechatTransport {
  if (!transport) {
    const bridge = getDesktopBridge()
    transport = bridge
      ? createDesktopWechatTransport(bridge)
      : createBrowserWechatTransport()
  }

  return transport
}
