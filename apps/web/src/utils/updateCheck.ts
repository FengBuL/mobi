import { toast } from 'vue-sonner'
import { isDesktopRuntime } from '@/services/desktop/bridge'
import { addPrefix } from '@/utils'

/**
 * 桌面端启动时的更新提醒。
 *
 * 网页版跟着部署走永远是最新的，不需要；桌面版没有自动更新通道，
 * 用户装完就再也不知道有新版了，这里在启动后查一次 GitHub 最新 Release，
 * 有更新就弹一条带下载按钮的提示。每天最多查一次，查失败保持沉默。
 */

const RELEASES_API = `https://api.github.com/repos/FengBuL/mobi/releases/latest`
const RELEASES_PAGE = `https://github.com/FengBuL/mobi/releases/latest`
const LAST_CHECK_KEY = addPrefix(`update_last_check`)
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000
const STARTUP_DELAY_MS = 8000

function parseVersion(value: string): [number, number, number] | null {
  const match = value.trim().replace(/^v/i, ``).match(/^(\d+)\.(\d+)\.(\d+)/)
  if (!match) {
    return null
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function isNewerVersion(remote: string, local: string): boolean {
  const a = parseVersion(remote)
  const b = parseVersion(local)
  if (!a || !b) {
    return false
  }

  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) {
      return a[i] > b[i]
    }
  }
  return false
}

async function checkOnce(): Promise<void> {
  const currentVersion = typeof __APP_VERSION__ !== `undefined` ? __APP_VERSION__ : ``
  if (!currentVersion) {
    return
  }

  let tagName = ``
  try {
    const response = await fetch(RELEASES_API, {
      headers: { accept: `application/vnd.github+json` },
    })
    if (!response.ok) {
      return
    }
    const data = await response.json() as { tag_name?: string }
    tagName = data.tag_name ?? ``
  }
  catch {
    return
  }

  try {
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()))
  }
  catch {}

  if (!tagName || !isNewerVersion(tagName, currentVersion)) {
    return
  }

  toast.info(`发现新版本 ${tagName}（当前 v${currentVersion}）`, {
    duration: 15000,
    action: {
      label: `去下载`,
      onClick: () => window.open(RELEASES_PAGE, `_blank`),
    },
  })
}

export function scheduleUpdateCheck(): void {
  if (!isDesktopRuntime()) {
    return
  }

  try {
    const lastCheck = Number(localStorage.getItem(LAST_CHECK_KEY) || 0)
    if (Date.now() - lastCheck < CHECK_INTERVAL_MS) {
      return
    }
  }
  catch {
    return
  }

  window.setTimeout(() => {
    void checkOnce()
  }, STARTUP_DELAY_MS)
}
