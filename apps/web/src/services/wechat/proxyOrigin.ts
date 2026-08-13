export function normalizeMpProxyOrigin(proxyOrigin: string) {
  return proxyOrigin?.trim().replace(/\/+$/, ``) || ``
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
