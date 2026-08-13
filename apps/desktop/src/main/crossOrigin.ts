import { session } from 'electron'

/**
 * 有些第三方接口只当自己会被同源页面调用，响应里根本不带 CORS 头。
 * 浏览器里这种请求一律被拦，桌面版的页面跑在 mobi:// 上，情况一样。
 *
 * 这里按域名逐个补一个 Access-Control-Allow-Origin，而不是关掉 webSecurity ——
 * 后者是给整个渲染进程摘掉同源策略，为了几个图标不值当。
 *
 * 目前只有一条：AntV infographic 板块渲染时按名字去查图标，
 * 服务地址写死在依赖里（@antv/infographic 的 ICON_SERVICE_URL），改不了也代理不掉。
 */
const RELAXED_HOSTS = new Set([`www.weavefox.cn`])

const FILTER_URLS = [`https://www.weavefox.cn/*`]

function hostOf(url: string) {
  try {
    return new URL(url).hostname
  }
  catch {
    return ``
  }
}

export function installCrossOriginRelaxations(): void {
  session.defaultSession.webRequest.onHeadersReceived({ urls: FILTER_URLS }, (details, callback) => {
    if (!RELAXED_HOSTS.has(hostOf(details.url))) {
      callback({})
      return
    }

    const headers = { ...details.responseHeaders }
    // 大小写不固定，逐个比对，已经带了就别再加一个，两个同名头浏览器会判非法
    const existing = Object.keys(headers).find(key => key.toLowerCase() === `access-control-allow-origin`)

    if (!existing) {
      headers[`Access-Control-Allow-Origin`] = [`*`]
    }

    callback({ responseHeaders: headers })
  })
}
