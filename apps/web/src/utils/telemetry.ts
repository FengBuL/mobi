import { prefix } from '@mobi/shared/configs'
import { TELEMETRY_ENDPOINT } from '@/config/telemetry'
import { isDesktopRuntime } from '@/services/desktop/bridge'

// 不从 '@/utils' 取 addPrefix：storage.ts 和 utils/index.ts 都会引本模块，绕开循环依赖
function addPrefix(str: string) {
  return `${prefix}__${str}`
}

/**
 * 匿名使用统计。
 *
 * 原则：
 * - 只记功能使用次数（复制、换主题、插板块……），不碰文章内容、不碰任何身份信息
 * - 端点没配置（TELEMETRY_ENDPOINT 为空）时整个模块是空操作
 * - 默认开启；历史上曾经明确关闭的用户继续保持关闭
 * - 批量攒着发：满 20 条或 15 秒发一次，页面关闭前用 sendBeacon 兜底
 * - 请求体用 text/plain 发 JSON，避开 CORS 预检，desktop（mobi://）和网页都走同一条路
 */

export type TelemetryProps = Record<string, string | number | boolean>

interface TelemetryEvent {
  event: string
  props: TelemetryProps
  ts: number
}

const CONSENT_KEY = addPrefix(`telemetry_enabled`)
const ANON_ID_KEY = addPrefix(`telemetry_id`)
const FIRST_SEEN_KEY = addPrefix(`telemetry_first_seen`)
/** 会话级标记放 sessionStorage：同一标签页内刷新也只算一次 */
const SESSION_EDITED_KEY = addPrefix(`telemetry_session_edited`)
const SESSION_COPIED_KEY = addPrefix(`telemetry_session_copied`)

const FLUSH_INTERVAL_MS = 15_000
const MAX_QUEUE_SIZE = 20

let queue: TelemetryEvent[] = []
let flushTimer: number | null = null
let sessionId = ``
let sessionEndSent = false
const sessionStartedAt = Date.now()

export function isTelemetryConfigured(): boolean {
  return TELEMETRY_ENDPOINT.trim().length > 0
}

/** 历史兼容：默认开启，只保留曾经明确存下的关闭选择 */
export function getTelemetryConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) !== `false`
  }
  catch {
    return true
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

  if (event === `copy`) {
    writeSessionFlag(SESSION_COPIED_KEY)
  }

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

/** 视口宽度分桶：看板按桶分组，不存精确像素 */
export function bucketViewportWidth(width: number): string {
  if (width <= 768)
    return `<=768`
  if (width < 1280)
    return `769-1279`
  if (width < 1440)
    return `1280-1439`
  if (width < 1680)
    return `1440-1679`
  if (width < 1920)
    return `1680-1919`
  if (width < 2560)
    return `1920-2559`
  return `>=2560`
}

/** 字数分桶，只用于判断稿子长短，不存正文 */
export function bucketCount(count: number, steps: number[] = [0, 300, 800, 1500, 3000, 6000]): string {
  for (let index = steps.length - 1; index >= 0; index--) {
    const floor = steps[index]
    if (count >= floor) {
      const next = steps[index + 1]
      return next === undefined ? `>=${floor}` : `${floor}-${next - 1}`
    }
  }
  return `0`
}

/**
 * 每次打开记一条。first 标出这台设备是不是第一次来，看板据此算新增 / 回访。
 */
export function trackAppOpen(extra: TelemetryProps = {}): void {
  if (!isActive())
    return

  let first = false
  try {
    if (!localStorage.getItem(FIRST_SEEN_KEY)) {
      // 2.3.2 起就有 anonId 的老设备没有 first_seen 字段，不能被当成新用户
      first = !localStorage.getItem(ANON_ID_KEY)
      localStorage.setItem(FIRST_SEEN_KEY, String(Date.now()))
    }
  }
  catch {}

  const width = window.innerWidth
  const height = window.innerHeight
  trackEvent(`app_open`, {
    first,
    viewport: bucketViewportWidth(width),
    width,
    height,
    dpr: Math.round((window.devicePixelRatio || 1) * 100) / 100,
    ...extra,
  })
}

function readSessionFlag(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === `1`
  }
  catch {
    return false
  }
}

function writeSessionFlag(key: string): void {
  try {
    sessionStorage.setItem(key, `1`)
  }
  catch {}
}

export type ContentEditKind = 'type' | 'paste' | 'file'

/** 粘贴进正文多少字以上才算「贴了自己的稿」，再短当普通打字 */
export const PASTE_AS_DRAFT_MIN_CHARS = 200

/**
 * 正文第一次被用户改动。区分「只看示例稿的看客」和「写了自己稿子的写手」。
 * 同一会话只报一次；默认稿加载、切主题、插板块这类程序化改动不经过这里。
 * 只记改动方式和改动后字数分桶，不记正文。
 */
export function trackContentEdit(kind: ContentEditKind, chars: number): void {
  if (!isActive() || readSessionFlag(SESSION_EDITED_KEY))
    return

  writeSessionFlag(SESSION_EDITED_KEY)
  trackEvent(`content_edit`, { kind, chars: bucketCount(chars) })
}

/** 会话时长分桶（秒），看板只看分布 */
export function bucketSeconds(seconds: number): string {
  if (seconds < 30)
    return `<30`
  if (seconds < 120)
    return `30-120`
  if (seconds < 600)
    return `120-600`
  if (seconds < 1800)
    return `600-1800`
  return `1800+`
}

/**
 * 页面隐藏或关闭时报一次会话收尾：待了多久、改过正文没有、复制过没有。
 * 同一次页面加载只报一次；随即用 sendBeacon 把队列冲出去。
 */
export function trackSessionEnd(now = Date.now()): void {
  if (!isActive() || sessionEndSent)
    return

  sessionEndSent = true
  trackEvent(`session_end`, {
    seconds: bucketSeconds(Math.max(0, Math.round((now - sessionStartedAt) / 1000))),
    edited: readSessionFlag(SESSION_EDITED_KEY),
    copied: readSessionFlag(SESSION_COPIED_KEY),
  })
  flush(true)
}

/** 给反馈用：统计开着才带匿名 ID，方便把一条反馈和它前后的操作对上 */
export function getTelemetryAnonId(): string {
  return isActive() ? getAnonId() : ``
}

/** 出错时只记类别和一句短原因，不带文章内容和地址 */
export function trackError(kind: string, message?: unknown): void {
  const text = message instanceof Error ? message.message : typeof message === `string` ? message : ``
  trackEvent(`error`, { kind, message: text.slice(0, 80) })
}

if (typeof window !== `undefined`) {
  window.addEventListener(`pagehide`, () => {
    trackSessionEnd()
    flush(true)
  })
  document.addEventListener(`visibilitychange`, () => {
    if (document.visibilityState === `hidden`)
      trackSessionEnd()
  })
}
