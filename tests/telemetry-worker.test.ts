import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { it } from 'vitest'

import worker from '../infra/telemetry-worker/worker.js'

const ADMIN_KEY = `test-admin-key`

function createDb() {
  return {
    prepare(sql: string) {
      return {
        bind() {
          return this
        },
        async all() {
          if (sql.includes(`GROUP BY event, props`)) {
            return { results: [{ event: `theme_change`, props: `{"theme":"blueprint"}`, count: 3 }] }
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
          if (sql.includes(`strftime`)) {
            return { results: [{ day: `2026-08-14`, users: 1, events: 3 }] }
          }
          return { results: [{ users: 1 }] }
        },
      }
    },
  }
}

it(`serves a key-free dashboard HTML application`, async () => {
  const response = await worker.fetch(new Request(`https://example.com/dashboard`), { ADMIN_KEY })
  const body = await response.text()

  assert.equal(response.status, 200)
  assert.match(response.headers.get(`content-type`) ?? ``, /text\/html/)
  assert.match(body, /墨笔数据观测台/)
  assert.doesNotMatch(body, new RegExp(ADMIN_KEY))
})

it(`accepts an authorization bearer token for stats`, async () => {
  const request = new Request(`https://example.com/stats?days=30`, {
    headers: { authorization: `Bearer ${ADMIN_KEY}` },
  })
  const response = await worker.fetch(request, { ADMIN_KEY_SECRET: ADMIN_KEY, DB: createDb() })

  assert.equal(response.status, 200)
})

it(`exposes daily trend and version distribution`, async () => {
  const request = new Request(`https://example.com/stats?days=30`, {
    headers: { authorization: `Bearer ${ADMIN_KEY}` },
  })
  const response = await worker.fetch(request, { ADMIN_KEY_SECRET: ADMIN_KEY, DB: createDb() })
  const payload = await response.json()

  assert.deepEqual(payload.byDay, [{ day: `2026-08-14`, users: 1, events: 3 }])
  assert.deepEqual(payload.byVersion, [{ version: `2.1.7`, users: 1, events: 3 }])
})

it(`always exposes all seven tracked events with zero-filled counts`, async () => {
  const request = new Request(`https://example.com/stats?days=30`, {
    headers: { authorization: `Bearer ${ADMIN_KEY}` },
  })
  const response = await worker.fetch(request, { ADMIN_KEY_SECRET: ADMIN_KEY, DB: createDb() })
  const payload = await response.json()

  assert.deepEqual(payload.byEvent, [
    { event: `theme_change`, count: 3 },
    { event: `copy`, count: 0 },
    { event: `style_preset_apply`, count: 0 },
    { event: `block_apply`, count: 0 },
    { event: `image_layout_apply`, count: 0 },
    { event: `export`, count: 0 },
    { event: `mp_config_saved`, count: 0 },
  ])
})

it(`keeps the admin key out of the Wrangler configuration`, async () => {
  const config = await readFile(resolve(process.cwd(), `infra/telemetry-worker/wrangler.toml`), `utf8`)

  assert.doesNotMatch(config, /ADMIN_KEY\s*=/)
})
