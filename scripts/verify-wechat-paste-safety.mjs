/**
 * 模拟公众号后台的粘贴过滤，检查复制产物在被剥掉非白名单属性后是否还能正常排版。
 *
 * 公众号会移除 position / transform / float / overflow / display:flex|grid /
 * aspect-ratio / object-fit / 逻辑属性 / 自定义属性等声明，只保留白名单内联样式。
 * 本脚本对每个图文预设跑一遍真实的 processClipboardContent，然后：
 *   1. 静态检查产物里是否还残留会被剥掉的关键布局属性；
 *   2. 按公众号规则过滤后在 375px 宽的容器里真实渲染，测量图片盒子是否塌陷、
 *      是否互相重叠、是否出现无内容的巨大空隙。
 *
 * 依赖本地 dev server（默认 http://localhost:5173/mobi/）。
 * 运行：node scripts/verify-wechat-paste-safety.mjs
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'

const DEV_URL = process.env.MOBI_DEV_URL || `http://localhost:5173/mobi/`
const DEBUG_PORT = Number(process.env.MD_CDP_PORT || 9344)

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

function sampleImage(width, height, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="${color}"/></svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString(`base64`)}`
}

const SAMPLES = [
  sampleImage(800, 500, `#4f46e5`),
  sampleImage(500, 800, `#059669`),
  sampleImage(600, 600, `#dc2626`),
  sampleImage(900, 400, `#d97706`),
]

const THEME = process.env.MD_THEME || `aurora`

async function main() {
  const chrome = spawn(findChromeBinary(), [
    `--headless=new`,
    `--disable-gpu`,
    `--no-first-run`,
    `--no-default-browser-check`,
    `--user-data-dir=/tmp/md-wechat-paste-safety-profile`,
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
      () => page.evaluate(`!!(document.querySelector('#md-theme') && document.querySelector('#output'))`),
      { timeout: 60000, label: `预览区渲染` },
    )

    const corePath = `/mobi/@fs${resolve(process.cwd(), `packages/core/src/index.ts`)}`

    const bootstrap = `(async () => {
      const utils = await import('/mobi/src/utils/index.ts')
      const layouts = await import('/mobi/src/utils/image-layouts.ts')
      const core = await import(${JSON.stringify(corePath)})
      const samples = ${JSON.stringify(SAMPLES)}

      window.__mdApplyTheme = themeName => core.applyTheme({
        themeName,
        variables: { primaryColor: '#16a34a', fontFamily: 'Optima-Regular, sans-serif', fontSize: '15px' },
      })
      await window.__mdApplyTheme(${JSON.stringify(THEME)})

      // 渲染模拟用的「最坏情况」剥离表：把所有拿不准的声明一次剥光再量几何。
      // 注意这比公众号的真实行为更狠——对已发布文章取样可以看到 float、overflow、
      // transform、display:flex 其实都活了下来，只有 position 确实没了。
      // 这里保持悲观是为了让量到的布局是下限，不是为了断言微信一定会剥。
      const FORBIDDEN = /^(position|top|right|bottom|left|z-index|transform|float|clear|overflow|overflow-x|overflow-y|aspect-ratio|object-fit|gap|row-gap|column-gap|flex|flex-flow|flex-direction|flex-wrap|justify-content|align-items|align-self|animation|transition|filter|backdrop-filter|clip-path|mix-blend-mode|background-clip|-webkit-background-clip|-webkit-text-fill-color|-webkit-overflow-scrolling|overscroll-behavior|writing-mode)$/i

      function isStripped(prop, value) {
        if (FORBIDDEN.test(prop)) return true
        if (prop.startsWith('--')) return true
        if (/^(margin|padding|inset|border)-(block|inline)/.test(prop)) return true
        if (prop === 'inset') return true
        if (prop === 'display' && /flex|grid/.test(value)) return true
        return false
      }

      // 被剥掉也不影响观感的声明：都有等价的白名单属性兜底，
      // 留着是为了 Word / 其他平台，不该算作产物缺陷。
      //
      // flex 一族在这里被当作增强项：对真实公众号文章取样可以看到
      // display:flex / flex-flow 活着穿过了过滤，而且多列产物同时写了
      // inline-block 百分比宽的退路，上面的 FORBIDDEN 会把 flex 全剥掉再渲染，
      // 下面量到的几何就是「微信最坏情况」下的真实结果。
      const BENIGN = /^(-webkit-text-fill-color|box-sizing|-webkit-overflow-scrolling|overscroll-behavior|flex|flex-flow|flex-direction|flex-wrap|justify-content|align-items|align-self|word-spacing)$/i

      window.__mdWeChatFilter = function (html) {
        const holder = document.createElement('div')
        holder.innerHTML = html
        holder.querySelectorAll('*').forEach((el) => {
          el.removeAttribute('class')
          el.removeAttribute('id')
          const style = el.getAttribute('style')
          if (!style) return
          const kept = style.split(';').map(s => s.trim()).filter(Boolean).filter((decl) => {
            const idx = decl.indexOf(':')
            if (idx < 0) return false
            return !isStripped(decl.slice(0, idx).trim().toLowerCase(), decl.slice(idx + 1).trim().toLowerCase())
          })
          if (kept.length) el.setAttribute('style', kept.join('; '))
          else el.removeAttribute('style')
        })
        return holder.innerHTML
      }

      window.__mdScanStripped = function (html) {
        const holder = document.createElement('div')
        holder.innerHTML = html
        const hits = []
        holder.querySelectorAll('[style]').forEach((el) => {
          el.getAttribute('style').split(';').map(s => s.trim()).filter(Boolean).forEach((decl) => {
            const idx = decl.indexOf(':')
            if (idx < 0) return
            const prop = decl.slice(0, idx).trim().toLowerCase()
            const value = decl.slice(idx + 1).trim().toLowerCase()
            // display:flex 有 inline-block 退路，剥掉也排得成一行，不算缺陷；
            // display:grid 没有退路，仍然要报出来
            if (prop === 'display' && value.includes('flex')) return
            if (isStripped(prop, value) && !BENIGN.test(prop)) hits.push(prop + ':' + value)
          })
        })
        return hits
      }

      window.__mdPresets = layouts.mediaLayoutPresets.map(p => p.id)
      window.__mdRunPreset = async function (presetId) {
        const preset = layouts.mediaLayoutPresets.find(p => p.id === presetId)
        const form = layouts.createDefaultMediaLayoutState()
        form.presetId = presetId
        form.images.forEach((slot, index) => {
          slot.url = samples[index % samples.length]
          slot.alt = '示意图' + (index + 1)
          slot.caption = '图注' + (index + 1)
        })

        const output = document.querySelector('#output')
        // 主题里的标题选择器是 "#output section h1"，必须复刻渲染器的 section 包裹
        output.innerHTML = '<section class="container">'
          + '<h1 class="h1"><span class="content">渐变标题测试</span></h1>'
          + '<p class="paragraph">模块前的一段正文。</p>'
          + layouts.buildMediaLayoutMarkup(preset, form)
          + '<p class="paragraph">模块后的一段正文。</p>'
          + '</section>'

        await Promise.all(Array.from(output.querySelectorAll('img')).map(image => (
          image.complete && image.naturalWidth
            ? null
            : new Promise((done) => {
                image.addEventListener('load', done, { once: true })
                image.addEventListener('error', done, { once: true })
              })
        )))

        await utils.processClipboardContent('#16a34a')
        const after = output.innerHTML

        // 按公众号规则过滤后，在 375px 手机宽度下真实渲染并测量
        const stage = document.createElement('div')
        // 白底模拟公众号编辑器画布，便于发现浅色字压白底的隐形文字
        stage.style.cssText = 'position:fixed; left:-9999px; top:0; width:375px; background:#ffffff; color:#000000;'
        stage.innerHTML = window.__mdWeChatFilter(after)
        document.body.appendChild(stage)

        await Promise.all(Array.from(stage.querySelectorAll('img')).map(image => (
          image.complete && image.naturalWidth
            ? null
            : new Promise((done) => {
                image.addEventListener('load', done, { once: true })
                image.addEventListener('error', done, { once: true })
              })
        )))

        const stageRect = stage.getBoundingClientRect()
        const images = Array.from(stage.querySelectorAll('img')).map((image) => {
          const rect = image.getBoundingClientRect()
          return { w: Math.round(rect.width), h: Math.round(rect.height), x: Math.round(rect.left - stageRect.left), y: Math.round(rect.top - stageRect.top) }
        })

        // 无文字、无图片却撑出高度的元素 = 比例盒塌陷留下的空隙
        const phantoms = Array.from(stage.querySelectorAll('*')).filter((el) => {
          if (el.tagName === 'IMG' || el.querySelector('img')) return false
          if ((el.textContent || '').trim()) return false
          const rect = el.getBoundingClientRect()
          const style = window.getComputedStyle(el)
          const borders = [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth]
          const painted = style.backgroundColor !== 'rgba(0, 0, 0, 0)' || style.backgroundImage !== 'none' || borders.some(w => w !== '0px')
          return rect.height > 40 && !painted
        }).map(el => Math.round(el.getBoundingClientRect().height))

        // 只看复制产物自带的内联声明，避免继承页面（暗色模式）的字色造成误判
        const rawH1 = (after.match(/<h1[^>]*style="([^"]*)"/) || [])[1] || ''
        const declOf = (prop) => {
          const hit = rawH1.split(';').map(s => s.trim()).find(s => s.toLowerCase().startsWith(prop + ':'))
          return hit ? hit.slice(prop.length + 1).trim() : null
        }

        // 渐变背景必须配一个不透明的 background-color 兜底，
        // 否则公众号一旦没吃下 background-image 就会出现浅色字压白底
        const holder = document.createElement('div')
        holder.innerHTML = after
        const nakedGradients = Array.from(holder.querySelectorAll('[style*="gradient("]')).filter((el) => {
          if (!el.style.backgroundImage.includes('gradient(')) return false
          const bg = el.style.backgroundColor
          return !bg || /^transparent$/i.test(bg) || /rgba\\([^)]*,\\s*0(\\.0+)?\\s*\\)/i.test(bg)
        }).map(el => el.tagName.toLowerCase())

        // 在白底画布上量正文与标题的实际对比度，低于 3:1 基本就是看不清
        const parseRgb = (value) => {
          const nums = (value.match(/[\\d.]+/g) || []).map(Number)
          return nums.length >= 3 ? { r: nums[0], g: nums[1], b: nums[2], a: nums.length > 3 ? nums[3] : 1 } : null
        }
        const luminance = ({ r, g, b }) => {
          const channel = (v) => {
            const s = v / 255
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
          }
          return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
        }
        const effectiveBg = (el) => {
          let node = el
          while (node && node !== stage.parentNode) {
            const bg = parseRgb(window.getComputedStyle(node).backgroundColor)
            if (bg && bg.a > 0.5) return bg
            node = node.parentElement
          }
          return { r: 255, g: 255, b: 255, a: 1 }
        }
        const contrastOf = (el) => {
          const fg = parseRgb(window.getComputedStyle(el).color)
          if (!fg) return null
          const bg = effectiveBg(el)
          const l1 = luminance(fg)
          const l2 = luminance(bg)
          return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100
        }
        // 阈值定在 2.5：真正的隐形文字（深色主题丢底色那类）都在 1.0~1.3，
        // 2.5~3.0 之间的多是用户自选的强调色标签，或渐变被剥掉后的兜底纯色，属于可接受的降级。
        const lowContrast = Array.from(stage.querySelectorAll('h1, h2, h3, p')).filter((el) => {
          if (!(el.textContent || '').trim()) return false
          const ratio = contrastOf(el)
          return ratio !== null && ratio < 2.5
        }).map((el) => {
          const bg = effectiveBg(el)
          return el.tagName.toLowerCase() + '(' + contrastOf(el) + ':1 字=' + window.getComputedStyle(el).color
            + ' 底=rgb(' + bg.r + ',' + bg.g + ',' + bg.b + ') 文本=「' + (el.textContent || '').trim().slice(0, 12) + '」)'
        })

        const outputStyle = window.getComputedStyle(output)

        const result = {
          outputBg: outputStyle.backgroundColor,
          outputColor: outputStyle.color,
          headHtml: after.slice(0, 160),
          lowContrast,
          h1Contrast: stage.querySelector('h1') ? contrastOf(stage.querySelector('h1')) : null,
          nakedGradients,
          strippedHits: window.__mdScanStripped(after),
          images,
          phantoms,
          stageHeight: Math.round(stage.getBoundingClientRect().height),
          h1Color: declOf('color'),
          h1Fill: declOf('-webkit-text-fill-color'),
          h1Clip: declOf('background-clip') || declOf('-webkit-background-clip'),
          h1RawHtml: (after.match(/<h1[^>]*>/) || [null])[0],
          darkMode: document.documentElement.classList.contains('dark'),
        }

        stage.remove()
        return result
      }

      return window.__mdPresets
    })()`

    const presets = await page.evaluate(bootstrap)

    // MD_THEMES 给定主题列表时只跑一个预设，用来横扫所有主题的标题与渐变兜底
    const themeSweep = (process.env.MD_THEMES || ``).split(`,`).map(item => item.trim()).filter(Boolean)
    const cases = themeSweep.length
      ? themeSweep.map(theme => ({ theme, presetId: process.env.MD_PRESET || `hero-image`, label: theme }))
      : presets.map(presetId => ({ theme: null, presetId, label: presetId }))

    console.log(themeSweep.length
      ? `横扫 ${themeSweep.length} 套主题（预设 ${cases[0].presetId}）\n`
      : `共 ${presets.length} 个图文预设，主题 ${THEME}\n`)

    const allFailures = []

    for (const { theme, presetId, label } of cases) {
      if (theme) {
        await page.evaluate(`window.__mdApplyTheme(${JSON.stringify(theme)})`)
      }
      const report = await page.evaluate(`window.__mdRunPreset(${JSON.stringify(presetId)})`)
      const failures = []

      if (report.strippedHits.length) {
        const unique = [...new Set(report.strippedHits)]
        failures.push(`产物里仍有会被公众号剥掉的声明：${unique.slice(0, 6).join(` | `)}${unique.length > 6 ? ` …共 ${unique.length} 种` : ``}`)
      }
      if (!report.images.length) {
        failures.push(`过滤后一张图片都没有`)
      }
      report.images.forEach((box, index) => {
        if (box.h < 20 || box.w < 20) {
          failures.push(`第 ${index + 1} 张图过滤后塌陷为 ${box.w}x${box.h}`)
        }
        if (box.w > 380) {
          failures.push(`第 ${index + 1} 张图过滤后溢出栏宽：${box.w}px`)
        }
      })
      for (let i = 0; i < report.images.length; i++) {
        for (let j = i + 1; j < report.images.length; j++) {
          const a = report.images[i]
          const b = report.images[j]
          const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
          if (overlap) {
            failures.push(`第 ${i + 1} 张与第 ${j + 1} 张图过滤后重叠`)
          }
        }
      }
      if (report.phantoms.length) {
        failures.push(`过滤后出现无内容的空隙：${report.phantoms.join(`, `)}px`)
      }
      if (!report.h1Color) {
        failures.push(`h1 没有内联字色，粘贴后会继承公众号默认样式`)
      }
      if (report.h1Color && /rgba?\([^)]*,\s*0(\.0+)?\s*\)|transparent/.test(report.h1Color)) {
        failures.push(`h1 字色透明（${report.h1Color}），粘贴后标题会消失`)
      }
      if (report.h1Fill && /rgba?\([^)]*,\s*0(\.0+)?\s*\)|transparent/.test(report.h1Fill)) {
        failures.push(`h1 的 text-fill 透明（${report.h1Fill}），粘贴后标题会消失`)
      }
      if (report.lowContrast?.length) {
        failures.push(`白底画布上对比度过低（粘到公众号会看不清）：${[...new Set(report.lowContrast)].join(`, `)}`)
      }
      if (report.nakedGradients?.length) {
        failures.push(`渐变背景没有不透明兜底色：${[...new Set(report.nakedGradients)].join(`, `)}`)
      }
      if (report.h1Clip) {
        failures.push(`h1 仍依赖 background-clip:${report.h1Clip}，公众号会剥掉`)
      }

      if (process.env.MD_DUMP) {
        console.log(`  dark=${report.darkMode}  #output 底色=${report.outputBg} 字色=${report.outputColor}`)
        console.log(`  产物开头：${report.headHtml}`)
        console.log(`  复制产物里的 h1：${report.h1RawHtml}`)
        console.log(`  过滤后的 h1  ：${report.h1Html}`)
      }

      const boxes = report.images.map(box => `${box.w}x${box.h}@${box.x},${box.y}`).join(` `)
      console.log(`${failures.length ? `✗` : `✓`} ${label.padEnd(22)} 高 ${String(report.stageHeight).padStart(4)}px  h1 ${report.h1Color} 对比 ${report.h1Contrast}  图 ${boxes}`)
      failures.forEach((item) => {
        console.log(`    - ${item}`)
        allFailures.push(`[${label}] ${item}`)
      })
    }

    console.log(`\n=== 总结论 ===`)
    if (allFailures.length) {
      console.log(`未通过 ${allFailures.length} 项：\n${allFailures.map(item => `- ${item}`).join(`\n`)}`)
      process.exitCode = 1
      return
    }
    console.log(`全部 ${cases.length} 项在模拟公众号过滤后排版正常`)
  }
  finally {
    cleanup()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
