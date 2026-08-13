/**
 * 在真实 Chrome 里跑一遍「复制到公众号」链路，检查普通 Markdown 图片的产物。
 *
 * 依赖本地已在运行的 dev server（默认 http://localhost:5173/mobi/），
 * 通过 Vite 直接加载 apps/web/src/utils/index.ts，调用真实的 processClipboardContent。
 *
 * 运行：node scripts/verify-wechat-image-copy.mjs
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'

const DEV_URL = process.env.MOBI_DEV_URL || `http://localhost:5173/mobi/`
const DEBUG_PORT = Number(process.env.MD_CDP_PORT || 9333)

function findChromeBinary() {
  const candidates = [
    resolve(homedir(), `Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`),
    resolve(homedir(), `Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell`),
    `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
  ]
  const found = candidates.find(candidate => existsSync(candidate))
  if (!found) {
    throw new Error(`未找到可用的 Chrome 可执行文件`)
  }
  return found
}

async function waitFor(probe, { timeout = 20000, interval = 200, label = `条件` } = {}) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    try {
      const result = await probe()
      if (result) {
        return result
      }
    }
    catch {
      // 继续重试
    }
    await new Promise(done => setTimeout(done, interval))
  }
  throw new Error(`等待${label}超时`)
}

class CdpSession {
  constructor(socket) {
    this.socket = socket
    this.nextId = 1
    this.pending = new Map()
    socket.addEventListener(`message`, (event) => {
      const message = JSON.parse(event.data)
      const handler = this.pending.get(message.id)
      if (handler) {
        this.pending.delete(message.id)
        handler(message)
      }
    })
  }

  send(method, params = {}) {
    const id = this.nextId++
    this.socket.send(JSON.stringify({ id, method, params }))
    return new Promise((res, rej) => {
      this.pending.set(id, (message) => {
        if (message.error) {
          rej(new Error(`${method} 失败：${message.error.message}`))
          return
        }
        res(message.result)
      })
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

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#4f46e5"/></svg>`
const SAMPLE_IMAGE = `data:image/svg+xml;base64,${Buffer.from(SAMPLE_SVG).toString(`base64`)}`

// 与 renderWeChatFigureBox 产出的结构一致，用来确认新的样式归一化不会改写已有的公众号markup
const MEDIA_LAYOUT_MARKUP = `<section data-guard="media" style="display:inline-block; width:100%; max-width:100%; vertical-align:top; position:relative; box-sizing:border-box;"><section style="height:0; padding-top:56.25%; box-sizing:border-box;"></section></section>`

const SAMPLE_HTML = `<section class="container">
  <h2 class="h2" data-heading="true">小标题</h2>
  <p class="paragraph">前面的一段正文。</p>
  <figure><img src="${SAMPLE_IMAGE}" alt="示意图"/><figcaption class="figcaption">图注：示意图</figcaption></figure>
  <p class="paragraph">后面的一段正文。</p>
  <figure><img src="${SAMPLE_IMAGE}" alt="无图注的图"/></figure>
  <blockquote class="md-blockquote"><p class="md-blockquote-p">引用内容。</p></blockquote>
  <div class="markdown-alert markdown-alert-tip"><p class="alert-title alert-title-tip">提示</p><p class="alert-content">这是一条提示。</p></div>
  <ul class="ul"><li class="listitem">列表项一</li><li class="listitem">列表项二</li></ul>
  ${MEDIA_LAYOUT_MARKUP}
</section>`

const THEMES = (process.env.MD_THEMES || `default,tech,aurora,warm,business`).split(`,`).map(item => item.trim()).filter(Boolean)

async function main() {
  const chrome = spawn(findChromeBinary(), [
    `--headless=new`,
    `--disable-gpu`,
    `--no-first-run`,
    `--no-default-browser-check`,
    `--user-data-dir=/tmp/md-wechat-verify-profile`,
    `--remote-debugging-port=${DEBUG_PORT}`,
    `about:blank`,
  ], { stdio: `ignore` })

  const cleanup = () => {
    try {
      chrome.kill()
    }
    catch {
      // ignore
    }
  }

  try {
    const version = await waitFor(async () => {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)
      return response.ok ? response.json() : null
    }, { label: `Chrome 启动` })

    const socket = new WebSocket(version.webSocketDebuggerUrl)
    await new Promise((res, rej) => {
      socket.addEventListener(`open`, res, { once: true })
      socket.addEventListener(`error`, rej, { once: true })
    })

    const browser = new CdpSession(socket)
    const { targetId } = await browser.send(`Target.createTarget`, { url: `about:blank` })
    const targets = await waitFor(async () => {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)
      const list = await response.json()
      return list.find(item => item.id === targetId)
    }, { label: `页面 target` })

    const pageSocket = new WebSocket(targets.webSocketDebuggerUrl)
    await new Promise((res, rej) => {
      pageSocket.addEventListener(`open`, res, { once: true })
      pageSocket.addEventListener(`error`, rej, { once: true })
    })

    const page = new CdpSession(pageSocket)
    await page.send(`Runtime.enable`)
    await page.send(`Page.enable`)
    await page.send(`Page.navigate`, { url: DEV_URL })

    await waitFor(
      () => page.evaluate(`!!(document.querySelector('#md-theme') && document.querySelector('#output') && document.querySelector('#output').innerHTML.trim())`),
      { timeout: 60000, label: `预览区渲染` },
    )

    const corePath = `/mobi/@fs${resolve(process.cwd(), `packages/core/src/index.ts`)}`
    const runTheme = themeName => page.evaluate(`(async () => {
      const utils = await import(${JSON.stringify(`/mobi/src/utils/index.ts`)})
      const core = await import(${JSON.stringify(corePath)})
      const output = document.querySelector('#output')

      await core.applyTheme({
        themeName: ${JSON.stringify(themeName)},
        variables: { primaryColor: '#16a34a', fontFamily: 'Optima-Regular, sans-serif', fontSize: '15px' },
      })

      output.innerHTML = ${JSON.stringify(SAMPLE_HTML)}

      await Promise.all(Array.from(output.querySelectorAll('img')).map(image => (
        image.complete && image.naturalWidth
          ? null
          : new Promise((done) => {
              image.addEventListener('load', done, { once: true })
              image.addEventListener('error', done, { once: true })
            })
      )))

      const before = output.innerHTML
      const naturalSizeBefore = output.querySelector('img').naturalWidth + 'x' + output.querySelector('img').naturalHeight

      await utils.processClipboardContent('#16a34a')
      const after = output.innerHTML

      const holder = document.createElement('div')
      holder.innerHTML = after
      const joined = Array.from(holder.querySelectorAll('[style]')).map(node => node.getAttribute('style')).join(' ; ')
      const mediaGuard = holder.querySelector('[data-guard="media"]')

      return {
        naturalSizeBefore,
        mediaGuardStyle: mediaGuard ? mediaGuard.getAttribute('style') : null,
        mediaGuardInnerStyle: mediaGuard ? mediaGuard.querySelector('section').getAttribute('style') : null,
        before,
        after,
        leftoverVar: (joined.match(/var\\(--[a-z0-9-]+/gi) || []),
        leftoverColorMix: (joined.match(/color-mix\\(/gi) || []).length,
        leftoverLogical: (joined.match(/(?:margin|padding|inset)-(?:block|inline)[^:]*:/gi) || []),
        leftoverAspectRatio: (joined.match(/aspect-ratio\\s*:/gi) || []).length,
        leftoverCustomProps: (joined.match(/(?:^|;)\\s*--[a-z0-9-]+\\s*:/gi) || []).length,
        leftoverModernColor: (joined.match(/color\\(\\s*(?:srgb|display-p3|lab|oklab|oklch|lch)/gi) || []),
      }
    })()`)

    const allFailures = []

    for (const themeName of THEMES) {
      const report = await runTheme(themeName)
      const figureBefore = report.before.match(/<figure[\s\S]*?<\/figure>/)
      const figureAfter = report.after.match(/<section style="margin-top[\s\S]*?<\/section>/)

      console.log(`\n############ 主题：${themeName}（图片原始尺寸 ${report.naturalSizeBefore}）`)
      console.log(`\n--- 修复前（预览区原始结构）---`)
      console.log(figureBefore ? figureBefore[0].replace(/data:image\/svg\+xml;base64,[^"]+/g, `<data-uri>`) : `（未匹配）`)
      console.log(`\n--- 修复后（复制产物）---`)
      console.log((figureAfter ? figureAfter[0] : report.after).replace(/data:image\/svg\+xml;base64,[^"]+/g, `<data-uri>`))

      const failures = []
      if (report.leftoverVar.length) {
        failures.push(`仍有 var() 引用：${report.leftoverVar.join(`, `)}`)
      }
      if (report.leftoverColorMix) {
        failures.push(`仍有 color-mix()：${report.leftoverColorMix} 处`)
      }
      if (report.leftoverModernColor.length) {
        failures.push(`仍有现代颜色函数：${report.leftoverModernColor.join(`, `)}`)
      }
      if (report.leftoverLogical.length) {
        failures.push(`仍有逻辑属性：${report.leftoverLogical.join(`, `)}`)
      }
      if (report.leftoverAspectRatio) {
        failures.push(`仍有 aspect-ratio：${report.leftoverAspectRatio} 处`)
      }
      if (report.leftoverCustomProps) {
        failures.push(`仍有自定义属性声明：${report.leftoverCustomProps} 处`)
      }
      if (!figureAfter) {
        failures.push(`未生成 section 图片容器`)
      }
      if (/<figure|<figcaption/.test(report.after)) {
        failures.push(`产物里仍有 figure/figcaption 标签`)
      }
      const compact = value => (value || ``).replace(/\s+/gu, ``)
      const guardOuter = compact(report.mediaGuardStyle)
      const guardInner = compact(report.mediaGuardInnerStyle)
      const guardExpectations = [
        [guardOuter, `display:inline-block`],
        [guardOuter, `position:relative`],
        [guardOuter, `max-width:100%`],
        [guardInner, `padding-top:56.25%`],
        [guardInner, `height:0`],
      ]
      const guardMissing = guardExpectations.filter(([style, token]) => !style.includes(token)).map(([, token]) => token)
      if (guardMissing.length) {
        failures.push(`已有的图文模块内联结构被改写，缺少：${guardMissing.join(`, `)}`)
      }

      if (process.env.MD_DUMP) {
        console.log(`\n--- 完整复制产物 ---`)
        console.log(report.after.replace(/data:image\/svg\+xml;base64,[^"]+/g, `<data-uri>`))
      }

      console.log(`\n--- 残留检查 ---`)
      console.log(failures.length ? failures.map(item => `- ${item}`).join(`\n`) : `全部通过`)

      failures.forEach(item => allFailures.push(`[${themeName}] ${item}`))
    }

    console.log(`\n\n=== 总结论 ===`)
    if (allFailures.length) {
      console.log(`未通过：\n${allFailures.map(item => `- ${item}`).join(`\n`)}`)
      process.exitCode = 1
      return
    }
    console.log(`全部主题通过（${THEMES.join(`, `)}）`)
  }
  finally {
    cleanup()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
