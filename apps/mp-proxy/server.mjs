import { createServer } from 'node:http'
import { fetchSafeImage, parseHttpImageUrl } from './safe-image-url.mjs'

const HOST = process.env.HOST || `0.0.0.0`
const PORT = Number(process.env.PORT || 8788)
const MAX_BODY_SIZE = Number(process.env.MAX_BODY_SIZE_MB || 32) * 1024 * 1024
const ALLOWED_PATHS = new Set([
  `/cgi-bin/stable_token`,
  `/cgi-bin/media/uploadimg`,
  `/cgi-bin/material/add_material`,
])
const IMAGE_FETCH_PATH = `/fetch-image`
const WECHAT_API_ORIGIN = `https://api.weixin.qq.com`
const DEV_ALLOWED_ORIGINS = `http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:4173,http://localhost:4173`

function defaultAllowedOrigins() {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS
  }
  // 不再默认 *。开发只放本机站点，生产必须显式配置。
  if (process.env.NODE_ENV === `production`) {
    return ``
  }
  return DEV_ALLOWED_ORIGINS
}

const allowedOrigins = new Set(
  defaultAllowedOrigins()
    .split(`,`)
    .map(item => item.trim())
    .filter(Boolean),
)

function getHeaderValue(value) {
  if (Array.isArray(value)) {
    return value[0] || ``
  }
  return value || ``
}

function resolveCorsOrigin(origin = ``) {
  if (!origin) {
    return ``
  }
  if (allowedOrigins.has(`*`) || allowedOrigins.has(origin)) {
    return origin
  }
  return ``
}

function applyCorsHeaders(res, origin = ``) {
  if (!origin) {
    return true
  }
  const allowedOrigin = resolveCorsOrigin(origin)
  if (!allowedOrigin) {
    return false
  }

  res.setHeader(`Access-Control-Allow-Origin`, allowedOrigin)
  res.setHeader(`Access-Control-Allow-Headers`, `Content-Type`)
  res.setHeader(`Access-Control-Allow-Methods`, `GET, POST, OPTIONS`)
  res.setHeader(`Access-Control-Max-Age`, `86400`)
  if (allowedOrigin !== `*`) {
    res.setHeader(`Vary`, `Origin`)
  }
  return true
}

function sendJson(res, statusCode, payload, origin = ``) {
  applyCorsHeaders(res, origin)
  const body = JSON.stringify(payload)
  res.writeHead(statusCode, {
    'Content-Type': `application/json; charset=utf-8`,
    'Cache-Control': `no-store`,
  })
  res.end(body)
}

async function readRequestBody(req) {
  const chunks = []
  let total = 0

  for await (const chunk of req) {
    total += chunk.length
    if (total > MAX_BODY_SIZE) {
      const error = new Error(`Request body too large`)
      error.statusCode = 413
      throw error
    }
    chunks.push(chunk)
  }

  return Buffer.concat(chunks)
}

function sanitizeResponseHeaders(headers) {
  const result = {}
  headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase()
    if ([`content-type`, `content-length`, `cache-control`].includes(lowerKey)) {
      result[key] = value
    }
  })
  return result
}

function ensureHttpImageUrl(rawUrl) {
  return parseHttpImageUrl(rawUrl).toString()
}

const server = createServer(async (req, res) => {
  const origin = getHeaderValue(req.headers.origin)
  const requestUrl = new URL(req.url || `/`, `http://${getHeaderValue(req.headers.host) || `localhost`}`)

  if (requestUrl.pathname === `/health`) {
    sendJson(res, 200, { ok: true, service: `mp-proxy` }, origin)
    return
  }

  if (!applyCorsHeaders(res, origin)) {
    sendJson(res, 403, { error: `Origin not allowed` }, origin)
    return
  }

  if (req.method === `OPTIONS`) {
    res.writeHead(204)
    res.end()
    return
  }

  if (requestUrl.pathname === IMAGE_FETCH_PATH) {
    if (req.method !== `GET`) {
      sendJson(res, 405, { error: `Method not allowed` }, origin)
      return
    }

    try {
      const targetImageUrl = ensureHttpImageUrl(requestUrl.searchParams.get(`url`) || ``)
      const response = await fetchSafeImage(targetImageUrl)

      if (!response.ok) {
        const error = new Error(`抓取图片失败：${response.status}`)
        error.statusCode = response.status
        throw error
      }

      const contentType = response.headers.get(`content-type`) || ``
      if (!contentType.toLowerCase().startsWith(`image/`)) {
        const error = new Error(`目标地址不是图片资源`)
        error.statusCode = 415
        throw error
      }

      const responseBuffer = Buffer.from(await response.arrayBuffer())
      if (responseBuffer.byteLength > MAX_BODY_SIZE) {
        const error = new Error(`图片过大，超过代理限制`)
        error.statusCode = 413
        throw error
      }

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': String(responseBuffer.byteLength),
        'Cache-Control': `no-store`,
      })
      res.end(responseBuffer)
      return
    }
    catch (error) {
      const statusCode = Number(error?.statusCode) || 502
      sendJson(
        res,
        statusCode,
        {
          error: error instanceof Error ? error.message : String(error),
        },
        origin,
      )
      return
    }
  }

  if (req.method !== `POST`) {
    sendJson(res, 405, { error: `Method not allowed` }, origin)
    return
  }

  if (!ALLOWED_PATHS.has(requestUrl.pathname)) {
    sendJson(res, 404, { error: `Unsupported proxy path` }, origin)
    return
  }

  try {
    const body = await readRequestBody(req)
    const targetUrl = `${WECHAT_API_ORIGIN}${requestUrl.pathname}${requestUrl.search}`
    const forwardHeaders = {}
    if (req.headers[`content-type`]) {
      forwardHeaders[`Content-Type`] = getHeaderValue(req.headers[`content-type`])
    }

    const response = await fetch(targetUrl, {
      method: `POST`,
      headers: forwardHeaders,
      body,
    })

    const responseBuffer = Buffer.from(await response.arrayBuffer())
    const responseHeaders = sanitizeResponseHeaders(response.headers)
    res.writeHead(response.status, {
      ...responseHeaders,
      'Cache-Control': `no-store`,
    })
    res.end(responseBuffer)
  }
  catch (error) {
    const statusCode = Number(error?.statusCode) || 502
    sendJson(
      res,
      statusCode,
      {
        error: error instanceof Error ? error.message : String(error),
      },
      origin,
    )
  }
})

server.listen(PORT, HOST, () => {
  console.log(`[mp-proxy] listening on http://${HOST}:${PORT}`)
  console.log(`[mp-proxy] allowed origins: ${Array.from(allowedOrigins).join(`, `) || `*`}`)
})
