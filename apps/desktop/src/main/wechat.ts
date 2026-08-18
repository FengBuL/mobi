import type {
  WechatStableTokenRequest,
  WechatStableTokenResult,
  WechatUploadEndpoint,
  WechatUploadImageRequest,
  WechatUploadImageResult,
} from '@mobi/shared/types/desktop'
// @ts-expect-error mp-proxy 的 URL 校验是独立 ESM，与 /fetch-image 共用同一套实现。
import { fetchSafeImage, parseHttpImageUrl } from '../../../mp-proxy/safe-image-url.mjs'

/**
 * 主进程版的微信接口转发，对应 apps/mp-proxy/server.mjs 的四条路径。
 * 桌面版不起那个 HTTP 服务：主进程本身就是 Node，浏览器的同源策略也管不到它。
 */

const WECHAT_API_ORIGIN = `https://api.weixin.qq.com`

/** 和 mp-proxy 的 MAX_BODY_SIZE 默认值对齐 */
const MAX_BODY_BYTES = 32 * 1024 * 1024

const UPLOAD_PATHNAMES: Record<WechatUploadEndpoint, string> = {
  uploadimg: `/cgi-bin/media/uploadimg`,
  add_material: `/cgi-bin/material/add_material`,
}

export interface RemoteImage {
  bytes: Uint8Array<ArrayBuffer>
  contentType: string
}

class TransferError extends Error {
  constructor(message: string) {
    super(message)
    this.name = `TransferError`
  }
}

/** 微信偶尔用 text/plain 回 JSON，所以先读文本再解析，解析不动时把原文截一段带出去 */
async function readJsonBody<T>(response: Response): Promise<T> {
  const text = await response.text()

  try {
    return JSON.parse(text) as T
  }
  catch {
    throw new TransferError(
      `微信接口返回了非 JSON 内容（HTTP ${response.status}）：${text.slice(0, 200)}`,
    )
  }
}

function assertNonEmpty(value: unknown, label: string): string {
  if (typeof value !== `string` || !value.trim()) {
    throw new TransferError(`${label}不能为空`)
  }
  return value.trim()
}

export function parseStableTokenRequest(payload: unknown): WechatStableTokenRequest {
  const input = (payload ?? {}) as Partial<WechatStableTokenRequest>
  return {
    appID: assertNonEmpty(input.appID, `AppID`),
    appsecret: assertNonEmpty(input.appsecret, `AppSecret`),
  }
}

export function parseUploadImageRequest(payload: unknown): WechatUploadImageRequest {
  const input = (payload ?? {}) as Partial<WechatUploadImageRequest>
  const endpoint = input.endpoint as WechatUploadEndpoint

  if (!Object.hasOwn(UPLOAD_PATHNAMES, endpoint)) {
    throw new TransferError(`不支持的上传接口：${String(input.endpoint)}`)
  }

  const bytes = input.bytes
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
    throw new TransferError(`图片内容为空`)
  }
  if (bytes.byteLength > MAX_BODY_BYTES) {
    throw new TransferError(`图片过大，超过 ${MAX_BODY_BYTES / 1024 / 1024}MB 限制`)
  }

  return {
    accessToken: assertNonEmpty(input.accessToken, `access_token`),
    endpoint,
    filename: typeof input.filename === `string` && input.filename ? input.filename : `image`,
    contentType: typeof input.contentType === `string` && input.contentType
      ? input.contentType
      : `application/octet-stream`,
    bytes,
  }
}

export async function requestStableToken(
  request: WechatStableTokenRequest,
): Promise<WechatStableTokenResult> {
  const response = await fetch(`${WECHAT_API_ORIGIN}/cgi-bin/stable_token`, {
    method: `POST`,
    headers: { 'Content-Type': `application/json` },
    body: JSON.stringify({
      grant_type: `client_credential`,
      appid: request.appID,
      secret: request.appsecret,
    }),
  })

  return readJsonBody<WechatStableTokenResult>(response)
}

export async function uploadImage(
  request: WechatUploadImageRequest,
): Promise<WechatUploadImageResult> {
  const url = new URL(`${WECHAT_API_ORIGIN}${UPLOAD_PATHNAMES[request.endpoint]}`)
  url.searchParams.set(`access_token`, request.accessToken)
  if (request.endpoint === `add_material`) {
    url.searchParams.set(`type`, `image`)
  }

  // 微信按 multipart 里的 filename 后缀判断素材类型，名字丢了会被判成非法素材
  const form = new FormData()
  form.append(`media`, new File([request.bytes], request.filename, { type: request.contentType }))

  const response = await fetch(url, { method: `POST`, body: form })

  return readJsonBody<WechatUploadImageResult>(response)
}

function ensureHttpImageUrl(rawUrl: string): string {
  try {
    return parseHttpImageUrl(rawUrl).toString()
  }
  catch (error) {
    throw new TransferError(error instanceof Error ? error.message : String(error))
  }
}

/** 复制链路遇到跨域拿不到的外链图时回源用，等价于 mp-proxy 的 /fetch-image */
export async function fetchRemoteImage(rawUrl: string): Promise<RemoteImage> {
  ensureHttpImageUrl(rawUrl)

  let response: Response
  try {
    response = await fetchSafeImage(rawUrl)
  }
  catch (error) {
    throw new TransferError(error instanceof Error ? error.message : String(error))
  }

  if (!response.ok) {
    throw new TransferError(`抓取图片失败：${response.status}`)
  }

  const contentType = response.headers.get(`content-type`) || ``
  if (!contentType.toLowerCase().startsWith(`image/`)) {
    throw new TransferError(`目标地址不是图片资源`)
  }

  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.byteLength > MAX_BODY_BYTES) {
    throw new TransferError(`图片过大，超过代理限制`)
  }

  return { bytes, contentType }
}

export function describeTransferError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}
