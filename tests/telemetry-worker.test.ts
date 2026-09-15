import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { afterEach, it, vi } from 'vitest'

import worker, { buildGithubIssue, buildScope, compileScoped, FEEDBACK_STATUSES, FEEDBACK_TYPES, parseStatsParams, TRACKED_EVENTS, validateFeedback } from '../infra/telemetry-worker/worker.js'

const DAY = 24 * 60 * 60 * 1000

const ADMIN_KEY = `test-admin-key`

function createDb(options: { feedbackRecent?: number } = {}) {
  const inserted: Array<{ sql: string, binds: unknown[] }> = []
  const queried: Array<{ sql: string, binds: unknown[] }> = []
  const db = {
    inserted,
    queried,
    prepare(sql: string) {
      let bound: unknown[] = []
      return {
        bind(...args: unknown[]) {
          bound = args
          return this
        },
        async run() {
          inserted.push({ sql, binds: bound })
          return { meta: { last_row_id: 7 } }
        },
        async all() {
          queried.push({ sql, binds: bound })
          if (sql.includes(`GROUP BY week`)) {
            return { results: [{ week: `2026-08-10`, cohort: 5, d7: 2, d14: 1, d7_matured: 5, d14_matured: 3 }] }
          }
          if (sql.includes(`GROUP BY status`)) {
            return { results: [{ status: `open`, count: 2 }, { status: `done`, count: 1 }] }
          }
          if (sql.includes(`FROM feedback WHERE ip_hash`)) {
            return { results: [{ count: options.feedbackRecent ?? 0 }] }
          }
          if (sql.includes(`FROM feedback`)) {
            return { results: [] }
          }
          if (sql.includes(`GROUP BY event, props`)) {
            return { results: [{ event: `theme_change`, props: `{"theme":"blueprint"}`, count: 3 }] }
          }
          if (sql.includes(`event IN (`)) {
            return { results: [{ event: `app_open`, users: 4 }, { event: `copy`, users: 2 }] }
          }
          if (sql.includes(`GROUP BY event`)) {
            return { results: [{ event: `theme_change`, count: 3 }] }
          }
          if (sql.includes(`GROUP BY platform`)) {
            return { results: [{ platform: `desktop`, users: 1, events: 3 }] }
          }
          if (sql.includes(`GROUP BY version`)) {
            return { results: [{ version: `2.1.7`, users: 1, events: 3 }] }
          }
          if (sql.includes(`'$.control'`)) {
            return { results: [{ control: `font_size`, surface: `panel`, users: 2, count: 5 }] }
          }
          if (sql.includes(`json_extract`)) {
            return { results: [] }
          }
          if (sql.includes(`strftime`)) {
            return { results: [{ day: `2026-08-14`, users: 1, events: 3 }] }
          }
          return { results: [{ users: 1 }] }
        },
      }
    },
  }
  return db
}

function statsRequest() {
  return new Request(`https://example.com/stats?days=30`, {
    headers: { authorization: `Bearer ${ADMIN_KEY}` },
  })
}

function feedbackRequest(body: unknown, ip = `1.2.3.4`) {
  return new Request(`https://example.com/feedback`, {
    method: `POST`,
    headers: { 'content-type': `text/plain`, 'cf-connecting-ip': ip },
    body: JSON.stringify(body),
  })
}

const validFeedback = {
  types: [`paste`, `image`],
  message: `用奢刊衬线主题，标题下划线贴进公众号后没了。`,
  context: { version: `2.3.3`, platform: `web`, theme: `magazine`, viewport: `1440-1679 (1512×982)`, secret: `should-drop` },
}

afterEach(() => {
  vi.unstubAllGlobals()
})

it(`serves a key-free dashboard HTML application`, async () => {
  const response = await worker.fetch(new Request(`https://example.com/dashboard`), { ADMIN_KEY })
  const body = await response.text()

  assert.equal(response.status, 200)
  assert.match(response.headers.get(`content-type`) ?? ``, /text\/html/)
  assert.match(body, /墨笔数据观测台/)
  assert.match(body, /主路径漏斗/)
  assert.match(body, /全局样式 · 控件使用/)
  assert.match(body, /用户反馈/)
  assert.match(body, /id="f-platform"/, `筛选条`)
  assert.match(body, /留存/)
  assert.match(body, /prefers-reduced-motion/)
  assert.match(body, /'\/feedback\/' \+ id \+ '\/status'/, `反馈处理态接口`)
  assert.doesNotMatch(body, new RegExp(ADMIN_KEY))
})

