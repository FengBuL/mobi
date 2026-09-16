/**
 * 墨笔匿名使用统计收集端（Cloudflare Worker + D1）。
 *
 * 端点：
 *   POST /ingest        客户端批量上报，body 为 text/plain 的 JSON（避开 CORS 预检）
 *   POST /feedback      应用内反馈，body 为 text/plain 的 JSON；落 D1，再按配置转发 GitHub Issue / 飞书群机器人
 *   POST /feedback/:id/status  看板标反馈处理状态（open / done / ignored），需管理密钥
 *   GET  /stats         聚合查询，Authorization: Bearer <管理密钥>（旧的 ?key= 仍兼容）
 *                       周期：days（默认 30）或 from/to（YYYY-MM-DD）；筛选：platform / version / viewport / mode
 *                       返回含上一周期同口径数据（previous），供环比
 *   GET  /dashboard     可视化看板
 *   GET  /health        探活
 *
 * 数据里没有任何文章内容和身份信息：anonId 是客户端随机生成的 UUID。
 * 反馈是用户主动写的文字，原样保存；联系方式选填。
 */

import { dashboardResponse } from './dashboard.js'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': `*`,
  'Access-Control-Allow-Methods': `POST, GET, OPTIONS`,
  'Access-Control-Allow-Headers': `content-type`,
}

const MAX_EVENTS_PER_BATCH = 50
const MAX_STRING_LENGTH = 120
const MAX_PROPS_LENGTH = 500

/** 看板上按固定顺序补零展示的事件 */
export const TRACKED_EVENTS = [
  `app_open`,
  `content_edit`,
  `session_end`,
  `copy`,
  `theme_change`,
  `block_select`,
  `block_apply`,
  `image_layout_apply`,
  `style_adjust`,
  `style_token_adjust`,
  `style_tab_open`,
  `style_preset_apply`,
  `panel_open`,
  `workspace_mode`,
  `export`,
  `mp_config_saved`,
  `copy_verdict`,
  `feedback_submit`,
  `error`,
]

/** 漏斗：打开 → 改过正文 → 换主题 → 点选 → 复制。「改过正文」把只看示例稿的看客和贴了自己稿子的写手分开 */
export const FUNNEL_STEPS = [`app_open`, `content_edit`, `theme_change`, `block_select`, `copy`]

/** 会话时长分桶，与客户端 bucketSeconds 同步，看板按此顺序补零 */
export const SESSION_SECONDS_BUCKETS = [`<30`, `30-120`, `120-600`, `600-1800`, `1800+`]

/** 反馈类型 → GitHub 标签 */
/** 「哪里不对」标签；与客户端 FEEDBACK_TYPES 同步 */
export const FEEDBACK_TYPES = {
  paste: `贴进去不一样`,
  image: `图丢了`,
  copy_fail: `复制失败`,
  theme: `主题不对`,
  block: `板块不对`,
  style_panel: `样式面板难用`,
  suggestion: `想要新功能`,
  other: `其他`,
}

const FEEDBACK_LIMITS = {
  message: 4000,
  /** 没勾标签时正文最少几个字 */
  messageMinWithoutType: 10,
  contact: 200,
  perIpPerHour: 5,
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': `application/json; charset=utf-8`, ...CORS_HEADERS },
  })
}

function clip(value, max = MAX_STRING_LENGTH) {
  return String(value ?? ``).slice(0, max)
}

function completeEventCounts(rows) {
  const counts = new Map(rows.map(row => [row.event, Number(row.count) || 0]))
  const known = TRACKED_EVENTS.map(event => ({ event, count: counts.get(event) ?? 0 }))
  const extra = rows
    .filter(row => !TRACKED_EVENTS.includes(row.event))
    .map(row => ({ event: row.event, count: Number(row.count) || 0 }))
  return [...known, ...extra].sort((a, b) => b.count - a.count)
}

async function readJsonBody(request) {
  try {
    return JSON.parse(await request.text())
  }
  catch {
    return null
  }
}

