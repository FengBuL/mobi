// 图文排版模块粘贴到公众号后的布局验证。
//
// 前两版脚本只检查「产物里有没有微信不认的属性」，那套模型漏掉了真正的杀手：
// 一份 `<table><td><img></td></table>` 不含任何非法属性，检查全过，
// 但公众号编辑器根本不接受表格单元格里的图片，粘进去图片就没了。
// 同样，元素之间的空白文本节点在 Chrome 里看不出问题，
// 却会给 inline-block 多列各加一个空格的宽度，把第二列挤下去。
//
// 这版改成三件事：
//   1. 结构硬规则：表格套图、列间空白、position、列宽超 100% 一律判失败；
//   2. 几何不变性：在「原样 / 剥掉 flex / 剥掉 flex+box-sizing 并重新缩进」三种
//      场景下分别真实渲染并测量，要求图片的分行结果完全一致；
//   3. 意图对齐：产物的分行结果要和转换前的预览一致。
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { launchPage } from './lib/wechat-cdp.mjs'

const DEBUG_PORT = Number(process.env.MD_DEBUG_PORT || 9224)
const DEV_URL = process.env.MOBI_DEV_URL || `http://localhost:5173/mobi/`
const THEME = process.env.MD_THEME || `default`
const STAGE_WIDTHS = (process.env.MD_STAGE_WIDTHS || `375,677`).split(`,`).map(Number)
// 公众号官方的文章结构校验接口，见「微信公众号文档 / 插件开发规范」。
// 实测这个接口只覆盖规范里点名的少数几条（比如 text-align:start），
// 表格套图、position 比例盒、line-height:0、inline-block 空白换行它都判 PASS，
// 所以它是必要条件不是充分条件，真正的判据是下面的几何测量。
const WECHAT_VERIFY_API = `https://mp.weixin.qq.com/article-bin/verify_article_structure`
const SKIP_REMOTE = process.env.MD_SKIP_REMOTE === `1`

