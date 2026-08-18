import { TELEMETRY_ENDPOINT } from '@/config/telemetry'
import { isDesktopRuntime } from '@/services/desktop/bridge'
import { addPrefix } from '@/utils'

/**
 * 匿名使用统计。
 *
 * 原则：
 * - 只记功能使用次数（复制、换主题、插板块……），不碰文章内容、不碰任何身份信息
 * - 端点没配置（TELEMETRY_ENDPOINT 为空）时整个模块是空操作
 * - 默认关闭。只有用户在「设置」里打开后才入队；关掉后本地队列立即清空
 * - 批量攒着发：满 20 条或 15 秒发一次，页面关闭前用 sendBeacon 兜底
 * - 请求体用 text/plain 发 JSON，避开 CORS 预检，desktop（mobi://）和网页都走同一条路
 */

type TelemetryProps = Record<string, string | number | boolean>

interface TelemetryEvent {
  event: string
  props: TelemetryProps
  ts: number
}

const CONSENT_KEY = addPrefix(`telemetry_enabled`)
const ANON_ID_KEY = addPrefix(`telemetry_id`)

const FLUSH_INTERVAL_MS = 15_000
const MAX_QUEUE_SIZE = 20

let queue: TelemetryEvent[] = []
let flushTimer: number | null = null
let sessionId = ``

export function isTelemetryConfigured(): boolean {
  return TELEMETRY_ENDPOINT.trim().length > 0
}

/** 用户意愿：默认关闭，显式存 'true' 才算打开 */
export function getTelemetryConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === `true`
  }
  catch {
    return false
  }
}

export function setTelemetryConsent(enabled: boolean): void {
  try {
    localStorage.setItem(CONSENT_KEY, enabled ? `true` : `false`)
  }
  catch {}

  if (!enabled) {
    queue = []
  }
}

function isActive(): boolean {
  return isTelemetryConfigured() && getTelemetryConsent()
}

function getAnonId(): string {
  try {
    let id = localStorage.getItem(ANON_ID_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(ANON_ID_KEY, id)
    }
    return id
  }
  catch {
    return `unknown`
  }
}

function getSessionId(): string {
  if (!sessionId) {
    sessionId = crypto.randomUUID().slice(0, 8)
  }
  return sessionId
}

function buildPayload(events: TelemetryEvent[]): string {
  return JSON.stringify({
    anonId: getAnonId(),
    sessionId: getSessionId(),
    platform: isDesktopRuntime() ? `desktop` : `web`,
    version: typeof __APP_VERSION__ !== `undefined` ? __APP_VERSION__ : `dev`,
    events,
  })
}

function ingestUrl(): string {
  return `${TELEMETRY_ENDPOINT.trim().replace(/\/+$/, ``)}/ingest`
}

function flush(useBeacon = false): void {
  if (!queue.length) {
    return
  }

  const body = buildPayload(queue)
  queue = []

  if (useBeacon && typeof navigator !== `undefined` && navigator.sendBeacon) {
    navigator.sendBeacon(ingestUrl(), body)
    return
  }

  void fetch(ingestUrl(), {
    method: `POST`,
    body,
    keepalive: true,
    // text/plain 属于简单请求，不触发 CORS 预检
    headers: { 'content-type': `text/plain` },
  }).catch(() => {})
}

export function trackEvent(event: string, props: TelemetryProps = {}): void {
  if (!isActive()) {
    return
  }

  queue.push({ event, props, ts: Date.now() })

  if (queue.length >= MAX_QUEUE_SIZE) {
    if (flushTimer != null) {
      window.clearTimeout(flushTimer)
      flushTimer = null
    }
    flush()
    return
  }

  flushTimer ??= window.setTimeout(() => {
    flushTimer = null
    flush()
  }, FLUSH_INTERVAL_MS)
}

if (typeof window !== `undefined`) {
  window.addEventListener(`pagehide`, () => flush(true))
}