async function handleIngest(request, env) {
  const payload = await readJsonBody(request)
  if (!payload) {
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
      const props = item.props && typeof item.props === `object` ? JSON.stringify(item.props).slice(0, MAX_PROPS_LENGTH) : `{}`
      return stmt.bind(ts, anonId, sessionId, platform, version, clip(item.event), props)
    })

  if (!batch.length) {
    return json({ error: `no valid events` }, 400)
  }

  await env.DB.batch(batch)
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

/**
 * 校验反馈请求体。返回 { ok, error } 或 { ok, record }。
 * 纯函数，便于测试。
 */
export function validateFeedback(payload) {
  if (!payload || typeof payload !== `object`) {
    return { ok: false, error: `invalid json` }
  }

  // 新客户端发 types 数组；老客户端发单个 type，兼容
  const rawTypes = Array.isArray(payload.types) ? payload.types : (typeof payload.type === `string` ? [payload.type] : [])
  const types = [...new Set(rawTypes.filter(item => typeof item === `string` && item in FEEDBACK_TYPES))]
  if (rawTypes.length && !types.length) {
    return { ok: false, error: `unknown type` }
  }

  const message = typeof payload.message === `string` ? payload.message.trim() : ``
  if (!types.length && message.length < FEEDBACK_LIMITS.messageMinWithoutType) {
    return { ok: false, error: message.length ? `message too short` : `empty` }
  }
  if (message.length > FEEDBACK_LIMITS.message) {
    return { ok: false, error: `message too long` }
  }

  // 蜜罐字段：正常界面不会填，机器人会
  if (typeof payload.website === `string` && payload.website.trim()) {
    return { ok: false, error: `rejected` }
  }

  const contact = clip(typeof payload.contact === `string` ? payload.contact.trim() : ``, FEEDBACK_LIMITS.contact)
  const context = payload.context && typeof payload.context === `object` ? payload.context : {}
  const safeContext = {}
  for (const key of [`version`, `platform`, `theme`, `viewport`, `mode`, `browser`, `os`, `imgHost`, `source`]) {
    if (context[key] !== undefined && context[key] !== null && context[key] !== ``) {
      safeContext[key] = clip(context[key])
    }
  }

  return {
    ok: true,
    record: {
      types,
      // D1 的 type 列存逗号串，看板按 includes 过滤
      type: types.join(`,`),
      message,
      contact,
      anonId: clip(payload.anonId),
      context: safeContext,
    },
  }
}

/** 记录上的标签中文名；没标签算「其他」 */
export function feedbackLabels(record) {
  const types = Array.isArray(record.types) ? record.types : String(record.type || ``).split(`,`).filter(Boolean)
  const labels = types.map(type => FEEDBACK_TYPES[type]).filter(Boolean)
  return labels.length ? labels : [FEEDBACK_TYPES.other]
}

/** 拼 GitHub Issue 的标题和正文。纯函数，便于测试 */
export function buildGithubIssue(record) {
  const labels = feedbackLabels(record)
  const firstLine = record.message.split(/\r?\n/u).find(line => line.trim()) || ``
  const summary = firstLine ? `${firstLine.slice(0, 60)}${firstLine.length > 60 ? `…` : ``}` : `（只勾了标签）`
  const title = `[${labels.join(` · `)}] ${summary}`

  const contextLines = Object.entries(record.context).map(([key, value]) => `- ${key}: ${value}`)
  const body = [
    `> 来自应用内反馈`,
    ``,
    `标签：${labels.join(`、`)}`,
    ``,
    record.message,
    ``,
    contextLines.length ? `## 环境` : ``,
    ...contextLines,
    record.contact ? `\n联系方式：${record.contact}` : ``,
  ].filter((line, index, all) => line !== `` || (index > 0 && all[index - 1] !== ``)).join(`\n`)

  return { title, body, labels: [`feedback`, ...labels] }
}

