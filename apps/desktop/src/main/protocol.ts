import { existsSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { net, protocol } from 'electron'
import { APP_HOST, APP_SCHEME, IMAGE_FETCH_PATHNAME } from '../shared/scheme'
import { rendererDir } from './env'
import { describeTransferError, fetchRemoteImage } from './wechat'

const MIME_TYPES: Record<string, string> = {
  '.css': `text/css; charset=utf-8`,
  '.html': `text/html; charset=utf-8`,
  '.js': `text/javascript; charset=utf-8`,
  '.json': `application/json; charset=utf-8`,
  '.mjs': `text/javascript; charset=utf-8`,
  '.svg': `image/svg+xml`,
}

/**
 * 必须在 app ready 之前调用。standard 让它有正经的源，secure 让 isSecureContext 为 true
 * （剪贴板 API 认这个），corsEnabled 是为了开发模式下 Vite 页面能跨源取到 /fetch-image。
 */
export function registerAppScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: APP_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ])
}

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': `application/json; charset=utf-8`,
      'Cache-Control': `no-store`,
      'Access-Control-Allow-Origin': `*`,
    },
  })
}

async function serveRemoteImage(url: URL): Promise<Response> {
  try {
    const { bytes, contentType } = await fetchRemoteImage(url.searchParams.get(`url`) || ``)
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': `no-store`,
        'Access-Control-Allow-Origin': `*`,
      },
    })
  }
  catch (error) {
    // 复制链路会把 body 里的 error 字段读出来当提示，形状要和 mp-proxy 一致
    return jsonResponse(502, { error: describeTransferError(error) })
  }
}

function resolveRendererFile(pathname: string): string | null {
  const relativePath = decodeURIComponent(pathname).replace(/^\/+/, ``) || `index.html`
  const resolved = path.resolve(rendererDir, relativePath)

  // 打包后 dist/renderer 之外的文件不该被页面读到
  if (resolved !== rendererDir && !resolved.startsWith(rendererDir + path.sep)) {
    return null
  }

  return existsSync(resolved) ? resolved : null
}

async function serveRendererAsset(url: URL): Promise<Response> {
  const file = resolveRendererFile(url.pathname)
  if (!file) {
    return new Response(`Not found`, { status: 404 })
  }

  const response = await net.fetch(pathToFileURL(file).toString())
  const mimeType = MIME_TYPES[path.extname(file).toLowerCase()]
  if (!mimeType) {
    return response
  }

  const headers = new Headers(response.headers)
  headers.set(`Content-Type`, mimeType)
  return new Response(response.body, { status: response.status, headers })
}

export function handleAppProtocol(): void {
  protocol.handle(APP_SCHEME, async (request) => {
    const url = new URL(request.url)

    if (url.host !== APP_HOST) {
      return new Response(`Not found`, { status: 404 })
    }

    if (url.pathname === IMAGE_FETCH_PATHNAME) {
      return serveRemoteImage(url)
    }

    return serveRendererAsset(url)
  })
}
