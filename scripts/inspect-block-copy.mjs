import { spawn } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'

const port = Number(process.env.MD_DEBUG_PORT || 9231)
const url = process.env.MD_DEV_URL || `http://localhost:5173/md/`
const chromePath = [
  process.env.CHROME_PATH,
  `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
  `/Applications/Chromium.app/Contents/MacOS/Chromium`,
].filter(Boolean).find(existsSync)

if (!chromePath) {
  throw new Error(`未找到 Chrome`)
}

function waitFor(fn, timeout = 60000) {
  const deadline = Date.now() + timeout
  return new Promise((resolve, reject) => {
    const run = async () => {
      try {
        const value = await fn()
        if (value) {
          resolve(value)
          return
        }
      }
      catch {}
      if (Date.now() >= deadline) {
        reject(new Error(`等待超时`))
        return
      }
      setTimeout(run, 200)
    }
    run()
  })
}

class Session {
  constructor(socket) {
    this.socket = socket
    this.sequence = 0
    this.pending = new Map()
    socket.addEventListener(`message`, (event) => {
      const payload = JSON.parse(event.data)
      const pending = this.pending.get(payload.id)
      if (!pending) {
        return
      }
      this.pending.delete(payload.id)
      payload.error ? pending.reject(new Error(JSON.stringify(payload.error))) : pending.resolve(payload.result)
    })
  }

  send(method, params = {}) {
    const id = ++this.sequence
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.socket.send(JSON.stringify({ id, method, params }))
    })
  }

  async evaluate(expression) {
    const response = await this.send(`Runtime.evaluate`, {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description || `页面执行失败`)
    }
    return response.result.value
  }
}

async function connect(socketUrl) {
  const socket = new WebSocket(socketUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener(`open`, resolve, { once: true })
    socket.addEventListener(`error`, reject, { once: true })
  })
  return new Session(socket)
}

const chrome = spawn(chromePath, [
  `--headless=new`,
  `--disable-gpu`,
  `--no-first-run`,
  `--no-default-browser-check`,
  `--user-data-dir=/tmp/md-block-copy-profile`,
  `--remote-debugging-port=${port}`,
  `about:blank`,
], { stdio: `ignore` })

try {
  const version = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`)
    return response.ok ? response.json() : null
  })
  const browser = await connect(version.webSocketDebuggerUrl)
  const { targetId } = await browser.send(`Target.createTarget`, { url })
  const target = await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${port}/json/list`)
    return (await response.json()).find(item => item.id === targetId)
  })
  const page = await connect(target.webSocketDebuggerUrl)
  await page.send(`Runtime.enable`)
  await page.evaluate(`new Promise(resolve => {
    const timer = setInterval(() => {
      if (document.querySelector('#output')) {
        clearInterval(timer)
        resolve(true)
      }
    }, 100)
  })`)

  const result = await page.evaluate(`(async () => {
    const registry = await import('/md/src/utils/blocks/registry.ts')
    const utils = await import('/md/src/utils/index.ts')
    const failures = []
    const categories = []
    const forbidden = [
      ['position', /(?:^|[;"])\\s*position\\s*:/i],
      ['display:grid', /display\\s*:\\s*grid/i],
      ['gap', /(?:^|;)\\s*gap\\s*:/i],
      ['aspect-ratio', /aspect-ratio\\s*:/i],
      ['logical', /(?:margin|padding|inset)-(?:block|inline)/i],
      ['data-src', /\\bdata-src-(?:kind|ordinal)\\s*=/i],
      // 表格套图会被公众号编辑器丢弃，多列必须走 inline-block
      ['table', /<table/i],
    ]
    for (const category of registry.blockCategories) {
      const reports = []
      for (const preset of category.presets) {
        const state = category.createDefaultState(preset)
        const markup = category.build(preset, state)
        const parsed = category.parse(markup)
        const roundtrip = parsed
          && Object.keys(state).every(key => String(parsed.state[key] ?? '') === String(state[key] ?? ''))
        if (!roundtrip) {
          failures.push(preset.id + ': parse roundtrip')
        }
        const output = document.querySelector('#output')
        output.innerHTML = '<h2 data-src-kind="heading-2" data-src-ordinal="1">定位属性</h2>' + markup
        await utils.processClipboardContent('#16a34a')
        const after = output.innerHTML
        const hits = forbidden.filter(([, pattern]) => pattern.test(after)).map(([name]) => name)
        if (/md-block/.test(after)) hits.push('md-block class')
        if (!roundtrip) hits.push('roundtrip')
        if (hits.length && !failures.includes(preset.id + ': ' + hits.join(', '))) {
          failures.push(preset.id + ': ' + hits.join(', '))
        }
        reports.push({ id: preset.id, name: preset.name, hits })
      }
      categories.push({ id: category.id, name: category.name, count: category.presets.length, reports })
    }
    return { categories, failures }
  })()`)

  const sourceMapping = await page.evaluate(`(async () => {
    const { resolveMarkdownSourceRange } = await import('/md/src/utils/blocks/source-selection.ts')
    const markdown = [
      '---',
      'title: 定位测试',
      '---',
      '',
      '## 重复标题',
      '',
      '> 第一行',
      '> 第二行',
      '',
      '## 重复标题',
      '',
      '- 一级 A',
      '  - 二级 B',
      '- 一级 C',
      '',
      '---',
      '',
      '结尾',
    ].join('\\n')
    const cases = [
      ['heading-2', 1, '## 重复标题'],
      ['heading-2', 2, '## 重复标题'],
      ['quote', 1, '> 第一行\\n> 第二行'],
      ['list-ul', 1, '- 一级 A\\n  - 二级 B\\n- 一级 C'],
      ['divider', 1, '---'],
    ]
    const reports = cases.map(([kind, ordinal, expected]) => {
      const range = resolveMarkdownSourceRange(markdown, kind, ordinal)
      const actual = range ? markdown.slice(range.from, range.to).trimEnd() : ''
      return { kind, ordinal, expected, actual, ok: actual === expected }
    })
    return { reports, failures: reports.filter(item => !item.ok) }
  })()`)

  let total = 0
  result.categories.forEach((category) => {
    total += category.count
    const bad = category.reports.filter(report => report.hits.length)
    console.log(`\n【${category.name}】${category.id}　预设 ${category.count}　失败 ${bad.length}`)
    bad.forEach(report => console.log(`  ✗ ${report.id} ${report.name}：${report.hits.join(`, `)}`))
  })

  console.log(`\n类别 ${result.categories.length}　预设合计 ${total}　失败 ${result.failures.length}`)
  sourceMapping.reports.forEach((report) => {
    console.log(`${report.ok ? `✓` : `✗`} 源码映射 ${report.kind} #${report.ordinal}`)
  })
  const thin = result.categories.filter(category => category.count < 20)
  if (thin.length) {
    thin.forEach(category => console.error(`${category.id} 只有 ${category.count} 个预设，不足 20`))
  }
  if (result.failures.length || thin.length || sourceMapping.failures.length) {
    process.exitCode = 1
  }
  else {
    console.log(`全部板块复制转换通过`)
  }

  await page.evaluate(`(async () => {
    const registry = await import('/md/src/utils/blocks/registry.ts')
    const category = registry.blockCategories.find(item => item.id === 'heading')
    document.documentElement.style.background = '#e9ecef'
    document.body.innerHTML = '<main id="gallery" style="width:1200px;padding:28px;background:#e9ecef;box-sizing:border-box;"></main>'
    const gallery = document.querySelector('#gallery')
    gallery.innerHTML = '<h1 style="margin:0 0 22px;font:800 26px sans-serif;color:#111;">标题板块视觉总览</h1>' +
      '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:18px;">' +
      category.presets.map((preset) => {
        const state = category.createDefaultState(preset)
        return '<article style="padding:18px;border:1px solid #d9dde3;border-radius:18px;background:#fff;box-sizing:border-box;">' +
          '<p style="margin:0 0 4px;font:700 14px sans-serif;color:#111;">' + preset.name + '</p>' +
          '<p style="margin:0 0 12px;font:12px sans-serif;color:#777;">' + preset.description + '</p>' +
          category.build(preset, state) + '</article>'
      }).join('') + '</div>'
    return gallery.scrollHeight
  })()`)
  const screenshot = await page.send(`Page.captureScreenshot`, {
    format: `png`,
    captureBeyondViewport: true,
    fromSurface: true,
  })
  writeFileSync(`/tmp/block-heading-gallery.png`, Buffer.from(screenshot.data, `base64`))
  console.log(`视觉总览：/tmp/block-heading-gallery.png`)
}
finally {
  chrome.kill()
}