async function createGithubIssue(env, record) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return null
  }

  const issue = buildGithubIssue(record)
  const response = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/issues`, {
    method: `POST`,
    headers: {
      'authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'accept': `application/vnd.github+json`,
      'content-type': `application/json`,
      'user-agent': `mobi-feedback-worker`,
    },
    body: JSON.stringify(issue),
  })

  if (!response.ok) {
    throw new Error(`github ${response.status}`)
  }

  const data = await response.json()
  return typeof data?.html_url === `string` ? data.html_url : null
}

/** 飞书群自定义机器人 webhook。文本消息，不依赖卡片模板 */
async function notifyFeishu(env, record, issueUrl) {
  if (!env.FEISHU_WEBHOOK) {
    return
  }

  const context = Object.entries(record.context).map(([key, value]) => `${key}=${value}`).join(`  `)
  const text = [
    `【墨笔反馈 · ${feedbackLabels(record).join(` · `)}】`,
    record.message || `（只勾了标签）`,
    context ? `环境：${context}` : ``,
    record.contact ? `联系：${record.contact}` : ``,
    issueUrl ? `Issue：${issueUrl}` : ``,
  ].filter(Boolean).join(`\n`)

  const response = await fetch(env.FEISHU_WEBHOOK, {
    method: `POST`,
    headers: { 'content-type': `application/json` },
    body: JSON.stringify({ msg_type: `text`, content: { text } }),
  })

  if (!response.ok) {
    throw new Error(`feishu ${response.status}`)
  }
}

async function hashIp(ip) {
  const digest = await crypto.subtle.digest(`SHA-256`, new TextEncoder().encode(`mobi-feedback:${ip}`))
  return Array.from(new Uint8Array(digest)).slice(0, 8).map(byte => byte.toString(16).padStart(2, `0`)).join(``)
}

async function handleFeedback(request, env, ctx) {
  const payload = await readJsonBody(request)
  const checked = validateFeedback(payload)
  if (!checked.ok) {
    return json({ error: checked.error }, checked.error === `rejected` ? 403 : 400)
  }

  const ipHash = await hashIp(request.headers.get(`cf-connecting-ip`) || `unknown`)
  const now = Date.now()
  const hourAgo = now - 60 * 60 * 1000

  const recent = await env.DB.prepare(`SELECT COUNT(*) AS count FROM feedback WHERE ip_hash = ? AND ts >= ?`)
    .bind(ipHash, hourAgo)
    .all()
  if (Number(recent.results?.[0]?.count || 0) >= FEEDBACK_LIMITS.perIpPerHour) {
    return json({ error: `too many` }, 429)
  }

  const { record } = checked
  const inserted = await env.DB.prepare(
    `INSERT INTO feedback (ts, type, message, contact, anon_id, ip_hash, context) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(now, record.type, record.message, record.contact, record.anonId, ipHash, JSON.stringify(record.context))
    .run()
  const rowId = inserted.meta?.last_row_id ?? null

  let issueUrl = null
  let issueError = ``
  try {
    issueUrl = await createGithubIssue(env, record)
    if (issueUrl && rowId) {
      await env.DB.prepare(`UPDATE feedback SET issue_url = ? WHERE id = ?`).bind(issueUrl, rowId).run()
    }
  }
  catch (error) {
    issueError = error instanceof Error ? error.message : String(error)
  }

  // 飞书通知失败不影响用户侧结果
  const feishu = notifyFeishu(env, record, issueUrl).catch(() => {})
  if (ctx?.waitUntil) {
    ctx.waitUntil(feishu)
  }
  else {
    await feishu
  }

  return json({
    ok: true,
    issueUrl,
    forwarded: Boolean(issueUrl),
    error: issueError || undefined,
  })
}

function isAuthorized(request, env) {
  const url = new URL(request.url)
  const authorization = request.headers.get(`authorization`) ?? ``
  const bearerKey = authorization.startsWith(`Bearer `) ? authorization.slice(7) : ``
  const queryKey = url.searchParams.get(`key`) ?? ``
  const adminKey = env.ADMIN_KEY_SECRET ?? env.ADMIN_KEY
  return Boolean(adminKey) && (bearerKey === adminKey || queryKey === adminKey)
}

const DAY_MS = 24 * 60 * 60 * 1000