async function verifyWithWeChat(html) {
  const response = await fetch(WECHAT_VERIFY_API, {
    method: `POST`,
    headers: {
      'Content-Type': `application/json`,
      'User-Agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36`,
    },
    body: JSON.stringify({ content: html }),
    signal: AbortSignal.timeout(20000),
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.json()
}

function describeWeChatVerdict(verdict) {
  if (verdict.isValid) {
    return []
  }
  const info = verdict.inValidInfo
  if (!info || !Object.keys(info).length) {
    return [`接口返回 isValid=false 但没有给出细节：${JSON.stringify(verdict).slice(0, 200)}`]
  }
  return Object.entries(info).map(([key, value]) => {
    const sample = (value.items || [])[0]?.outerHTML || ``
    return `${key}：${value.violateRules || value.rules || `未说明`}${sample ? ` | 样例 ${sample.replace(/\s+/g, ` `).slice(0, 160)}` : ``}`
  })
}

const BROWSER_HELPERS = `
window.__wxStrip = function (html, props) {
  const holder = document.createElement('div')
  holder.innerHTML = html
  holder.querySelectorAll('[style]').forEach(function (el) {
    const kept = el.getAttribute('style').split(';').map(function (s) { return s.trim() }).filter(Boolean)
      .filter(function (decl) {
        const idx = decl.indexOf(':')
        if (idx < 0) return false
        const prop = decl.slice(0, idx).trim().toLowerCase()
        return props.indexOf(prop) < 0
      })
    if (kept.length) el.setAttribute('style', kept.join('; '))
    else el.removeAttribute('style')
  })
  holder.querySelectorAll('*').forEach(function (el) {
    el.removeAttribute('class')
    el.removeAttribute('id')
  })
  return holder.innerHTML
}

// 模拟一个会把 DOM 重新缩进输出的编辑器：每个元素之间塞回换行和缩进。
// 这是 inline-block 多列最容易踩的雷，产物必须自己扛住。
window.__wxReindent = function (html) {
  const holder = document.createElement('div')
  holder.innerHTML = html
  const walk = function (node, depth) {
    const kids = Array.prototype.slice.call(node.childNodes)
    kids.forEach(function (kid) {
      if (kid.nodeType === 1) walk(kid, depth + 1)
    })
    if (!kids.length) return
    if (node.tagName === 'P' || node.tagName === 'SPAN' || node.tagName === 'A' || node.tagName === 'STRONG') return
    const onlyElements = kids.every(function (kid) { return kid.nodeType === 1 })
    if (!onlyElements) return
    kids.forEach(function (kid) {
      node.insertBefore(document.createTextNode('\\n' + '  '.repeat(depth + 1)), kid)
    })
    node.appendChild(document.createTextNode('\\n' + '  '.repeat(depth)))
  }
  walk(holder, 0)
  return holder.innerHTML
}

// 真实取样表明 display:inline-block 能活着穿过公众号，display:flex 未必，
// 因此只把 flex / grid 当作可能被剥掉的增强项。
const FLEX_PROPS = ['flex', 'flex-flow', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-self', 'gap']

window.__wxDropFlex = function (html, extraProps) {
  const drop = FLEX_PROPS.concat(extraProps || [])
  const holder = document.createElement('div')
  holder.innerHTML = html
  holder.querySelectorAll('[style]').forEach(function (el) {
    const kept = el.getAttribute('style').split(';').map(function (s) { return s.trim() }).filter(Boolean)
      .filter(function (decl) {
        const idx = decl.indexOf(':')
        if (idx < 0) return false
        const prop = decl.slice(0, idx).trim().toLowerCase()
        const value = decl.slice(idx + 1).trim().toLowerCase()
        if (prop === 'display') return !/flex|grid/.test(value)
        return drop.indexOf(prop) < 0
      })
    if (kept.length) el.setAttribute('style', kept.join('; '))
    else el.removeAttribute('style')
  })
  holder.querySelectorAll('*').forEach(function (el) {
    el.removeAttribute('class')
    el.removeAttribute('id')
  })
  return holder.innerHTML
}

window.__wxScenario = function (html, name) {
  if (name === 'raw') return html
  if (name === 'noflex') return window.__wxDropFlex(html)
  // 只剥 overflow 的长写法，保留 overflow 简写。
  // 真实公众号文章的 DOM 里 overflow:hidden 是活着的，所以「简写留下、长写法被剥」
  // 才是限高滚动视窗最现实的降级场景，也是唯一一种会让长图盖住后文的场景。
  if (name === 'nooverflow') return window.__wxStrip(html, ['overflow-x', 'overflow-y'])
  // harsh：flex 没了，font-size:0 这层空白护栏也没了，box-sizing / max-width 全丢，
  // 而且整棵 DOM 被重新缩进——只剩「产物自己不带空白 + 列宽留了余量」在兜底
  return window.__wxReindent(
    window.__wxDropFlex(html, ['box-sizing', 'max-width', 'font-size', 'line-height', 'letter-spacing', 'word-spacing']),
  )
}

window.__wxMeasureElement = async function (stage) {
  await Promise.all(Array.prototype.slice.call(stage.querySelectorAll('img')).map(function (image) {
    return (image.complete && image.naturalWidth)
      ? null
      : new Promise(function (done) {
          image.addEventListener('load', done, { once: true })
          image.addEventListener('error', done, { once: true })
        })
  }))
  await new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r) }) })

  const base = stage.getBoundingClientRect()
  const rects = Array.prototype.slice.call(stage.querySelectorAll('img')).map(function (image) {
    const r = image.getBoundingClientRect()
    return {
      x: Math.round((r.left - base.left) * 100) / 100,
      y: Math.round((r.top - base.top) * 100) / 100,
      w: Math.round(r.width * 100) / 100,
      h: Math.round(r.height * 100) / 100,
    }
  })

  // 竖直方向有重叠的图片算同一行
  const rows = []
  rects.slice().sort(function (a, b) { return a.y - b.y || a.x - b.x }).forEach(function (rect) {
    const row = rows.find(function (item) {
      return Math.min(item.bottom, rect.y + rect.h) - Math.max(item.top, rect.y) > Math.min(item.height, rect.h) * 0.5
    })
    if (row) {
      row.count += 1
      row.top = Math.min(row.top, rect.y)
      row.bottom = Math.max(row.bottom, rect.y + rect.h)
      row.height = row.bottom - row.top
      return
    }
    rows.push({ count: 1, top: rect.y, bottom: rect.y + rect.h, height: rect.h })
  })

  // 只量真正参与布局的元素：style / script 这类没有盒子的节点 rect 全是 0，
  // 拿它跟 stage 的绝对坐标相减会算出假的溢出
  const NO_BOX = ['STYLE', 'SCRIPT', 'META', 'LINK', 'HEAD', 'TITLE']
  let overflow = 0
  Array.prototype.slice.call(stage.querySelectorAll('*')).forEach(function (el) {
    if (NO_BOX.indexOf(el.tagName) >= 0) return
    const r = el.getBoundingClientRect()
    if (!r.width && !r.height) return
    overflow = Math.max(overflow, Math.round((r.right - base.right) * 100) / 100)
  })

  const zeroSized = rects.filter(function (r) { return r.w < 1 || r.h < 1 }).length

  // 排版块之后必须还能正常接正文。限高容器一旦丢了 overflow，
  // 长图会画到 sentinel 上面去，读者看到的是图片压住后文。
  //
  // getBoundingClientRect 给的是未被裁剪的布局盒，滚动容器里的长图照样报满高，
  // 所以要沿祖先链把 overflow 不为 visible 的容器逐层裁一遍，量的才是肉眼看到的底边。
  const visibleBottom = function (el) {
    let bottom = el.getBoundingClientRect().bottom
    let parent = el.parentElement
    while (parent && parent !== stage) {
      const flow = getComputedStyle(parent)
      if (flow.overflowY !== 'visible' || flow.overflow === 'hidden') {
        bottom = Math.min(bottom, parent.getBoundingClientRect().bottom)
      }
      parent = parent.parentElement
    }
    return bottom
  }

  const sentinel = stage.querySelector('[data-wx-sentinel]')
  let coverAfter = 0
  if (sentinel) {
    const sentinelTop = sentinel.getBoundingClientRect().top
    const painted = Array.prototype.slice.call(stage.querySelectorAll('img'))
      .reduce(function (max, image) { return Math.max(max, visibleBottom(image)) }, 0)
    coverAfter = Math.round(Math.max(0, painted - sentinelTop))
  }

  // 多列容器按内联样式指纹识别：子元素全是带百分比宽的 inline-block。
  // 这个指纹在剥 flex、剥 box-sizing 之后依然成立，三种场景可以用同一套判据。
  const brokenRows = []
  let rowCount = 0
  Array.prototype.slice.call(stage.querySelectorAll('*')).forEach(function (parent) {
    const kids = Array.prototype.slice.call(parent.children)
    if (kids.length < 2) return
    const isColumn = function (el) {
      const style = el.getAttribute('style') || ''
      return /display\\s*:\\s*inline-block/i.test(style) && /(?:^|;)\\s*width\\s*:\\s*[\\d.]+%/i.test(style)
    }
    if (!kids.every(isColumn)) return
    rowCount += 1

    const boxes = kids.map(function (el) { return el.getBoundingClientRect() })
    const parentBox = parent.getBoundingClientRect()
    const problems = []

    for (let i = 1; i < boxes.length; i += 1) {
      if (boxes[i].left < boxes[i - 1].right - 0.5) {
        problems.push('第 ' + (i + 1) + ' 列与前一列水平重叠')
      }
      const overlapY = Math.min(boxes[i].bottom, boxes[0].bottom) - Math.max(boxes[i].top, boxes[0].top)
      if (overlapY <= 0) {
        problems.push('第 ' + (i + 1) + ' 列掉到了第 1 列下面（垂直无重叠）')
      }
      else if (Math.abs(boxes[i].top - boxes[0].top) > 2) {
        problems.push('第 ' + (i + 1) + ' 列顶边与第 1 列错开 ' + Math.round(boxes[i].top - boxes[0].top) + 'px')
      }
    }
    const spill = Math.round((boxes[boxes.length - 1].right - parentBox.right) * 100) / 100
    if (spill > 1) problems.push('末列超出容器右边 ' + spill + 'px')

    if (problems.length) {
      brokenRows.push({ columns: kids.length, problems })
    }
  })

  return {
    grouping: rows.map(function (r) { return r.count }),
    imgCount: rects.length,
    zeroSized,
    overflow,
    coverAfter,
    rowCount,
    brokenRows,
    totalHeight: Math.round(stage.getBoundingClientRect().height),
    rects,
  }
}

// 复制产物脱离 #output 后主题 CSS 就不再命中，因此预览必须就地量，
// 只有过滤后的产物才放进离屏画布量。
window.__wxMeasure = async function (html, width) {
  const stage = document.createElement('div')
  stage.style.cssText = 'position:fixed; left:-19999px; top:0; width:' + width + 'px; background:#ffffff; color:#000000; font-size:15px; line-height:1.75;'
  // 末尾钉一段正文，用来量排版块有没有盖住后面的内容
  stage.innerHTML = html + '<p data-wx-sentinel style="margin:0; font-size:15px; line-height:1.75;">模块之后的正文</p>'
  document.body.appendChild(stage)
  const measured = await window.__wxMeasureElement(stage)
  stage.remove()
  return measured
}

// 应用自己的渲染管线是异步的：脚本刚把 markup 塞进 #output，
// 应用可能又把默认示例文档覆盖回来。以前第一个被测预设量到的其实是示例文档，
// 于是 26 个预设「全过」而用户实测失败。注入前必须等 #output 安静下来。
window.__wxSettle = function (quietMs) {
  return new Promise(function (done) {
    const output = document.querySelector('#output')
    let last = output.innerHTML.length
    let stableSince = Date.now()
    const timer = setInterval(function () {
      const now = output.innerHTML.length
      if (now !== last) { last = now; stableSince = Date.now(); return }
      if (Date.now() - stableSince >= quietMs) { clearInterval(timer); done(true) }
    }, 60)
  })
}

// 结构硬规则：这些在 Chrome 里都能正常渲染，但公众号会把它们弄坏
window.__wxStructural = function (html) {
  const issues = []
  const holder = document.createElement('div')
  holder.innerHTML = html

  const imgInCell = holder.querySelectorAll('td img, th img, table img')
  if (imgInCell.length) {
    issues.push('表格单元格里有 ' + imgInCell.length + ' 张图：公众号编辑器不接受 td 内的 img，粘贴后图片会被丢掉')
  }

  // position:static 是秀米导出产物里的常客，它是默认值、剥不剥都一样；
  // 真正会塌的是 absolute / relative / fixed / sticky 撑起来的比例盒。
  if (/(^|[;\\s"])position\\s*:\\s*(absolute|relative|fixed|sticky)/i.test(html)) {
    issues.push('产物里还有 position:absolute/relative/fixed/sticky，公众号会整条剥掉')
  }

  // 限高滚动视窗的致命降级：overflow 被剥掉而限高还在，
  // 内容会溢出容器盖住后面的正文。产物必须自带 overflow:hidden 这一级台阶。
  holder.querySelectorAll('*').forEach(function (el) {
    const style = (el.getAttribute('style') || '').toLowerCase()
    const capped = /(?:^|;)\\s*(?:max-)?height\\s*:\\s*[\\d.]+px/.test(style)
    if (!capped) return
    if (!/overflow(?:-y)?\\s*:/.test(style)) return
    if (!/overflow\\s*:\\s*hidden/.test(style)) {
      issues.push('限高滚动容器只写了 overflow-y，没有 overflow:hidden 兜底：一旦公众号剥掉 overflow-y，长内容会溢出来盖住后面的正文')
    }
  })

  // inline-block 兄弟之间不能有空白文本节点
  holder.querySelectorAll('*').forEach(function (parent) {
    const kids = Array.prototype.slice.call(parent.childNodes)
    const inlineBlocks = kids.filter(function (kid) {
      return kid.nodeType === 1 && /display\\s*:\\s*inline-block/i.test(kid.getAttribute('style') || '')
    })
    if (inlineBlocks.length < 2) return
    const blanks = kids.filter(function (kid) {
      return kid.nodeType === 3 && !kid.nodeValue.trim() && kid.nodeValue.length
    })
    if (blanks.length) {
      issues.push('有 ' + inlineBlocks.length + ' 个并排 inline-block 之间夹着 ' + blanks.length + ' 个空白文本节点，会各自撑出一个空格的宽度')
    }
    const total = inlineBlocks.reduce(function (sum, el) {
      const style = el.getAttribute('style') || ''
      const width = (style.match(/(?:^|;)\\s*width\\s*:\\s*([\\d.]+)%/i) || [])[1]
      const margin = (style.match(/margin-left\\s*:\\s*([\\d.]+)%/i) || [])[1]
      return sum + Number(width || 0) + Number(margin || 0)
    }, 0)
    if (total > 100) {
      issues.push('并排列宽合计 ' + total.toFixed(2) + '% 超过 100%，第二列会换行掉下去')
    }
  })

  return issues
}

// 检测器自检：拿三份「已知会在公众号里塌掉」的产物喂进去，
// 报不出问题就说明这套模型又失效了，必须当场失败而不是给出一个漂亮的全过。
window.__wxSelfTest = async function () {
  const failures = []
  const img = '<img src="data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"></svg>') + '" style="display:block; width:100%; height:auto;" />'

  const tableCase = '<table style="width:100%; table-layout:fixed;"><tbody><tr>'
    + '<td style="width:50%;">' + img + '</td><td style="width:50%;">' + img + '</td></tr></tbody></table>'
  if (!window.__wxStructural(tableCase).some(function (i) { return i.indexOf('表格单元格') >= 0 })) {
    failures.push('表格套图没有被检出')
  }

  const col = function (extra) {
    return '<section style="display:inline-block; vertical-align:top; width:50%;' + (extra || '') + '">' + img + '</section>'
  }
  const spacedCase = '<section>\\n  ' + col() + '\\n  ' + col() + '\\n</section>'
  if (!window.__wxStructural(spacedCase).some(function (i) { return i.indexOf('空白文本节点') >= 0 })) {
    failures.push('列间空白文本节点没有被检出')
  }

  const overCase = '<section>' + col() + col(' margin-left:4%;') + '</section>'
  if (!window.__wxStructural(overCase).some(function (i) { return i.indexOf('超过 100%') >= 0 })) {
    failures.push('列宽合计超 100% 没有被检出')
  }

  // 几何检测也要能抓到：50% + 50% + 一个空格必然换行
  const measured = await window.__wxMeasure(spacedCase, 375)
  if (!measured.brokenRows.length) {
    failures.push('几何测量没有抓到 50%+50%+空格 的换行')
  }

  // 长图视窗的两条新判据。用一张明显放不下的长图当样本。
  const longImg = '<img src="data:image/svg+xml;base64,'
    + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="750" height="3000"></svg>')
    + '" style="display:block; width:100%; height:auto;" />'

  const nakedScroller = '<section style="overflow-y:auto; max-height:200px;">' + longImg + '</section>'
  if (!window.__wxStructural(nakedScroller).some(function (i) { return i.indexOf('overflow:hidden 兜底') >= 0 })) {
    failures.push('没有兜底的限高滚动容器没有被检出')
  }
  const laddered = '<section style="overflow:hidden; overflow-y:auto; max-height:200px;">' + longImg + '</section>'
  if (window.__wxStructural(laddered).some(function (i) { return i.indexOf('overflow:hidden 兜底') >= 0 })) {
    failures.push('带 overflow:hidden 兜底的滚动容器被误报了')
  }

  // 几何上也要抓到「剥掉 overflow 之后长图盖住后文」
  const covered = await window.__wxMeasure(window.__wxScenario(nakedScroller, 'nooverflow'), 375)
  if (covered.coverAfter < 100) {
    failures.push('几何测量没有抓到剥掉 overflow 后长图盖住后文（coverAfter=' + covered.coverAfter + '）')
  }
  const laddered2 = await window.__wxMeasure(window.__wxScenario(laddered, 'nooverflow'), 375)
  if (laddered2.coverAfter > 2) {
    failures.push('带兜底的滚动容器在剥掉 overflow 后被误判成盖住后文（coverAfter=' + laddered2.coverAfter + '）')
  }

  return failures
}
`

async function main() {
  const { page, dispose } = await launchPage({
    port: DEBUG_PORT,
    profile: `/tmp/md-wechat-layout-profile`,
    devUrl: DEV_URL,
    readyExpression: `!!(document.querySelector('#md-theme') && document.querySelector('#output'))`,
  })

  try {
    const corePath = `/mobi/@fs${resolve(process.cwd(), `packages/core/src/index.ts`)}`

    const presets = await page.evaluate(`(async () => {
      const layouts = await import('/mobi/src/utils/image-layouts.ts')
      const utils = await import('/mobi/src/utils/index.ts')
      const core = await import(${JSON.stringify(corePath)})
      await core.applyTheme({
        themeName: ${JSON.stringify(THEME)},
        variables: { primaryColor: '#16a34a', fontFamily: 'Optima-Regular, sans-serif', fontSize: '15px' },
      })
      window.__wxLayouts = layouts
      window.__wxUtils = utils
      ${BROWSER_HELPERS}
      return layouts.mediaLayoutPresets.map(p => ({ id: p.id, name: p.name, slotCount: p.slotCount }))
    })()`)

    // 应用启动后 #output 还会被异步渲染覆盖若干次。不等它稳定就注入的话，
    // 第一个被测预设量到的其实是默认示例文档——这正是上一版「26 个全过」却和实测不符的原因。
    await page.evaluate(`window.__wxSettle(700)`)

    const selfTest = await page.evaluate(`window.__wxSelfTest()`)
    if (selfTest.length) {
      console.log(`检测器自检未通过，本次结果不可信：`)
      selfTest.forEach(item => console.log(`  - ${item}`))
      process.exitCode = 1
      return
    }
    console.log(`检测器自检通过：表格套图 / 列间空白 / 列宽超限 / 换行几何 / 无兜底的限高滚动容器 / 长图盖住后文 都能被抓到\n`)

    const runPreset = (presetId, width) => page.evaluate(`(async () => {
      const layouts = window.__wxLayouts
      const utils = window.__wxUtils
      const preset = layouts.mediaLayoutPresets.find(p => p.id === ${JSON.stringify(presetId)})
      const form = layouts.createDefaultMediaLayoutState()
      form.presetId = preset.id
      const svg = (w, h) => 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '"><rect width="' + w + '" height="' + h + '" fill="#4f46e5"/></svg>')
      // 长图视窗就是给长图用的，喂 700x500 等于压根没测到滚动那条分支
      const isLongForm = preset.id === 'scroll-window'
      // 版式默认的比例和视窗高度来自工作台，不带上就测的是另一套参数
      const slotDefaults = layouts.getMediaLayoutPresetSlotDefaults(preset.id)
      while (form.images.length < preset.slotCount) form.images.push(JSON.parse(JSON.stringify(form.images[0])))
      form.images = form.images.map((slot, index) => {
        const defaults = slotDefaults[index] || slotDefaults[slotDefaults.length - 1] || {}
        return Object.assign({}, slot, {
          url: svg(700 + index * 40, isLongForm ? 3000 : 500),
          alt: '示意图' + (index + 1),
          caption: '图注' + (index + 1),
          aspectRatio: defaults.aspectRatio || slot.aspectRatio,
          minHeight: defaults.minHeight || slot.minHeight,
        })
      })

      const output = document.querySelector('#output')
      output.innerHTML = '<section class="container"><p class="paragraph">模块前的一段正文。</p>'
        + layouts.buildMediaLayoutMarkup(preset, form)
        + '<p class="paragraph">模块后的一段正文。</p></section>'

      await Promise.all(Array.from(output.querySelectorAll('img')).map(image => (
        image.complete && image.naturalWidth
          ? null
          : new Promise((done) => {
              image.addEventListener('load', done, { once: true })
              image.addEventListener('error', done, { once: true })
            })
      )))
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

      await utils.processClipboardContent('#16a34a')
      const clipboard = output.innerHTML

      const scenarios = {}
      for (const name of ['raw', 'noflex', 'nooverflow', 'harsh']) {
        scenarios[name] = await window.__wxMeasure(window.__wxScenario(clipboard, name), ${width})
      }

      return {
        structural: window.__wxStructural(clipboard),
        scenarios,
        clipboard,
        slotCount: preset.slotCount,
        presetName: preset.name,
      }
    })()`)

    const failures = []
    const report = {}

    let remoteChecked = 0
    let remoteSkipReason = SKIP_REMOTE ? `MD_SKIP_REMOTE=1` : ``

    for (const preset of presets) {
      const perWidth = {}
      const issues = []

      for (const width of STAGE_WIDTHS) {
        const result = await runPreset(preset.id, width)
        perWidth[width] = result

        result.structural.forEach(item => issues.push(`结构：${item}`))

        const groups = Object.entries(result.scenarios)
          .map(([name, data]) => `${name}=[${data.grouping.join(`,`)}]`)
        const signatures = new Set(Object.values(result.scenarios).map(data => data.grouping.join(`,`)))
        if (signatures.size > 1) {
          issues.push(`@${width}px 分行随过滤场景变化：${groups.join(` `)}`)
        }

        Object.entries(result.scenarios).forEach(([name, data]) => {
          if (data.imgCount !== result.slotCount) {
            issues.push(`@${width}px ${name} 图片数 ${data.imgCount} != ${result.slotCount}`)
          }
          if (data.zeroSized) {
            issues.push(`@${width}px ${name} 有 ${data.zeroSized} 张图尺寸为 0`)
          }
          if (data.overflow > 1) {
            issues.push(`@${width}px ${name} 溢出容器 ${data.overflow}px`)
          }
          if (data.coverAfter > 2) {
            issues.push(`@${width}px ${name} 图片盖住了模块后面的正文 ${data.coverAfter}px`)
          }
          data.brokenRows.forEach((row) => {
            issues.push(`@${width}px ${name} ${row.columns} 列并排失败：${row.problems.join(`；`)}`)
          })
        })
      }

      // 拿公众号自己的结构校验接口再过一遍，这是最权威的一票
      if (!remoteSkipReason) {
        try {
          const verdict = await verifyWithWeChat(perWidth[STAGE_WIDTHS[0]].clipboard)
          perWidth.wechatVerdict = verdict
          describeWeChatVerdict(verdict).forEach(item => issues.push(`公众号官方校验：${item}`))
          remoteChecked += 1
        }
        catch (error) {
          remoteSkipReason = `接口不可用（${error.message}）`
        }
      }

      report[preset.id] = perWidth

      const head = `${preset.id}（${preset.name}，${preset.slotCount} 图）`
      if (issues.length) {
        console.log(`\n[FAIL] ${head}`)
        issues.forEach(item => console.log(`   - ${item}`))
        failures.push(preset.id)
      }
      else {
        const summary = STAGE_WIDTHS.map((width) => {
          const data = perWidth[width].scenarios.raw
          return `${width}px 分行[${data.grouping.join(`,`)}] 多列容器${data.rowCount}个`
        }).join(`  `)
        const official = perWidth.wechatVerdict?.isValid ? `  官方校验✓` : ``
        console.log(`[ OK ] ${head}  ${summary}${official}`)
      }
    }

    console.log(
      remoteSkipReason
        ? `\n公众号官方结构校验：完成 ${remoteChecked}/${presets.length}，其余跳过（${remoteSkipReason}）`
        : `\n公众号官方结构校验：${remoteChecked}/${presets.length} 全部 isValid=true`
          + `（注意：该接口对表格套图、position 比例盒、列间空白都判通过，通过它不等于粘贴一定正常）`,
    )

    writeFileSync(`/tmp/wechat-layout-report.json`, JSON.stringify(report, null, 2))
    console.log(`\n完整测量数据：/tmp/wechat-layout-report.json`)

    console.log(`\n=== 总结论 ===`)
    if (failures.length) {
      console.log(`失败 ${failures.length} / ${presets.length}：${failures.join(`, `)}`)
      process.exitCode = 1
      return
    }
    console.log(`全部 ${presets.length} 个预设在 原样 / 剥掉flex / 剥掉overflow长写法 / 剥掉flex+box-sizing并重新缩进 四种场景下分行一致，且都没有盖住模块后面的正文`)
  }
  finally {
    dispose()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
