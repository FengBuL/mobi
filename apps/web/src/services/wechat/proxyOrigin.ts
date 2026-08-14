export function normalizeMpProxyOrigin(proxyOrigin: string) {
  return proxyOrigin?.trim().replace(/\/+$/, ``) || ``
}

export const OFFICIAL_MP_PROXY_ORIGIN = `https://api.mobieditor.cn`
export const DEFAULT_MP_PROXY_ORIGIN = normalizeMpProxyOrigin(import.meta.env.VITE_MP_PROXY_ORIGIN || ``)
  || (import.meta.env.DEV ? `http://127.0.0.1:8788` : OFFICIAL_MP_PROXY_ORIGIN)

export function selectMpProxyOrigin(
  configuredOrigin: string,
  options: { requiresProxy: boolean, officialOrigin: string },
) {
  if (!options.requiresProxy) {
    return normalizeMpProxyOrigin(configuredOrigin)
  }
  return normalizeMpProxyOrigin(configuredOrigin)
    || normalizeMpProxyOrigin(options.officialOrigin)
}

function isLoopbackHost(hostname: string) {
  return [`127.0.0.1`, `localhost`, `::1`].includes(hostname.toLowerCase())
}

export function assertReachableMpProxyOrigin(proxyOrigin: string) {
  if (!proxyOrigin || !window.location.href.startsWith(`http`)) {
    return
  }

  const pageHostname = window.location.hostname.toLowerCase()
  const proxyHostname = new URL(proxyOrigin).hostname.toLowerCase()
  if (!isLoopbackHost(pageHostname) && isLoopbackHost(proxyHostname)) {
    throw new Error(`当前不是在本机浏览器访问，代理域名不能填 localhost / 127.0.0.1，请改成电脑局域网 IP`)
  }
}