/** 趋势图可勾选的系列 */
const TREND_EVENTS = [`app_open`, `content_edit`, `copy`, `theme_change`, `block_select`, `style_adjust`, `feedback_submit`, `error`]

/** 反馈处理状态 */
export const FEEDBACK_STATUSES = [`open`, `done`, `ignored`]

function parseDay(value) {
  if (typeof value !== `string` || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    return null
  }
  const ts = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(ts) ? ts : null
}

/**
 * 解析 /stats 的查询参数。
 * 周期：from/to（YYYY-MM-DD，含 to 当天）优先，否则 days（默认 30）。
 * 筛选：platform / version 是列；viewport / mode 只在 app_open 的 props 里，
 * 按「周期内有一次 app_open 满足条件的设备」圈人。
 * 纯函数，便于测试。
 */
export function parseStatsParams(searchParams, now = Date.now()) {
  const days = Math.min(365, Math.max(1, Number(searchParams.get(`days`)) || 30))
  const from = parseDay(searchParams.get(`from`))
  const to = parseDay(searchParams.get(`to`))

  let since
  let until
  if (from !== null) {
    since = from
    until = Math.min(now, (to !== null && to >= from ? to : from) + DAY_MS)
  }
  else {
    until = now
    since = now - days * DAY_MS
  }
  const span = Math.max(DAY_MS, until - since)

  const pick = (key, max = 60) => {
    const raw = searchParams.get(key)
    return typeof raw === `string` && raw.trim() && raw !== `all` ? raw.trim().slice(0, max) : ``
  }

  return {
    since,
    until,
    span,
    days: Math.max(1, Math.round(span / DAY_MS)),
    platform: pick(`platform`),
    version: pick(`version`),
    viewport: pick(`viewport`),
    mode: pick(`mode`),
  }
}

/**
 * 把筛选条件编译成 WHERE 片段 + 绑定值。
 * 片段里只出现无前缀列名，在 JOIN 里请用子查询包住。
 */
export function buildScope(params, range = { since: params.since, until: params.until }) {
  const where = [`ts >= ?`, `ts < ?`]
  const binds = [range.since, range.until]

  if (params.platform) {
    where.push(`platform = ?`)
    binds.push(params.platform)
  }
  if (params.version) {
    where.push(`version = ?`)
    binds.push(params.version)
  }

  const openConditions = []
  const openBinds = []
  if (params.viewport) {
    openConditions.push(`json_extract(props, '$.viewport') = ?`)
    openBinds.push(params.viewport)
  }
  if (params.mode) {
    openConditions.push(`json_extract(props, '$.mode') = ?`)
    openBinds.push(params.mode)
  }
  if (openConditions.length) {
    where.push(`anon_id IN (SELECT anon_id FROM events WHERE event = 'app_open' AND ts >= ? AND ts < ? AND ${openConditions.join(` AND `)})`)
    binds.push(range.since, range.until, ...openBinds)
  }

  return { where: where.join(` AND `), binds }
}

/**
 * 把带 {scope} 占位的 SQL 编译成可执行语句。
 * {scope} 可出现多次；其余 ? 按出现顺序从 extras 取。
 */
export function compileScoped(sql, scope, extras = []) {
  const segments = sql.split(`{scope}`)
  const binds = []
  let cursor = 0
  const text = segments.map((segment, index) => {
    const marks = (segment.match(/\?/gu) || []).length
    binds.push(...extras.slice(cursor, cursor + marks))
    cursor += marks
    if (index < segments.length - 1) {
      binds.push(...scope.binds)
    }
    return segment
  }).join(scope.where)
  return { sql: text, binds }
}

const FUNNEL_IN = FUNNEL_STEPS.map(() => `?`).join(`,`)
const TREND_IN = TREND_EVENTS.map(() => `?`).join(`,`)

