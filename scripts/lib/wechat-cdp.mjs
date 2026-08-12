// 三个验证脚本共用的 Chrome DevTools Protocol 脚手架。
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

export function findChromeBinary() {
  const candidates = [
    process.env.CHROME_PATH,
    `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
    `/Applications/Chromium.app/Contents/MacOS/Chromium`,
  ].filter(Boolean)
  const found = candidates.find(item => existsSync(item))
  if (!found) {
    throw new Error(`未找到 Chrome，可通过 CHROME_PATH 指定`)
  }
  return found
}

export async function waitFor(fn, { timeout = 30000, interval = 250, label = `条件` } = {}) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    try {
      const value = await fn()
      if (value) {
        return value
      }
    }
    catch {
      // retry
    }
    await new Promise(done => setTimeout(done, interval))
  }
  throw new Error(`等待 ${label} 超时`)
}

export class CdpSession {
  constructor(socket) {
    this.socket = socket
    this.id = 0
    this.pending = new Map()
    socket.addEventListener(`message`, (event) => {
      const payload = JSON.parse(event.data)
      const entry = this.pending.get(payload.id)
      if (!entry) {
        return
      }
      this.pending.delete(payload.id)
      if (payload.error) {
        entry.reject(new Error(JSON.stringify(payload.error)))
        return
      }
      entry.resolve(payload.result)
    })
  }

  send(method, params = {}) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.socket.send(JSON.stringify({ id, method, params }))
    })
  }

  async evaluate(expression) {
    const result = await this.send(`Runtime.evaluate`, {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || JSON.stringify(result.exceptionDetails))
    }
    return result.result.value
  }
}

async function openSocket(url) {
  const socket = new WebSocket(url)
  await new Promise((resolve, reject) => {
    socket.addEventListener(`open`, resolve, { once: true })
    socket.addEventListener(`error`, reject, { once: true })
  })
  return socket
}

export async function launchPage({ port, profile, devUrl, readyExpression, readyLabel = `预览区渲染` }) {
  const chrome = spawn(findChromeBinary(), [
    `--headless=new`,
    `--disable-gpu`,
    `--no-first-run`,
    `--no-default-browser-check`,
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${port}`,
    `about:blank`,
  ], { stdio: `ignore` })

  const dispose = () => {
    try {
      chrome.kill()
    }
    catch {
      // ignore
    }
  }

  try {
    const version = await waitFor(async () => {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`)
      return response.ok ? response.json() : null
    }, { label: `Chrome 启动` })

    const browser = new CdpSession(await openSocket(version.webSocketDebuggerUrl))
    const { targetId } = await browser.send(`Target.createTarget`, { url: `about:blank` })
    const target = await waitFor(async () => {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`)
      const list = await response.json()
      return list.find(item => item.id === targetId)
    }, { label: `页面 target` })

    const page = new CdpSession(await openSocket(target.webSocketDebuggerUrl))
    await page.send(`Runtime.enable`)
    await page.send(`Page.enable`)
    await page.send(`Page.navigate`, { url: devUrl })

    if (readyExpression) {
      await waitFor(() => page.evaluate(readyExpression), { timeout: 60000, label: readyLabel })
    }

    return { page, dispose }
  }
  catch (error) {
    dispose()
    throw error
  }
}
