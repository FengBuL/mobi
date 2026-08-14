import { normalizeMpProxyOrigin, selectMpProxyOrigin } from '@/services/wechat/proxyOrigin'

interface WritableRef<T> {
  value: T
}

export function prepareMpProxySubmission<T extends { proxyOrigin?: string }>(
  formValues: T,
  options: { requiresProxy: boolean, officialOrigin: string },
) {
  const configuredOrigin = normalizeMpProxyOrigin(formValues.proxyOrigin || ``)
  return {
    requestOrigin: selectMpProxyOrigin(configuredOrigin, options),
    storedValues: {
      ...formValues,
      proxyOrigin: configuredOrigin,
    },
  }
}

export function sanitizeStoredMpProxyOrigin(
  configuredOrigin: string | undefined,
  internalOrigins: string[],
) {
  const normalizedOrigin = normalizeMpProxyOrigin(configuredOrigin || ``)
  const isInternalOrigin = internalOrigins.some(origin =>
    normalizeMpProxyOrigin(origin) === normalizedOrigin,
  )
  return isInternalOrigin ? `` : normalizedOrigin
}

interface ProxyHealthResult {
  ok: boolean
  status: number
  data: unknown
}

interface ValidateMpProxyOptions {
  requiresProxy: boolean
  proxyOrigin: string
  requestHealth?: (url: string) => Promise<ProxyHealthResult>
}

async function requestProxyHealth(url: string): Promise<ProxyHealthResult> {
  const response = await fetch(url)
  let data: unknown = null

  try {
    data = await response.json()
  }
  catch {
    // 非 JSON 响应会在下面按服务标识不匹配处理
  }

  return { ok: response.ok, status: response.status, data }
}

export async function validateMpProxyBeforeSave({
  requiresProxy,
  proxyOrigin,
  requestHealth = requestProxyHealth,
}: ValidateMpProxyOptions) {
  if (!requiresProxy) {
    return
  }

  const origin = proxyOrigin.trim().replace(/\/+$/, ``)
  let result: ProxyHealthResult

  try {
    result = await requestHealth(`${origin}/health`)
  }
  catch {
    throw new Error(`无法连接公众号代理 ${origin}，请先启动 mp-proxy`)
  }

  if (!result.ok) {
    throw new Error(`代理地址返回 HTTP ${result.status}，请检查是否填写了 mp-proxy 地址`)
  }

  const data = result.data as { ok?: boolean, service?: string } | null
  if (!data?.ok || data.service !== `mp-proxy`) {
    throw new Error(`代理地址未指向墨笔 mp-proxy，请检查配置`)
  }
}

export function saveAndSelectImageHost<T extends object>(
  host: string,
  config: WritableRef<T>,
  activeHost: WritableRef<string>,
  formValues: Partial<T>,
) {
  Object.assign(config.value, formValues)
  activeHost.value = host
}
