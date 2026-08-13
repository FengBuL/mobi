import path from 'node:path'
import { BrowserWindow, nativeTheme, shell } from 'electron'
import { APP_ORIGIN } from '../shared/scheme'
import { devServerUrl, isDev } from './env'

/** 和 index.html 里首屏 splash 的底色对齐，避免开窗那一下白闪 */
const BACKGROUND = { light: `#faf8f5`, dark: `#171514` }

function isExternalTarget(rawUrl: string): boolean {
  try {
    const { protocol } = new URL(rawUrl)
    return protocol === `http:` || protocol === `https:`
  }
  catch {
    return false
  }
}

function isInternalTarget(rawUrl: string): boolean {
  if (rawUrl.startsWith(APP_ORIGIN)) {
    return true
  }
  return Boolean(devServerUrl) && rawUrl.startsWith(new URL(devServerUrl).origin)
}

/**
 * 页面里的外链一律交给系统浏览器，窗口自己不做站外跳转。
 * 挂在 app 的 web-contents-created 上，新开的 webContents 也一并受约束。
 */
export function hardenWebContents(contents: Electron.WebContents): void {
  contents.setWindowOpenHandler(({ url }) => {
    if (isExternalTarget(url)) {
      void shell.openExternal(url)
    }
    return { action: `deny` }
  })

  contents.on(`will-navigate`, (event, url) => {
    if (isInternalTarget(url)) {
      return
    }

    event.preventDefault()
    if (isExternalTarget(url)) {
      void shell.openExternal(url)
    }
  })

  contents.on(`will-attach-webview`, (event) => {
    event.preventDefault()
  })
}

export function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    title: `墨笔`,
    backgroundColor: nativeTheme.shouldUseDarkColors ? BACKGROUND.dark : BACKGROUND.light,
    webPreferences: {
      preload: path.join(__dirname, `..`, `preload`, `index.cjs`),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
      spellcheck: false,
    },
  })

  window.once(`ready-to-show`, () => {
    window.show()
  })

  if (isDev && devServerUrl) {
    void window.loadURL(devServerUrl)
  }
  else {
    void window.loadURL(`${APP_ORIGIN}/index.html`)
  }

  return window
}
