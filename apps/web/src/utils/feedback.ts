import { TELEMETRY_ENDPOINT } from '@/config/telemetry'
import { isDesktopRuntime } from '@/services/desktop/bridge'
import { bucketViewportWidth, trackEvent } from '@/utils/telemetry'

/**
 * 「哪里不对」标签，可多选。label 是标签文字，hint 是 title 里的一句解释。
 * 只勾标签不写字也算一条反馈：知道「图丢了」被点了 30 次，比等一篇长文更早。
 */
export const FEEDBACK_TYPES = [
  { value: `paste`, label: `贴进去不一样`, hint: `预览里有的，贴进公众号后没了或变了` },
  { value: `image`, label: `图丢了`, hint: `图片没转存、贴过去空白或报错` },
  { value: `copy_fail`, label: `复制失败`, hint: `点了复制没反应或报错` },
  { value: `theme`, label: `主题不对`, hint: `某套主题看着不对` },
  { value: `block`, label: `板块不对`, hint: `某个板块插进去或换样式后不对` },
  { value: `style_panel`, label: `样式面板难用`, hint: `全局样式 / 当前组件里找不到、改不动` },
  { value: `suggestion`, label: `想要新功能`, hint: `缺什么、哪里不顺手` },
  { value: `other`, label: `其他`, hint: `上面都不是` },
] as const

export type FeedbackType = typeof FEEDBACK_TYPES[number][`value`]

/** 反馈是从哪个入口进来的，看板按它分「反馈来源」 */
export type FeedbackSource = `button` | `menu` | `nudge` | `error`

/** 从别处叫出反馈弹窗时的预填 */
export interface FeedbackPreset {
  source: FeedbackSource
  /** 预先勾上的标签 */
  types?: FeedbackType[]
  /** 预填进正文的一句话（比如出错信息） */
  seed?: string
}

/** 没勾任何标签时，正文至少要这么长才看得懂 */
export const FEEDBACK_MIN_LENGTH = 10
export const FEEDBACK_MAX_LENGTH = 4000
export const GITHUB_ISSUES_URL = `https://github.com/FengBuL/mobi/issues/new`

export interface FeedbackContext {
  version: string
  platform: `desktop` | `web`
  theme: string
  viewport: string
  mode: string
  browser: string
  os: string
  imgHost: string
  source: FeedbackSource
}

export interface FeedbackDraft {
  types: FeedbackType[]
  message: string
}

export interface FeedbackResult {
  ok: boolean
  issueUrl?: string | null
  forwarded?: boolean
  error?: string
}

/** 反馈走观测台同一个 Worker；没配端点就只能退回 GitHub */
export function feedbackUrl(): string {
  const base = TELEMETRY_ENDPOINT.trim().replace(/\/+$/, ``)
  return base ? `${base}/feedback` : ``
}

export function isFeedbackChannelAvailable(): boolean {
  return Boolean(feedbackUrl())
}

function detectBrowser(ua: string): string {
  if (/Edg\//.test(ua))
    return `Edge`
  if (/OPR\//.test(ua))
    return `Opera`
  if (/Chrome\//.test(ua))
    return `Chrome`
  if (/Safari\//.test(ua) && /Version\//.test(ua))
    return `Safari`
  if (/Firefox\//.test(ua))
    return `Firefox`
  return `其他`
}

function detectOs(ua: string): string {
  if (/Windows/.test(ua))
    return `Windows`
  if (/Mac OS X/.test(ua))
    return `macOS`
  if (/Android/.test(ua))
    return `Android`
  if (/iPhone|iPad/.test(ua))
    return `iOS`
  if (/Linux/.test(ua))
    return `Linux`
  return `其他`
}

/** 随反馈一起带上的环境信息。只有分类值，没有账号、稿子、地址 */
export function collectFeedbackContext(extra: { theme?: string, mode?: string, imgHost?: string, source?: FeedbackSource } = {}): FeedbackContext {
  const ua = typeof navigator !== `undefined` ? navigator.userAgent : ``
  return {
    version: typeof __APP_VERSION__ !== `undefined` ? __APP_VERSION__ : `dev`,
    platform: isDesktopRuntime() ? `desktop` : `web`,
    theme: extra.theme ?? ``,
    viewport: typeof window !== `undefined` ? `${bucketViewportWidth(window.innerWidth)} (${window.innerWidth}×${window.innerHeight})` : ``,
    mode: extra.mode ?? ``,
    browser: detectBrowser(ua),
    os: detectOs(ua),
    imgHost: extra.imgHost ?? ``,
    source: extra.source ?? `button`,
  }
}

/**
 * 勾了标签，正文可空；没勾标签，正文至少 10 个字。
 * 两样都没有不算反馈。
 */
export function validateFeedbackDraft(draft: FeedbackDraft): string {
  const length = draft.message.trim().length
  if (length > FEEDBACK_MAX_LENGTH)
    return `太长了，请控制在 ${FEEDBACK_MAX_LENGTH} 字以内`
  if (draft.types.length)
    return ``
  if (length === 0)
    return `勾一个标签，或者写几个字`
  if (length < FEEDBACK_MIN_LENGTH)
    return `没勾标签的话，至少写 ${FEEDBACK_MIN_LENGTH} 个字才看得懂发生了什么`
  return ``
}

export function feedbackTypeLabels(types: readonly FeedbackType[]): string[] {
  return types.map(type => FEEDBACK_TYPES.find(item => item.value === type)?.label ?? type)
}

/** 没有反馈通道时，把内容预填进 GitHub 新建 Issue 页 */
export function buildGithubIssueUrl(draft: FeedbackDraft, context: FeedbackContext): string {
  const labels = feedbackTypeLabels(draft.types)
  const body = [
    draft.message.trim(),
    ``,
    `## 环境`,
    ...Object.entries(context).filter(([key, value]) => value && key !== `source`).map(([key, value]) => `- ${key}: ${value}`),
  ].join(`\n`)
  const params = new URLSearchParams({
    title: labels.length ? `[${labels.join(` · `)}] ` : ``,
    body,
    labels: `feedback`,
  })
  return `${GITHUB_ISSUES_URL}?${params.toString()}`
}

export async function submitFeedback(draft: FeedbackDraft, context: FeedbackContext, anonId = ``): Promise<FeedbackResult> {
  const url = feedbackUrl()
  if (!url) {
    return { ok: false, error: `no_channel` }
  }

  // 环境信息一律带上：只有分类值，没有稿子、账号、地址
  const payload = {
    types: draft.types,
    message: draft.message.trim(),
    anonId,
    context,
    website: ``,
  }

  try {
    const response = await fetch(url, {
      method: `POST`,
      body: JSON.stringify(payload),
      headers: { 'content-type': `text/plain;charset=UTF-8` },
    })
    const data = await response.json().catch(() => ({})) as FeedbackResult & { error?: string }
    if (!response.ok) {
      return { ok: false, error: data.error || `http_${response.status}` }
    }
    trackEvent(`feedback_submit`, {
      types: draft.types.join(`,`),
      hasMessage: draft.message.trim().length > 0,
      source: context.source,
      forwarded: Boolean(data.forwarded),
    })
    return { ok: true, issueUrl: data.issueUrl ?? null, forwarded: Boolean(data.forwarded) }
  }
  catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : `network` }
  }
}