it(`accepts an authorization bearer token for stats`, async () => {
  const response = await worker.fetch(statsRequest(), { ADMIN_KEY_SECRET: ADMIN_KEY, DB: createDb() })

  assert.equal(response.status, 200)
})

it(`rejects stats without the admin key`, async () => {
  const response = await worker.fetch(new Request(`https://example.com/stats`), { ADMIN_KEY_SECRET: ADMIN_KEY, DB: createDb() })

  assert.equal(response.status, 401)
})

it(`exposes daily trend, version distribution, funnel and style controls`, async () => {
  const response = await worker.fetch(statsRequest(), { ADMIN_KEY_SECRET: ADMIN_KEY, DB: createDb() })
  const payload = await response.json()

  assert.deepEqual(payload.byDay, [{ day: `2026-08-14`, users: 1, events: 3 }])
  assert.deepEqual(payload.byVersion, [{ version: `2.1.7`, users: 1, events: 3 }])
  assert.deepEqual(payload.funnel, [
    { event: `app_open`, users: 4 },
    { event: `theme_change`, users: 0 },
    { event: `block_select`, users: 0 },
    { event: `copy`, users: 2 },
  ])
  assert.deepEqual(payload.byStyleControl, [{ control: `font_size`, surface: `panel`, users: 2, count: 5 }])
  assert.equal(Array.isArray(payload.feedback), true)
})

it(`always exposes every tracked event with zero-filled counts`, async () => {
  const response = await worker.fetch(statsRequest(), { ADMIN_KEY_SECRET: ADMIN_KEY, DB: createDb() })
  const payload = await response.json()

  assert.equal(payload.byEvent[0].event, `theme_change`)
  assert.equal(payload.byEvent[0].count, 3)
  for (const event of TRACKED_EVENTS) {
    const row = payload.byEvent.find((item: { event: string }) => item.event === event)
    assert.ok(row, `缺少 ${event}`)
  }
  for (const event of [`app_open`, `style_adjust`, `style_token_adjust`, `block_select`, `error`, `feedback_submit`]) {
    assert.ok(TRACKED_EVENTS.includes(event), `TRACKED_EVENTS 缺少 ${event}`)
  }
})

it(`parses period and filters from stats query params`, () => {
  const now = Date.parse(`2026-09-15T12:00:00Z`)

  const byDays = parseStatsParams(new URLSearchParams(`days=7&platform=web&version=all&viewport=1440-1679`), now)
  assert.equal(byDays.since, now - 7 * DAY)
  assert.equal(byDays.until, now)
  assert.equal(byDays.days, 7)
  assert.equal(byDays.platform, `web`)
  assert.equal(byDays.version, ``, `all 应视为不筛`)
  assert.equal(byDays.viewport, `1440-1679`)

  const byRange = parseStatsParams(new URLSearchParams(`from=2026-09-01&to=2026-09-07`), now)
  assert.equal(byRange.since, Date.parse(`2026-09-01T00:00:00Z`))
  assert.equal(byRange.until, Date.parse(`2026-09-08T00:00:00Z`), `to 当天要算进去`)
  assert.equal(byRange.days, 7)

  const clamped = parseStatsParams(new URLSearchParams(`days=9999`), now)
  assert.equal(clamped.days, 365)

  const future = parseStatsParams(new URLSearchParams(`from=2026-09-15&to=2026-12-31`), now)
  assert.equal(future.until, now, `不能查到未来`)
})