/** 一个周期的核心指标，环比时也对上一周期跑一遍 */
async function queryCore(q, scope) {
  const [byEvent, activeUsers, byPlatform, funnelRows, newUsers, returningUsers, byDay] = await Promise.all([
    q(`SELECT event, COUNT(*) AS count FROM events WHERE {scope} GROUP BY event ORDER BY count DESC`, scope),
    q(`SELECT COUNT(DISTINCT anon_id) AS users FROM events WHERE {scope}`, scope),
    q(`SELECT platform, COUNT(DISTINCT anon_id) AS users, COUNT(*) AS events FROM events WHERE {scope} GROUP BY platform`, scope),
    q(`SELECT event, COUNT(DISTINCT anon_id) AS users FROM events WHERE {scope} AND event IN (${FUNNEL_IN}) GROUP BY event`, scope, FUNNEL_STEPS),
    // 新增：全表首次出现落在周期内、且在筛选范围里的设备
    q(`SELECT COUNT(*) AS users FROM (SELECT anon_id, MIN(ts) AS first_ts FROM events GROUP BY anon_id) WHERE first_ts >= ? AND first_ts < ? AND anon_id IN (SELECT anon_id FROM events WHERE {scope})`, scope, [scope.binds[0], scope.binds[1]]),
    // 回访：周期内活跃天数 ≥ 2 的设备
    q(`SELECT COUNT(*) AS users FROM (SELECT anon_id, COUNT(DISTINCT strftime('%Y-%m-%d', ts / 1000, 'unixepoch')) AS days FROM events WHERE {scope} GROUP BY anon_id) WHERE days >= 2`, scope),
    q(`SELECT strftime('%Y-%m-%d', ts / 1000, 'unixepoch') AS day, COUNT(DISTINCT anon_id) AS users, COUNT(*) AS events FROM events WHERE {scope} GROUP BY day ORDER BY day ASC`, scope),
  ])

  const funnelMap = new Map(funnelRows.map(row => [row.event, Number(row.users) || 0]))
  return {
    activeUsers: activeUsers[0]?.users ?? 0,
    newUsers: newUsers[0]?.users ?? 0,
    returningUsers: returningUsers[0]?.users ?? 0,
    byEvent: completeEventCounts(byEvent),
    byPlatform,
    byDay,
    funnel: FUNNEL_STEPS.map(event => ({ event, users: funnelMap.get(event) ?? 0 })),
  }
}

