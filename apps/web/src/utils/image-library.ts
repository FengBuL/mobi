export interface RecentImageEntry {
  url: string
  alt: string
  usedAt: number
}

const RECENT_IMAGE_STORAGE_KEY = `mobi__recent-images`
const RECENT_IMAGE_LIMIT = 48

function isHttpLikeUrl(value: string) {
  return /^(?:https?:)?\/\//i.test(value) || value.startsWith(`data:image/`)
}

function normalizeEntry(value: unknown): RecentImageEntry | null {
  if (!value || typeof value !== `object`) {
    return null
  }

  const record = value as Record<string, unknown>
  const url = typeof record.url === `string` ? record.url.trim() : ``
  if (!url || !isHttpLikeUrl(url)) {
    return null
  }

  return {
    url,
    alt: typeof record.alt === `string` ? record.alt.trim() : ``,
    usedAt: typeof record.usedAt === `number` && Number.isFinite(record.usedAt) ? record.usedAt : Date.now(),
  }
}

export function readRecentImages(): RecentImageEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_IMAGE_STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map(normalizeEntry)
      .filter((item): item is RecentImageEntry => item !== null)
      .sort((left, right) => right.usedAt - left.usedAt)
      .slice(0, RECENT_IMAGE_LIMIT)
  }
  catch {
    return []
  }
}

export function rememberRecentImages(images: Array<{ url: string, alt?: string }>) {
  const incoming = images
    .map(item => normalizeEntry({ url: item.url, alt: item.alt ?? ``, usedAt: Date.now() }))
    .filter((item): item is RecentImageEntry => item !== null)

  if (!incoming.length) {
    return readRecentImages()
  }

  const merged = new Map<string, RecentImageEntry>()
  incoming.forEach(item => merged.set(item.url, item))
  readRecentImages().forEach((item) => {
    if (!merged.has(item.url)) {
      merged.set(item.url, item)
    }
  })

  const next = Array.from(merged.values())
    .sort((left, right) => right.usedAt - left.usedAt)
    .slice(0, RECENT_IMAGE_LIMIT)

  try {
    localStorage.setItem(RECENT_IMAGE_STORAGE_KEY, JSON.stringify(next))
  }
  catch {
    return next
  }

  return next
}

export function removeRecentImage(url: string) {
  const next = readRecentImages().filter(item => item.url !== url)
  try {
    localStorage.setItem(RECENT_IMAGE_STORAGE_KEY, JSON.stringify(next))
  }
  catch {
    return next
  }
  return next
}

export function clearRecentImages() {
  try {
    localStorage.removeItem(RECENT_IMAGE_STORAGE_KEY)
  }
  catch {
    // localStorage 不可用时静默降级，最近图片只是便利功能
  }
  return []
}

/**
 * 从一段文本里抽出所有可用的图片地址，支持 Markdown 图片、裸链接和逗号 / 换行分隔的列表
 */
export function extractImageUrls(input: string) {
  const results: Array<{ url: string, alt: string }> = []
  const seen = new Set<string>()

  const push = (url: string, alt: string) => {
    const normalized = url.trim().replace(/[),.;]+$/u, ``)
    if (!normalized || !isHttpLikeUrl(normalized) || seen.has(normalized)) {
      return
    }
    seen.add(normalized)
    results.push({ url: normalized, alt: alt.trim() })
  }

  const markdownRegex = /!\[(.*?)\]\((.+?)\)/g
  let rest = input
  for (const match of input.matchAll(markdownRegex)) {
    const target = (match[2] || ``).trim().replace(/\s+["'][^"']*["']\s*$/u, ``)
    push(target, match[1] || ``)
    rest = rest.replace(match[0], ` `)
  }

  rest
    .split(/[\s,，、]+/u)
    .forEach(token => push(token, ``))

  return results
}
