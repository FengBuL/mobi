/**
 * 墨笔匿名使用统计收集端（Cloudflare Worker + D1）。
 *
 * 端点：
 *   POST /ingest        客户端批量上报，body 为 text/plain 的 JSON（避开 CORS 预检）
 *   GET  /stats?key=xx  聚合查询，key 必须等于环境变量 ADMIN_KEY，可选 days（默认 30）
 *   GET  /health        探活
 *
 * 数据里没有任何文章内容和身份信息：anonId 是客户端随机生成的 UUID。
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': `*`,
  'Access-Control-Allow-Methods': `POST, GET, OPTIONS`,
  'Access-Control-Allow-Headers': `content-type`,
}

const MAX_EVENTS_PER_BATCH = 50
const MAX_STRING_LENGTH = 120

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': `application/json; charset=utf-8`, ...CORS_HEADERS },
  })
}

function clip(value) {
  return String(value ?? ``).slice(0, MAX_STRING_LENGTH)
}

async function handleIngest(request, env) {
  let payload
  try {
    payload = JSON.parse(await request.text())
  }
  catch {
    return json({ error: `invalid json` }, 400)
  }

  const events = Array.isArray(payload?.events) ? payload.events.slice(0, MAX_EVENTS_PER_BATCH) : []
  if (!events.length) {
    return json({ error: `no events` }, 400)
  }

  const anonId = clip(payload.anonId)
  const sessionId = clip(payload.sessionId)
  const platform = clip(payload.platform)
  const version = clip(payload.version)

  const stmt = env.DB.prepare(
    `INSERT INTO events (ts, anon_id, session_id, platform, version, event, props) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )

  const batch = events
    .filter(item => item && typeof item.event === `string`)
    .map((item) => {
      const ts = Number.isFinite(item.ts) ? Math.round(item.ts) : Date.now()
      const props = item.props && typeof item.props === `object` ? JSON.stringify(item.props).slice(0, 500) : `{}`
      return stmt.bind(ts, anonId, sessionId, platform, version, clip(item.event), props)
    })

  if (!batch.length) {
    return json({ error: `no valid events` }, 400)
  }

  await env.DB.batch(batch)
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

async function handleStats(request, env) {
  const url = new URL(request.url)

  if (!env.ADMIN_KEY || url.searchParams.get(`key`) !== env.ADMIN_KEY) {
    return json({ error: `unauthorized` }, 401)
  }

  const days = Math.min(365, Math.max(1, Number(url.searchParams.get(`days`)) || 30))
  const since = Date.now() - days * 24 * 60 * 60 * 1000

  const [byEvent, byDetail, activeUsers, byPlatform] = await Promise.all([
    env.DB.prepare(`SELECT event, COUNT(*) AS count FROM events WHERE ts >= ? GROUP BY event ORDER BY count DESC`)
      .bind(since)
      .all(),
    env.DB.prepare(`SELECT event, props, COUNT(*) AS count FROM events WHERE ts >= ? GROUP BY event, props ORDER BY count DESC LIMIT 200`)
      .bind(since)
      .all(),
    env.DB.prepare(`SELECT COUNT(DISTINCT anon_id) AS users FROM events WHERE ts >= ?`)
      .bind(since)
      .all(),
    env.DB.prepare(`SELECT platform, COUNT(DISTINCT anon_id) AS users, COUNT(*) AS events FROM events WHERE ts >= ? GROUP BY platform`)
      .bind(since)
      .all(),
  ])

  return json({
    days,
    activeUsers: activeUsers.results?.[0]?.users ?? 0,
    byPlatform: byPlatform.results ?? [],
    byEvent: byEvent.results ?? [],
    topDetails: byDetail.results ?? [],
  })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === `OPTIONS`) {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    if (request.method === `POST` && url.pathname === `/ingest`) {
      return handleIngest(request, env)
    }

    if (request.method === `GET` && url.pathname === `/stats`) {
      return handleStats(request, env)
    }

    if (request.method === `GET` && url.pathname === `/health`) {
      return json({ ok: true })
    }

    return json({ error: `not found` }, 404)
  },
}