async function handleStats(request, env) {
  if (!isAuthorized(request, env)) {
    return json({ error: `unauthorized` }, 401)
  }

  const url = new URL(request.url)
  const params = parseStatsParams(url.searchParams)
  const scope = buildScope(params)
  const previousScope = buildScope(params, { since: params.since - params.span, until: params.since })
  const rangeOnly = buildScope({ since: params.since, until: params.until })

  const q = (sql, scopeArg, extras = []) => {
    const compiled = compileScoped(sql, scopeArg, extras)
    return env.DB.prepare(compiled.sql).bind(...compiled.binds).all().then(result => result.results ?? [])
  }

  const [
    core,
    previous,
    byDetail,
    byVersion,
    byDayEvent,
    previousByDayEvent,
    byViewport,
    byTheme,
    byBlock,
    byStyleControl,
    byStyleTab,
    byTokenGroup,
    byPanel,
    byError,
    copyContext,
    copyVerdict,
    funnelByPlatform,
    funnelByViewport,
    retention,
    feedbackRecent,
    feedbackByStatus,
    filterVersions,
    filterViewports,
    filterModes,
    audienceRows,
    editKinds,
    sessionSeconds,
  ] = await Promise.all([
    queryCore(q, scope),
    queryCore(q, previousScope),
    q(`SELECT event, props, COUNT(*) AS count FROM events WHERE {scope} GROUP BY event, props ORDER BY count DESC LIMIT 200`, scope),
    q(`SELECT version, COUNT(DISTINCT anon_id) AS users, COUNT(*) AS events FROM events WHERE {scope} GROUP BY version ORDER BY events DESC`, scope),
    // 趋势多系列：按天 × 事件
    q(`SELECT strftime('%Y-%m-%d', ts / 1000, 'unixepoch') AS day, event, COUNT(*) AS count, COUNT(DISTINCT anon_id) AS users FROM events WHERE {scope} AND event IN (${TREND_IN}) GROUP BY day, event ORDER BY day ASC`, scope, TREND_EVENTS),
    q(`SELECT strftime('%Y-%m-%d', ts / 1000, 'unixepoch') AS day, event, COUNT(*) AS count, COUNT(DISTINCT anon_id) AS users FROM events WHERE {scope} AND event IN (${TREND_IN}) GROUP BY day, event ORDER BY day ASC`, previousScope, TREND_EVENTS),
    q(`SELECT json_extract(props, '$.viewport') AS viewport, COUNT(DISTINCT anon_id) AS users, COUNT(*) AS opens FROM events WHERE {scope} AND event = 'app_open' GROUP BY viewport ORDER BY users DESC`, scope),
    q(`SELECT json_extract(props, '$.theme') AS theme, COUNT(DISTINCT anon_id) AS users, COUNT(*) AS count FROM events WHERE {scope} AND event = 'theme_change' GROUP BY theme ORDER BY count DESC LIMIT 30`, scope),
    q(`SELECT json_extract(props, '$.preset') AS preset, json_extract(props, '$.category') AS category, COUNT(DISTINCT anon_id) AS users, COUNT(*) AS count FROM events WHERE {scope} AND event = 'block_apply' GROUP BY preset, category ORDER BY count DESC LIMIT 40`, scope),
    // 全局样式：哪个控件被谁动过。users 比 count 更能说明「有没有人用」
    q(`SELECT json_extract(props, '$.control') AS control, json_extract(props, '$.surface') AS surface, COUNT(DISTINCT anon_id) AS users, COUNT(*) AS count FROM events WHERE {scope} AND event = 'style_adjust' GROUP BY control, surface ORDER BY users DESC, count DESC`, scope),
    q(`SELECT json_extract(props, '$.tab') AS tab, COUNT(DISTINCT anon_id) AS users, COUNT(*) AS count FROM events WHERE {scope} AND event = 'style_tab_open' GROUP BY tab ORDER BY users DESC`, scope),
    q(`SELECT json_extract(props, '$.group') AS grp, json_extract(props, '$.action') AS action, COUNT(DISTINCT anon_id) AS users, COUNT(*) AS count FROM events WHERE {scope} AND event = 'style_token_adjust' GROUP BY grp, action ORDER BY users DESC, count DESC`, scope),
    q(`SELECT json_extract(props, '$.panel') AS panel, COUNT(DISTINCT anon_id) AS users, COUNT(*) AS count FROM events WHERE {scope} AND event = 'panel_open' GROUP BY panel ORDER BY users DESC`, scope),
    q(`SELECT json_extract(props, '$.kind') AS kind, json_extract(props, '$.message') AS message, COUNT(*) AS count FROM events WHERE {scope} AND event = 'error' GROUP BY kind, message ORDER BY count DESC LIMIT 30`, scope),
    // 复制时的稿子形态
    q(`SELECT
         COUNT(*) AS copies,
         SUM(CASE WHEN json_extract(props, '$.unsafeImages') > 0 THEN 1 ELSE 0 END) AS with_unsafe_images,
         SUM(CASE WHEN json_extract(props, '$.blocks') > 0 THEN 1 ELSE 0 END) AS with_blocks,
         SUM(CASE WHEN json_extract(props, '$.images') > 0 THEN 1 ELSE 0 END) AS with_images,
         SUM(CASE WHEN json_extract(props, '$.mpConfigured') = 1 THEN 1 ELSE 0 END) AS mp_configured
       FROM events WHERE {scope} AND event = 'copy' AND json_extract(props, '$.mode') = 'txt'`, scope),
    // 复制后「贴进去正常吗」的回答
    q(`SELECT json_extract(props, '$.verdict') AS verdict, COUNT(*) AS count, COUNT(DISTINCT anon_id) AS users FROM events WHERE {scope} AND event = 'copy_verdict' GROUP BY verdict`, scope),
    // 漏斗下钻：每一步按平台 / 屏幕宽度拆
    q(`SELECT event, platform, COUNT(DISTINCT anon_id) AS users FROM events WHERE {scope} AND event IN (${FUNNEL_IN}) GROUP BY event, platform`, scope, FUNNEL_STEPS),
    q(`SELECT s.event AS event, o.viewport AS viewport, COUNT(DISTINCT s.anon_id) AS users
       FROM (SELECT anon_id, event FROM events WHERE {scope} AND event IN (${FUNNEL_IN})) s
       JOIN (SELECT anon_id, json_extract(MAX(props), '$.viewport') AS viewport FROM events WHERE {scope} AND event = 'app_open' GROUP BY anon_id) o ON o.anon_id = s.anon_id
       GROUP BY s.event, o.viewport`, scope, FUNNEL_STEPS),
    // 留存：按首次出现的周分组，看第 2–7 天、第 8–14 天有没有回来
    q(`SELECT week, COUNT(*) AS cohort, SUM(d7) AS d7, SUM(d14) AS d14, SUM(CASE WHEN first_ts < ? THEN 1 ELSE 0 END) AS d7_matured, SUM(CASE WHEN first_ts < ? THEN 1 ELSE 0 END) AS d14_matured
       FROM (
         SELECT f.anon_id, f.first_ts,
           date(f.first_ts / 1000, 'unixepoch', '-' || ((strftime('%w', f.first_ts / 1000, 'unixepoch') + 6) % 7) || ' days') AS week,
           EXISTS(SELECT 1 FROM events e WHERE e.anon_id = f.anon_id AND e.ts >= f.first_ts + ${DAY_MS} AND e.ts < f.first_ts + ${7 * DAY_MS}) AS d7,
           EXISTS(SELECT 1 FROM events e WHERE e.anon_id = f.anon_id AND e.ts >= f.first_ts + ${7 * DAY_MS} AND e.ts < f.first_ts + ${14 * DAY_MS}) AS d14
         FROM (SELECT anon_id, MIN(ts) AS first_ts FROM events GROUP BY anon_id) f
         WHERE f.first_ts >= ? AND f.first_ts < ? AND f.anon_id IN (SELECT anon_id FROM events WHERE {scope})
       ) GROUP BY week ORDER BY week DESC LIMIT 8`, scope, [params.until - 7 * DAY_MS, params.until - 14 * DAY_MS, params.since, params.until]),
    q(`SELECT id, ts, type, message, contact, issue_url, context, status FROM feedback WHERE ts >= ? AND ts < ? ORDER BY ts DESC LIMIT 200`, rangeOnly, [params.since, params.until]),
    q(`SELECT status, COUNT(*) AS count FROM feedback GROUP BY status`, rangeOnly),
    // 筛选项：只按周期算，不受其它筛选影响，否则选了就找不回来
    q(`SELECT version, COUNT(DISTINCT anon_id) AS users FROM events WHERE {scope} GROUP BY version ORDER BY users DESC LIMIT 20`, rangeOnly),
    q(`SELECT json_extract(props, '$.viewport') AS viewport, COUNT(DISTINCT anon_id) AS users FROM events WHERE {scope} AND event = 'app_open' GROUP BY viewport ORDER BY users DESC`, rangeOnly),
    q(`SELECT json_extract(props, '$.mode') AS mode, COUNT(DISTINCT anon_id) AS users FROM events WHERE {scope} AND event = 'app_open' GROUP BY mode ORDER BY users DESC`, rangeOnly),
    // 看客 / 写手：打开过、改过正文、复制过的设备数
    q(`SELECT event, COUNT(DISTINCT anon_id) AS users FROM events WHERE {scope} AND event IN ('app_open', 'content_edit', 'copy') GROUP BY event`, scope),
    q(`SELECT json_extract(props, '$.kind') AS kind, json_extract(props, '$.chars') AS chars, COUNT(DISTINCT anon_id) AS users, COUNT(*) AS count FROM events WHERE {scope} AND event = 'content_edit' GROUP BY kind, chars ORDER BY users DESC`, scope),
    q(`SELECT json_extract(props, '$.seconds') AS seconds, COUNT(*) AS count, COUNT(DISTINCT anon_id) AS users, SUM(CASE WHEN json_extract(props, '$.edited') = 1 THEN 1 ELSE 0 END) AS edited, SUM(CASE WHEN json_extract(props, '$.copied') = 1 THEN 1 ELSE 0 END) AS copied FROM events WHERE {scope} AND event = 'session_end' GROUP BY seconds`, scope),
  ])

  const audienceMap = new Map(audienceRows.map(row => [row.event, Number(row.users) || 0]))
  const secondsMap = new Map(sessionSeconds.map(row => [String(row.seconds), row]))

  return json({
    days: params.days,
    range: { since: params.since, until: params.until },
    filters: {
      applied: { platform: params.platform, version: params.version, viewport: params.viewport, mode: params.mode },
      versions: filterVersions.filter(row => row.version),
      viewports: filterViewports.filter(row => row.viewport),
      modes: filterModes.filter(row => row.mode),
    },
    ...core,
    previous: {
      range: { since: params.since - params.span, until: params.since },
      ...previous,
      byDayEvent: previousByDayEvent,
    },
    topDetails: byDetail,
    byVersion,
    byDayEvent,
    trendEvents: TREND_EVENTS,
    byViewport,
    byTheme,
    byBlock,
    byStyleControl,
    byStyleTab,
    byTokenGroup,
    byPanel,
    byError,
    copyContext: copyContext[0] ?? {},
    copyVerdict,
    funnelBreakdown: { platform: funnelByPlatform, viewport: funnelByViewport },
    retention,
    feedback: feedbackRecent,
    feedbackByStatus,
    audience: {
      opened: audienceMap.get(`app_open`) ?? 0,
      edited: audienceMap.get(`content_edit`) ?? 0,
      copied: audienceMap.get(`copy`) ?? 0,
      editKinds,
      sessionSeconds: SESSION_SECONDS_BUCKETS.map((bucket) => {
        const row = secondsMap.get(bucket) ?? {}
        return {
          seconds: bucket,
          count: Number(row.count) || 0,
          users: Number(row.users) || 0,
          edited: Number(row.edited) || 0,
          copied: Number(row.copied) || 0,
        }
      }),
    },
  })
}

