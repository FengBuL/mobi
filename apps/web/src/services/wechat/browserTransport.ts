import type { WechatStableTokenResult, WechatUploadImageResult } from '@mobi/shared/types/desktop'
import type { StableTokenInput, UploadImageInput, WechatTransport } from './types'
import fetch from '@mobi/shared/utils/fetch'
import { assertReachableMpProxyOrigin, normalizeMpProxyOrigin } from './proxyOrigin'

const WECHAT_API_ORIGIN = `https://api.weixin.qq.com`

const UPLOAD_PATHNAMES = {
  uploadimg: `/cgi-bin/media/uploadimg`,
  add_material: `/cgi-bin/material/add_material`,
} as const

function describeProxyRequestError(error: unknown, proxyOrigin: string): Error {
  const origin = normalizeMpProxyOrigin(proxyOrigin)
  const status = (error as { response?: { status?: number } })?.response?.status

  if (status) {
    return new Error(`公众号代理返回 HTTP ${status}，请检查代理域名`)
  }
  if (origin) {
    return new Error(`无法连接公众号代理 ${origin}，请确认 mp-proxy 正在运行`)
  }
  return error instanceof Error ? error : new Error(String(error))
}

/**
 * 浏览器不能跨域调 api.weixin.qq.com，所以请求都得经过 mp-proxy。
 * 代理地址没填时仍然按直连拼 URL——插件和 CF Workers 环境是这么用的。
 */
export function createBrowserWechatTransport(): WechatTransport {
  return {
    kind: `browser`,

    assertConfigUsable(proxyOrigin: string) {
      assertReachableMpProxyOrigin(normalizeMpProxyOrigin(proxyOrigin))
    },

    async requestStableToken({ appID, appsecret, proxyOrigin }: StableTokenInput) {
      const origin = normalizeMpProxyOrigin(proxyOrigin) || WECHAT_API_ORIGIN

      try {
        return await fetch<any, WechatStableTokenResult>(`${origin}/cgi-bin/stable_token`, {
          method: `POST`,
          data: {
            grant_type: `client_credential`,
            appid: appID,
            secret: appsecret,
          },
        })
      }
      catch (error) {
        throw describeProxyRequestError(error, proxyOrigin)
      }
    },

    async uploadImage({ accessToken, proxyOrigin, endpoint, file }: UploadImageInput) {
      const origin = normalizeMpProxyOrigin(proxyOrigin) || WECHAT_API_ORIGIN
      const query = endpoint === `add_material`
        ? `?access_token=${accessToken}&type=image`
        : `?access_token=${accessToken}`

      const formdata = new FormData()
      formdata.append(`media`, file, file.name)

      try {
        return await fetch<any, WechatUploadImageResult>(`${origin}${UPLOAD_PATHNAMES[endpoint]}${query}`, {
          method: `POST`,
          data: formdata,
        })
      }
      catch (error) {
        throw describeProxyRequestError(error, proxyOrigin)
      }
    },

    resolveImageFetchOrigin: (proxyOrigin: string) => normalizeMpProxyOrigin(proxyOrigin),

    needsImageDisplayProxy: (proxyOrigin: string) =>
      Boolean(normalizeMpProxyOrigin(proxyOrigin)) && window.location.href.startsWith(`http`),
  }
}
