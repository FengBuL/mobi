// 诊断图片排版模块（md-media-block）复制到公众号后的真实产物。
// 与 verify-wechat-image-copy.mjs 不同，这里注入的是 buildMediaLayoutMarkup 产出的真实结构，
// 会完整走 convertMediaLayoutsForWeChat 转换链路。
import { spawn } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const DEBUG_PORT = Number(process.env.MD_DEBUG_PORT || 9223)
const DEV_URL = process.env.MD_DEV_URL || `http://localhost:5173/md/`

function findChromeBinary() {
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

async function waitFor(fn, { timeout = 30000, interval = 250, label = `条件` } = {}) {
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

class CdpSession {
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
    return new Promise((resolve_, reject) => {
      this.pending.set(id, { resolve: resolve_, reject })
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

const PRESETS = (process.env.MD_PRESETS || `hero-image,duo-gallery,triptych-gallery,split-left,quad-grid,compare-pair,polaroid-single`)
  .split(`,`)
  .map(item => item.trim())
  .filter(Boolean)
const THEME = process.env.MD_THEME || `default`

// 没有等价兜底、一旦被剥掉就没救的声明。
// display:flex 不在其中：对真实公众号文章取样可以看到它活着穿过了过滤，
// 而且产物里每个 flex 容器都同时写了 inline-block 百分比宽的退路，
// 剥掉与否都能排成一行，几何验证交给 verify-wechat-layout.mjs。
const WECHAT_UNSUPPORTED = [
  { name: `display:grid`, pattern: /display\s*:\s*grid/i },
  { name: `gap`, pattern: /(?:^|;|\s)gap\s*:/i },
  { name: `aspect-ratio`, pattern: /aspect-ratio\s*:/i },
  { name: `position`, pattern: /(?:^|;|\s)position\s*:/i },
  { name: `逻辑属性`, pattern: /(?:margin|padding|inset)-(?:block|inline)/i },
  { name: `var() 残留`, pattern: /var\(--/i },
  { name: `color-mix()`, pattern: /color-mix\(/i },
  { name: `CSS 自定义属性`, pattern: /(?:^|;)\s*--[a-z0-9-]+\s*:/i },
  { name: `grid-template`, pattern: /grid-template/i },
]

async function main() {
  const chrome = spawn(findChromeBinary(), [
    `--headless=new`,
    `--disable-gpu`,
    `--no-first-run`,
    `--no-default-browser-check`,
    `--user-data-dir=/tmp/md-media-layout-profile`,
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
    const target = await waitFor(async () => {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)
      const list = await response.json()
      return list.find(item => item.id === targetId)
    }, { label: `页面 target` })

    const pageSocket = new WebSocket(target.webSocketDebuggerUrl)
    await new Promise((res, rej) => {
      pageSocket.addEventListener(`open`, res, { once: true })
      pageSocket.addEventListener(`error`, rej, { once: true })
    })

    const page = new CdpSession(pageSocket)
    await page.send(`Runtime.enable`)
    await page.send(`Page.enable`)
    await page.send(`Page.navigate`, { url: DEV_URL })

    await waitFor(
      () => page.evaluate(`!!(document.querySelector('#md-theme') && document.querySelector('#output'))`),
      { timeout: 60000, label: `预览区渲染` },
    )

    const corePath = `/md/@fs${resolve(process.cwd(), `packages/core/src/index.ts`)}`

    // 应用的渲染管线是异步的，刚注入的 markup 会被默认示例文档覆盖回去。
    // 不等 #output 稳定，第一个被测预设量到的就是示例文档而不是产物。
    await page.evaluate(`new Promise((done) => {
      const output = document.querySelector('#output')
      let last = output.innerHTML.length
      let stableSince = Date.now()
      const timer = setInterval(() => {
        const now = output.innerHTML.length
        if (now !== last) { last = now; stableSince = Date.now(); return }
        if (Date.now() - stableSince >= 700) { clearInterval(timer); done(true) }
      }, 60)
    })`)

    const runPreset = presetId => page.evaluate(`(async () => {
      const layouts = await import(${JSON.stringify(`/md/src/utils/image-layouts.ts`)})
      const utils = await import(${JSON.stringify(`/md/src/utils/index.ts`)})
      const core = await import(${JSON.stringify(corePath)})
      const output = document.querySelector('#output')

      await core.applyTheme({
        themeName: ${JSON.stringify(THEME)},
        variables: { primaryColor: '#16a34a', fontFamily: 'Optima-Regular, sans-serif', fontSize: '15px' },
      })

      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#4f46e5"/></svg>'
      const img = 'data:image/svg+xml;base64,' + btoa(svg)

      const preset = layouts.mediaLayoutPresets.find(p => p.id === ${JSON.stringify(presetId)})
      if (!preset) return { error: 'preset not found: ' + ${JSON.stringify(presetId)} }

      const form = layouts.createDefaultMediaLayoutState()
      while (form.images.length < preset.slotCount) form.images.push(JSON.parse(JSON.stringify(form.images[0])))
      form.images = form.images.map((s, i) => Object.assign({}, s, { url: img, alt: '图' + (i + 1), caption: '图注' + (i + 1) }))

      const markup = layouts.buildMediaLayoutMarkup(preset, form)
      output.innerHTML = '<section class="container"><p class="paragraph">前面正文</p>' + markup + '<p class="paragraph">后面正文</p></section>'

      await Promise.all(Array.from(output.querySelectorAll('img')).map(image => (
        image.complete && image.naturalWidth
          ? null
          : new Promise((done) => {
              image.addEventListener('load', done, { once: true })
              image.addEventListener('error', done, { once: true })
            })
      )))
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

      const before = output.innerHTML
      await utils.processClipboardContent('#16a34a')
      const after = output.innerHTML

      const holder = document.createElement('div')
      holder.innerHTML = after
      const styles = Array.from(holder.querySelectorAll('[style]')).map(n => n.getAttribute('style'))

      // 并排 inline-block 之间的空白文本节点会各撑出一个空格的宽度，
      // 两个 50% 的列因此超过 100% 换行掉下去——这在 Chrome 里看不出来
      let blankBetweenColumns = 0
      holder.querySelectorAll('*').forEach((parent) => {
        const kids = Array.from(parent.childNodes)
        const columns = kids.filter(kid => kid.nodeType === 1 && /display\\s*:\\s*inline-block/i.test(kid.getAttribute('style') || ''))
        if (columns.length < 2) return
        blankBetweenColumns += kids.filter(kid => kid.nodeType === 3 && kid.nodeValue.length && !kid.nodeValue.trim()).length
      })

      return {
        slotCount: preset.slotCount,
        presetName: preset.name,
        before,
        after,
        styles,
        imgCount: holder.querySelectorAll('img').length,
        stillHasMediaBlockClass: /class="[^"]*md-media-/.test(after),
        hasTable: /<table/i.test(after),
        // 公众号编辑器不接受表格单元格里的图片，粘贴后这些图会被丢掉
        imgInsideTable: holder.querySelectorAll('table img, td img, th img').length,
        blankBetweenColumns,
      }
    })()`)

    const failures = []
    const report = {}

    for (const presetId of PRESETS) {
      const result = await runPreset(presetId)
      if (result.error) {
        console.log(`\n######## ${presetId}：${result.error}`)
        failures.push(`${presetId}: ${result.error}`)
        continue
      }

      const joined = result.styles.join(` ; `)
      const hits = WECHAT_UNSUPPORTED.filter(rule => rule.pattern.test(joined))

      console.log(`\n######## ${presetId}（${result.presetName}，${result.slotCount} 图）`)
      console.log(`img 数量 = ${result.imgCount} / 期望 ${result.slotCount}`)
      console.log(`仍带 md-media-* class = ${result.stillHasMediaBlockClass}`)
      console.log(`使用 table 布局 = ${result.hasTable}`)
      console.log(`表格里的图片 = ${result.imgInsideTable}`)
      console.log(`并排列之间的空白文本节点 = ${result.blankBetweenColumns}`)

      if (result.imgInsideTable) {
        console.log(`!!! 有 ${result.imgInsideTable} 张图在表格单元格里，公众号粘贴后会丢图`)
        failures.push(`${presetId}: 表格里有 ${result.imgInsideTable} 张图`)
      }

      if (result.blankBetweenColumns) {
        console.log(`!!! 并排列之间有 ${result.blankBetweenColumns} 个空白文本节点，会把列挤换行`)
        failures.push(`${presetId}: 列间空白 ${result.blankBetweenColumns} 处`)
      }

      if (hits.length) {
        console.log(`\n!!! 微信不兼容属性命中 ${hits.length} 项：`)
        for (const hit of hits) {
          const sample = result.styles.find(s => hit.pattern.test(s))
          console.log(`  - ${hit.name}`)
          console.log(`    样例: ${String(sample).slice(0, 200)}`)
        }
        failures.push(`${presetId}: ${hits.map(h => h.name).join(`, `)}`)
      }
      else {
        console.log(`微信兼容性检查通过`)
      }

      if (result.imgCount !== result.slotCount) {
        console.log(`!!! 图片数量不符：产物 ${result.imgCount}，期望 ${result.slotCount}`)
        failures.push(`${presetId}: img ${result.imgCount} != ${result.slotCount}`)
      }

      report[presetId] = result
    }

    writeFileSync(`/tmp/media-layout-copy-report.json`, JSON.stringify(report, null, 2))
    console.log(`\n完整产物已写入 /tmp/media-layout-copy-report.json`)

    console.log(`\n=== 总结论 ===`)
    if (failures.length) {
      console.log(`失败 ${failures.length} 项：`)
      failures.forEach(item => console.log(`  - ${item}`))
      process.exitCode = 1
      return
    }
    console.log(`全部预设通过（${PRESETS.join(`, `)}）`)
  }
  finally {
    cleanup()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
