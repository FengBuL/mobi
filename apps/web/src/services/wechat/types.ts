import type {
  WechatStableTokenResult,
  WechatUploadEndpoint,
  WechatUploadImageResult,
} from '@md/shared/types/desktop'

export type WechatTransportKind = `browser` | `desktop`

export interface StableTokenInput {
  appID: string
  appsecret: string
  proxyOrigin: string
}

export interface UploadImageInput {
  accessToken: string
  proxyOrigin: string
  endpoint: WechatUploadEndpoint
  file: File
}

/**
 * 调微信接口这件事，浏览器只能绕 mp-proxy，桌面版可以让主进程直接去调。
 * 差异全部收在这个接口后面，上层代码不需要知道自己跑在哪儿。
 */
export interface WechatTransport {
  readonly kind: WechatTransportKind
  /** 发请求前的配置自检：浏览器要拦掉填错的代理地址，桌面版没有代理可填 */
  assertConfigUsable: (proxyOrigin: string) => void
  requestStableToken: (input: StableTokenInput) => Promise<WechatStableTokenResult>
  uploadImage: (input: UploadImageInput) => Promise<WechatUploadImageResult>
  /** 复制链路回源抓远程图片的地址前缀，空串表示只能直连 */
  resolveImageFetchOrigin: (proxyOrigin: string) => string
  /** mmbiz 有防盗链，返回 true 时要给上传结果套一层图片代理，预览才显示得出来 */
  needsImageDisplayProxy: (proxyOrigin: string) => boolean
}