it(`compiles viewport and mode filters into an app_open sub-select`, () => {
  const params = parseStatsParams(new URLSearchParams(`days=30&platform=web&viewport=1280-1439&mode=pro`), 1_000_000 * DAY)
  const scope = buildScope(params)

  assert.match(scope.where, /platform = \?/)
  assert.match(scope.where, /anon_id IN \(SELECT anon_id FROM events WHERE event = 'app_open'/)
  assert.match(scope.where, /\$\.viewport'\) = \?/)
  assert.match(scope.where, /\$\.mode'\) = \?/)
  assert.deepEqual(scope.binds, [params.since, params.until, `web`, params.since, params.until, `1280-1439`, `pro`])

  const compiled = compileScoped(`SELECT event FROM events WHERE {scope} AND event IN (?,?) GROUP BY event`, scope, [`app_open`, `copy`])
  assert.equal((compiled.sql.match(/\?/gu) || []).length, compiled.binds.length)
  assert.deepEqual(compiled.binds.slice(-2), [`app_open`, `copy`])
  assert.doesNotMatch(compiled.sql, /\{scope\}/)
})

it(`compiles a repeated {scope} placeholder with extras in order`, () => {
  const scope = { where: `ts >= ? AND ts < ?`, binds: [1, 2] }
  const compiled = compileScoped(`SELECT ? FROM (SELECT 1 WHERE {scope}) JOIN (SELECT 2 WHERE {scope}) WHERE x = ?`, scope, [`a`, `b`])

  assert.deepEqual(compiled.binds, [`a`, 1, 2, 1, 2, `b`])
})

it(`returns previous period, retention, funnel breakdown and filter options for the dashboard`, async () => {
  const db = createDb()
  const response = await worker.fetch(new Request(`https://example.com/stats?days=7&platform=desktop`, {
    headers: { authorization: `Bearer ${ADMIN_KEY}` },
  }), { ADMIN_KEY_SECRET: ADMIN_KEY, DB: db })
  const payload = await response.json()

  assert.equal(payload.days, 7)
  assert.equal(payload.filters.applied.platform, `desktop`)
  assert.equal(payload.previous.range.until, payload.range.since, `上一周期紧贴当前周期`)
  assert.equal(payload.previous.range.until - payload.previous.range.since, payload.range.until - payload.range.since)
  assert.equal(typeof payload.previous.activeUsers, `number`)
  assert.ok(Array.isArray(payload.previous.byDayEvent))
  assert.deepEqual(payload.retention, [{ week: `2026-08-10`, cohort: 5, d7: 2, d14: 1, d7_matured: 5, d14_matured: 3 }])
  assert.ok(Array.isArray(payload.funnelBreakdown.platform))
  assert.ok(Array.isArray(payload.funnelBreakdown.viewport))
  assert.deepEqual(payload.feedbackByStatus, [{ status: `open`, count: 2 }, { status: `done`, count: 1 }])
  assert.ok(Array.isArray(payload.trendEvents) && payload.trendEvents.includes(`copy`))

  const platformScoped = db.queried.filter(item => item.binds.includes(`desktop`))
  assert.ok(platformScoped.length > 5, `平台筛选要传到大多数查询里`)
  const filterOptions = db.queried.find(item => item.sql.includes(`GROUP BY version ORDER BY users DESC LIMIT 20`))
  assert.ok(filterOptions)
  assert.equal(filterOptions!.binds.includes(`desktop`), false, `筛选项本身不能被筛选影响`)
})

it(`updates feedback status through the admin endpoint`, async () => {
  const db = createDb()
  const request = (id: string, status: string, key = ADMIN_KEY) => new Request(`https://example.com/feedback/${id}/status`, {
    method: `POST`,
    headers: { 'authorization': `Bearer ${key}`, 'content-type': `application/json` },
    body: JSON.stringify({ status }),
  })

  const ok = await worker.fetch(request(`12`, `done`), { ADMIN_KEY_SECRET: ADMIN_KEY, DB: db })
  assert.equal(ok.status, 200)
  assert.deepEqual(await ok.json(), { ok: true, id: 12, status: `done` })
  const update = db.inserted.find(item => item.sql.startsWith(`UPDATE feedback SET status`))
  assert.deepEqual(update?.binds, [`done`, 12])

  assert.equal((await worker.fetch(request(`12`, `weird`), { ADMIN_KEY_SECRET: ADMIN_KEY, DB: db })).status, 400)
  assert.equal((await worker.fetch(request(`12`, `done`, `wrong`), { ADMIN_KEY_SECRET: ADMIN_KEY, DB: db })).status, 401)
  assert.equal((await worker.fetch(new Request(`https://example.com/feedback/abc/status`, { method: `POST`, headers: { authorization: `Bearer ${ADMIN_KEY}` }, body: `{"status":"done"}` }), { ADMIN_KEY_SECRET: ADMIN_KEY, DB: db })).status, 404)
  assert.deepEqual(FEEDBACK_STATUSES, [`open`, `done`, `ignored`])
})

it(`keeps the admin key and integration secrets out of the Wrangler configuration`, async () => {
  const config = await readFile(resolve(process.cwd(), `infra/telemetry-worker/wrangler.toml`), `utf8`)

  assert.doesNotMatch(config, /ADMIN_KEY\s*=/)
  assert.doesNotMatch(config, /GITHUB_TOKEN\s*=/)
  assert.doesNotMatch(config, /FEISHU_WEBHOOK\s*=/)
})

it(`validates feedback payloads: tags are multi-select, message optional once a tag is picked`, () => {
  assert.equal(validateFeedback(null).ok, false)
  assert.equal(validateFeedback({ types: [`nope`], message: validFeedback.message }).error, `unknown type`)
  assert.equal(validateFeedback({ types: [], message: `` }).error, `empty`)
  assert.equal(validateFeedback({ types: [], message: `太短` }).error, `message too short`)
  assert.equal(validateFeedback({ types: [`image`], message: `` }).ok, true, `只勾标签也算一条`)
  assert.equal(validateFeedback({ types: [`image`], message: `短` }).ok, true)
  assert.equal(validateFeedback({ types: [], message: validFeedback.message }).ok, true, `只写字不勾标签也行`)
  assert.equal(validateFeedback({ ...validFeedback, website: `http://spam` }).error, `rejected`)
  // 老客户端单个 type
  assert.deepEqual(validateFeedback({ type: `paste`, message: validFeedback.message }).record.types, [`paste`])

  const checked = validateFeedback({ ...validFeedback, types: [`paste`, `image`, `paste`], contact: `me@example.com` })
  assert.equal(checked.ok, true)
  assert.deepEqual(checked.record.types, [`paste`, `image`], `去重`)
  assert.equal(checked.record.type, `paste,image`, `D1 列存逗号串`)
  assert.equal(checked.record.contact, `me@example.com`, `老客户端仍可带联系方式`)
  assert.deepEqual(Object.keys(checked.record.context).sort(), [`platform`, `theme`, `version`, `viewport`])
  for (const key of [`paste`, `image`, `copy_fail`, `theme`, `block`, `style_panel`, `suggestion`, `other`]) {
    assert.ok(key in FEEDBACK_TYPES, `缺标签 ${key}`)
  }
})

it(`builds a GitHub issue with every tag, message and environment`, () => {
  const { record } = validateFeedback(validFeedback)
  const issue = buildGithubIssue(record)

  assert.match(issue.title, /^\[贴进去不一样 · 图丢了\] 用奢刊衬线主题/)
  assert.match(issue.body, /标签：贴进去不一样、图丢了/)
  assert.match(issue.body, /## 环境/)
  assert.match(issue.body, /- theme: magazine/)
  assert.doesNotMatch(issue.body, /联系方式/)
  assert.deepEqual(issue.labels, [`feedback`, `贴进去不一样`, `图丢了`])

  const tagsOnly = buildGithubIssue(validateFeedback({ types: [`copy_fail`], message: `` }).record)
  assert.equal(tagsOnly.title, `[复制失败] （只勾了标签）`)
})

it(`stores feedback in D1 and forwards to GitHub when a token is configured`, async () => {
  const calls: Array<{ url: string, body: string }> = []
  vi.stubGlobal(`fetch`, async (url: string, init: RequestInit) => {
    calls.push({ url, body: String(init.body) })
    if (url.includes(`api.github.com`)) {
      return new Response(JSON.stringify({ html_url: `https://github.com/FengBuL/mobi/issues/1` }), { status: 201 })
    }
    return new Response(`{}`, { status: 200 })
  })

  const db = createDb()
  const response = await worker.fetch(feedbackRequest(validFeedback), {
    DB: db,
    GITHUB_TOKEN: `ghp_test`,
    GITHUB_REPO: `FengBuL/mobi`,
    FEISHU_WEBHOOK: `https://open.feishu.cn/open-apis/bot/v2/hook/test`,
  })
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.ok, true)
  assert.equal(payload.issueUrl, `https://github.com/FengBuL/mobi/issues/1`)
  assert.equal(payload.forwarded, true)

  const insert = db.inserted.find(item => item.sql.startsWith(`INSERT INTO feedback`))
  assert.ok(insert)
  assert.equal(insert!.binds[1], `paste,image`)
  assert.ok(db.inserted.some(item => item.sql.startsWith(`UPDATE feedback SET issue_url`)))

  const github = calls.find(call => call.url.includes(`api.github.com/repos/FengBuL/mobi/issues`))
  assert.ok(github)
  assert.match(github!.body, /贴进去不一样/)
  const feishu = calls.find(call => call.url.includes(`open.feishu.cn`))
  assert.ok(feishu)
  assert.match(feishu!.body, /issues\/1/)
})

it(`still accepts feedback when no GitHub token is configured`, async () => {
  vi.stubGlobal(`fetch`, async () => {
    throw new Error(`should not call network`)
  })

  const response = await worker.fetch(feedbackRequest(validFeedback), { DB: createDb() })
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.ok, true)
  assert.equal(payload.issueUrl, null)
  assert.equal(payload.forwarded, false)
})

it(`rate-limits feedback per IP`, async () => {
  const response = await worker.fetch(feedbackRequest(validFeedback), { DB: createDb({ feedbackRecent: 5 }) })

  assert.equal(response.status, 429)
})

it(`rejects malformed feedback`, async () => {
  const response = await worker.fetch(feedbackRequest({ types: [], message: `短` }), { DB: createDb() })

  assert.equal(response.status, 400)
})