/** POST /feedback/:id/status  body: { status } */
async function handleFeedbackStatus(request, env, id) {
  if (!isAuthorized(request, env)) {
    return json({ error: `unauthorized` }, 401)
  }
  const payload = await readJsonBody(request)
  const status = typeof payload?.status === `string` ? payload.status : ``
  if (!FEEDBACK_STATUSES.includes(status)) {
    return json({ error: `unknown status` }, 400)
  }
  const rowId = Number(id)
  if (!Number.isInteger(rowId) || rowId <= 0) {
    return json({ error: `bad id` }, 400)
  }
  await env.DB.prepare(`UPDATE feedback SET status = ? WHERE id = ?`).bind(status, rowId).run()
  return json({ ok: true, id: rowId, status })
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (request.method === `OPTIONS`) {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    if (request.method === `POST` && url.pathname === `/ingest`) {
      return handleIngest(request, env)
    }

    if (request.method === `POST` && url.pathname === `/feedback`) {
      return handleFeedback(request, env, ctx)
    }

    const statusMatch = request.method === `POST` ? url.pathname.match(/^\/feedback\/(\d+)\/status$/u) : null
    if (statusMatch) {
      return handleFeedbackStatus(request, env, statusMatch[1])
    }

    if (request.method === `GET` && url.pathname === `/stats`) {
      return handleStats(request, env)
    }

    if (request.method === `GET` && (url.pathname === `/dashboard` || url.pathname === `/dashboard/`)) {
      return dashboardResponse()
    }

    if (request.method === `GET` && url.pathname === `/`) {
      return Response.redirect(new URL(`/dashboard`, url), 302)
    }

    if (request.method === `GET` && url.pathname === `/health`) {
      return json({ ok: true })
    }

    return json({ error: `not found` }, 404)
  },
}
