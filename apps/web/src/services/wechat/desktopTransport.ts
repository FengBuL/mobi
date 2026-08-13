import type {
  DesktopBridge,
  WechatStableTokenResult,
  WechatUploadImageResult,
} from '@mobi/shared/types/desktop'
import type { StableTokenInput, UploadImageInput, WechatTransport } from './types'

/** 桌面版由主进程直接去调微信，不经过 mp-proxy，也就没有代理地址这回事 */
export function createDesktopWechatTransport(bridge: DesktopBridge): WechatTransport {
  return {
    kind: `desktop`,

    assertConfigUsable() {
      // 没有代理可填，也就没什么可校验
    },

    requestStableToken({ appID, appsecret }: StableTokenInput): Promise<WechatStableTokenResult> {
      return bridge.wechat.requestStableToken({ appID, appsecret })
    },

    async uploadImage(
      { accessToken, endpoint, file }: UploadImageInput,
    ): Promise<WechatUploadImageResult> {
      return bridge.wechat.uploadImage({
        accessToken,
        endpoint,
        filename: file.name,
        contentType: file.type,
        bytes: new Uint8Array(await file.arrayBuffer()),
      })
    },

    resolveImageFetchOrigin: () => bridge.imageFetchOrigin,

    // 窗口跑在自定义协议上，不是 mmbiz 认的来源，直链在预览里会被防盗链挡掉
    needsImageDisplayProxy: () => true,
  }
}
