import { spawn } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'

const port = Number(process.env.MD_DEBUG_PORT || 9232)
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
  `--user-data-dir=/tmp/md-block-selection-profile`,
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
  await page.send(`Emulation.setDeviceMetricsOverride`, {
    width: 1800,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await page.evaluate(`new Promise(resolve => {
    const timer = setInterval(() => {
      if (document.querySelector('#output') && document.querySelector('.cm-content')) {
        clearInterval(timer)
        resolve(true)
      }
    }, 100)
  })`)

  const result = await page.evaluate(`(async () => {
    const [{ useEditorStore }, { usePostStore }, { useRenderStore }, registry] = await Promise.all([
      import('/md/src/stores/editor.ts'),
      import('/md/src/stores/post.ts'),
      import('/md/src/stores/render.ts'),
      import('/md/src/utils/blocks/registry.ts'),
    ])
    const editorStore = useEditorStore()
    const postStore = usePostStore()
    const renderStore = useRenderStore()
    const title = '交互保留标题'
    const source = [
      '## ' + title,
      '',
      '> 第一行引用',
      '> 第二行引用',
      '',
      '- 一级 A',
      '  - 二级 B',
      '- 一级 C',
      '',
      '---',
      '',
      '结尾正文',
    ].join('\\n')
    editorStore.importContent(source)
    if (postStore.currentPost) {
      postStore.updatePostContent(postStore.currentPost.id, source)
    }
    renderStore.render(source)
    await new Promise(resolve => setTimeout(resolve, 200))

    const quote = document.querySelector('#output [data-src-kind="quote"]')
    quote?.click()
    await new Promise(resolve => setTimeout(resolve, 50))
    const quoteCategory = document.querySelector('.block-library-nav__item--active strong')?.textContent?.trim()
    const quoteValue = document.querySelector('#heading-block-quote')?.value

    const heading = document.querySelector('#output [data-src-kind="heading-2"]')
    heading?.click()
    await new Promise(resolve => setTimeout(resolve, 50))
    const headingCategory = document.querySelector('.block-library-nav__item--active strong')?.textContent?.trim()
    const selectedBefore = heading?.classList.contains('preview-block-selected')
    const headingValue = document.querySelector('#heading-block-title')?.value

    const presets = document.querySelectorAll('.heading-block-preset')
    presets[1]?.click()
    await new Promise(resolve => setTimeout(resolve, 200))
    const firstSource = editorStore.getContent()
    const firstBlocks = registry.parseBlockEntries(firstSource)
    const firstBlock = firstBlocks[0]
    const selectedAfter = document.querySelector('#output section.md-block')?.classList.contains('preview-block-selected')

    document.querySelectorAll('.heading-block-preset')[2]?.click()
    await new Promise(resolve => setTimeout(resolve, 200))
    const secondSource = editorStore.getContent()
    const secondBlocks = registry.parseBlockEntries(secondSource)
    const secondBlock = secondBlocks[0]

    document.querySelector('#output [data-src-kind="list-ul"]')?.click()
    await new Promise(resolve => setTimeout(resolve, 50))
    const listCategory = document.querySelector('.block-library-nav__item--active strong')?.textContent?.trim()
    const listItems = [1, 2, 3].map(index => document.querySelector('#heading-block-item' + index)?.value)

    document.querySelector('#output [data-src-kind="divider"]')?.click()
    await new Promise(resolve => setTimeout(resolve, 50))
    const dividerCategory = document.querySelector('.block-library-nav__item--active strong')?.textContent?.trim()

    const checks = {
      quoteCategory: quoteCategory === '引用',
      quoteContent: quoteValue === '第一行引用\\n第二行引用',
      headingCategory: headingCategory === '标题',
      selectedBefore,
      headingContent: headingValue === title,
      sourceReplaced: firstBlocks.length === 1 && !firstSource.includes('## ' + title),
      contentPreserved: firstBlock?.state.title === title,
      selectedAfter,
      repeatedInPlace: secondBlocks.length === 1 && secondBlock?.state.title === title,
      styleChanged: firstBlock?.presetId !== secondBlock?.presetId,
      boundariesPreserved: secondSource.includes('> 第一行引用') && secondSource.endsWith('结尾正文'),
      listCategory: listCategory === '列表',
      listContent: listItems.join('|') === '一级 A|二级 B|一级 C',
      dividerCategory: dividerCategory === '分隔',
    }
    return {
      checks,
      firstPreset: firstBlock?.presetId,
      secondPreset: secondBlock?.presetId,
      source: secondSource,
    }
  })()`)

  Object.entries(result.checks).forEach(([name, ok]) => {
    console.log(`${ok ? `✓` : `✗`} ${name}`)
  })
  console.log(`首次样式：${result.firstPreset}`)
  console.log(`再次样式：${result.secondPreset}`)

  const screenshot = await page.send(`Page.captureScreenshot`, {
    format: `png`,
    fromSurface: true,
  })
  writeFileSync(`/tmp/block-selection-interaction.png`, Buffer.from(screenshot.data, `base64`))
  console.log(`交互截图：/tmp/block-selection-interaction.png`)

  if (Object.values(result.checks).some(ok => !ok)) {
    process.exitCode = 1
  }
}
finally {
  chrome.kill()
}
