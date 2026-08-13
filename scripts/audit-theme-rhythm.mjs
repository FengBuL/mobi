#!/usr/bin/env node
/**
 * 排版节奏静态审计
 *
 * 把每套主题的标题字号倍率、上下间距全部换算成「正文 em」，跟 958 篇语料的实测中位数对照。
 * 换算规则：主题 CSS 里 `margin` 的 em 相对标题自身字号，所以正文基准 = 写下的 em × 字号倍率。
 * 用 calc(var(--md-font-size) * N) 写的间距本身就是正文基准，不再乘。
 *
 * 用法：node scripts/audit-theme-rhythm.mjs [--json]
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const cssDir = path.resolve(here, `../packages/shared/src/configs/theme-css`)
const indexFile = path.join(cssDir, `index.ts`)

// 语料中位数（docs/wechat-design-language.md 第 3 节，958 篇实测）
const CORPUS = {
  h1: { scale: 1.5, top: 1.88, bottom: 0.94 },
  h2: { scale: 1.38, top: 1.88, bottom: 0.94 },
  h3: { scale: 1.25, top: 1.88, bottom: 0.94 },
  h4: { scale: 1.13, top: 1.6, bottom: 0.8 },
}

function activeThemes() {
  const src = fs.readFileSync(indexFile, `utf8`)
  const block = src.slice(src.indexOf(`export const themeMap`), src.indexOf(`} as const`))
  return [...block.matchAll(/'([a-z0-9-]+)':/g)].map(m => m[1])
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, ``)
}

/** 提取顶层规则（不含 @media 内部，主题里没有 @media） */
function rules(css) {
  const out = []
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m = re.exec(css)
  while (m) {
    out.push({ selector: m[1].trim(), body: m[2] })
    m = re.exec(css)
  }
  return out
}

function decls(body) {
  const map = new Map()
  for (const chunk of body.split(`;`)) {
    const i = chunk.indexOf(`:`)
    if (i < 0)
      continue
    const prop = chunk.slice(0, i).trim()
    const value = chunk.slice(i + 1).trim()
    if (prop)
      map.set(prop, value)
  }
  return map
}

/**
 * 把一个长度值解析成「相对正文字号的倍数」。
 * @param raw 原始值
 * @param headingScale 该元素的字号倍率（用于把 em 换算成正文基准）
 * @param tokens 主题声明的 --sk-* token，用来解析 calc 里的变量
 */
function toBodyEm(raw, headingScale, tokens = new Map()) {
  if (!raw)
    return null
  const v = raw.trim()
  if (v === `0`)
    return 0

  // calc(var(--md-font-size) * <因子> * <因子> ...)，因子可以是数字或 var(--sk-x, 默认值)
  const calc = v.match(/^calc\(\s*var\(\s*--md-font-size\s*\)\s*([\s\S]*)\)$/)
  if (calc) {
    let acc = 1
    const factors = calc[1].split(`*`).map(s => s.trim()).filter(Boolean)
    for (const f of factors) {
      const num = Number(f)
      if (Number.isFinite(num)) {
        acc *= num
        continue
      }
      const varRef = f.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([\d.]+)\s*)?\)$/)
      if (!varRef)
        return null
      const declared = tokens.get(varRef[1])
      const resolved = declared !== undefined ? Number(declared) : Number(varRef[2])
      if (!Number.isFinite(resolved))
        return null
      acc *= resolved
    }
    return acc
  }

  const em = v.match(/^(-?[\d.]+)em$/)
  if (em)
    return Number(em[1]) * headingScale
  const px = v.match(/^(-?[\d.]+)px$/)
  if (px)
    return Number(px[1]) / 16
  const pct = v.match(/^(-?[\d.]+)%$/)
  if (pct)
    return null // 百分比是相对宽度，跟纵向节奏无关
  return null
}

/** margin 简写拆成 [top, right, bottom, left] */
function splitShorthand(value) {
  const parts = []
  let depth = 0
  let cur = ``
  for (const ch of value) {
    if (ch === `(`)
      depth++
    if (ch === `)`)
      depth--
    if (/\s/.test(ch) && depth === 0) {
      if (cur)
        parts.push(cur)
      cur = ``
    }
    else {
      cur += ch
    }
  }
  if (cur)
    parts.push(cur)
  if (parts.length === 1)
    return [parts[0], parts[0], parts[0], parts[0]]
  if (parts.length === 2)
    return [parts[0], parts[1], parts[0], parts[1]]
  if (parts.length === 3)
    return [parts[0], parts[1], parts[2], parts[1]]
  return parts.slice(0, 4)
}

/** 从 var(--x, fallback) 里取 fallback */
function varFallback(value) {
  const m = value.match(/^var\(\s*--[\w-]+\s*,\s*([\s\S]+)\)$/)
  return m ? m[1].trim() : null
}

const SKELETON_DEFAULT = (() => {
  const css = stripComments(fs.readFileSync(path.join(cssDir, `skeleton.css`), `utf8`))
  const out = {}
  for (const r of rules(css)) {
    for (const sel of r.selector.split(`,`).map(s => s.trim())) {
      if (!/^h[1-6]$/.test(sel))
        continue
      const d = decls(r.body)
      const rec = (out[sel] ||= {})
      const fs_ = d.get(`font-size`)
      if (fs_) {
        const inner = fs_.match(/\*\s*var\(\s*--sk-h\d-scale\s*,\s*([\d.]+)\s*\)/)
        if (inner) {
          rec.scale = Number(inner[1])
        }
        else {
          const plain = fs_.match(/\*\s*([\d.]+)\s*\)/)
          if (plain)
            rec.scale = Number(plain[1])
        }
      }
      const mg = d.get(`margin`)
      if (mg)
        rec.margin = varFallback(mg) || mg
      if (d.get(`margin-top`))
        rec.marginTop = varFallback(d.get(`margin-top`)) || d.get(`margin-top`)
      if (d.get(`margin-bottom`))
        rec.marginBottom = varFallback(d.get(`margin-bottom`)) || d.get(`margin-bottom`)
    }
  }
  return out
})()

// 块级元素的间距探针：[显示名, 选择器, 属性]
const BLOCK_PROBES = [
  [`段落下`, `p`, `margin-bottom`],
  [`列表上`, `ul`, `margin-top`],
  [`列表下`, `ul`, `margin-bottom`],
  [`引用`, `blockquote`, `margin-top`],
  [`代码`, `pre.code__pre`, `margin-top`],
  [`表格`, `table`, `margin-top`],
  [`图片`, `figure`, `margin-top`],
  [`分割线`, `hr`, `margin-top`],
]

// 骨架层基准值。语料只测了标题和 hr，其余是按「标题下 0.94 < 段落 < 标题上 1.88」定的中间档。
const BASELINE_BLOCK = {
  段落下: 1.0,
  列表上: 0.9,
  列表下: 1.2,
  引用: 1.5,
  代码: 1.4,
  表格: 1.4,
  图片: 1.5,
  分割线: 2.4,
}

function analyze(name) {
  const css = stripComments(fs.readFileSync(path.join(cssDir, `${name}.css`), `utf8`))
  const rs = rules(css)

  // 主题声明的 --sk-* token（在 section, container 里）
  const tokens = new Map()
  for (const r of rs) {
    if (!/(^|,)\s*(section|container)\s*(,|$)/.test(r.selector))
      continue
    for (const [k, v] of decls(r.body)) {
      if (k.startsWith(`--sk-`))
        tokens.set(k, v)
    }
  }

  const result = {}
  for (const tag of [`h1`, `h2`, `h3`, `h4`]) {
    let scale = SKELETON_DEFAULT[tag]?.scale ?? 1
    let marginTop = null
    let marginBottom = null

    // token 覆盖
    const tokScale = tokens.get(`--sk-${tag}-scale`)
    if (tokScale)
      scale = Number(tokScale)
    const tokMargin = tokens.get(`--sk-${tag}-margin`)
    const skMargin = SKELETON_DEFAULT[tag]?.margin
    const baseMargin = tokMargin || skMargin
    if (baseMargin) {
      const [t, , b] = splitShorthand(baseMargin)
      marginTop = t
      marginBottom = b
    }
    if (SKELETON_DEFAULT[tag]?.marginTop)
      marginTop = SKELETON_DEFAULT[tag].marginTop
    if (SKELETON_DEFAULT[tag]?.marginBottom)
      marginBottom = SKELETON_DEFAULT[tag].marginBottom

    // 主题里的直接元素规则覆盖（后写的赢）
    for (const r of rs) {
      const sels = r.selector.split(`,`).map(s => s.trim())
      if (!sels.includes(tag))
        continue
      const d = decls(r.body)
      const f = d.get(`font-size`)
      if (f) {
        const mm = f.match(/var\(--md-font-size\)\s*\*\s*([\d.]+)/)
        if (mm)
          scale = Number(mm[1])
      }
      if (d.has(`margin`)) {
        const [t, , b] = splitShorthand(d.get(`margin`))
        marginTop = t
        marginBottom = b
      }
      if (d.has(`margin-top`))
        marginTop = d.get(`margin-top`)
      if (d.has(`margin-bottom`))
        marginBottom = d.get(`margin-bottom`)
    }

    result[tag] = {
      scale,
      top: toBodyEm(marginTop, scale, tokens),
      bottom: toBodyEm(marginBottom, scale, tokens),
      rawTop: marginTop,
      rawBottom: marginBottom,
    }
  }

  result.blocks = {}
  for (const [label, sel, prop, fallbackToken] of BLOCK_PROBES) {
    let raw = null
    for (const r of [...rules(stripComments(fs.readFileSync(path.join(cssDir, `skeleton.css`), `utf8`))), ...rs]) {
      const sels = r.selector.split(`,`).map(s => s.trim())
      if (!sels.includes(sel))
        continue
      const d = decls(r.body)
      if (d.has(prop))
        raw = d.get(prop)
      else if (d.has(`margin`))
        raw = splitShorthand(d.get(`margin`))[prop === `margin-top` ? 0 : 2]
    }
    result.blocks[label] = toBodyEm(raw, 1, tokens) ?? (fallbackToken ? Number(tokens.get(fallbackToken)) : null)
  }
  return result
}

const themes = activeThemes()
const data = {}
for (const t of themes) data[t] = analyze(t)

if (process.argv.includes(`--json`)) {
  console.log(JSON.stringify(data, null, 2))
  process.exit(0)
}

const fmt = n => (n === null || n === undefined ? `  -  ` : n.toFixed(2).padStart(5))

console.log(`排版节奏审计（全部换算成「正文 em」基准）`)
console.log(`语料中位数：h1 ${CORPUS.h1.scale}× · h2 ${CORPUS.h2.scale}× · h3 ${CORPUS.h3.scale}× · h4 ${CORPUS.h4.scale}×，间距 1.88 / 0.94（2:1）\n`)

for (const tag of [`h1`, `h2`, `h3`, `h4`]) {
  console.log(`── ${tag} ──`)
  console.log(`${`主题`.padEnd(14) + `字号`.padStart(6) + `上间距`.padStart(9) + `下间距`.padStart(9) + `  比`.padStart(7)}  标记`)
  const scales = []
  const tops = []
  for (const t of themes) {
    const r = data[t][tag]
    scales.push(r.scale)
    if (r.top !== null)
      tops.push(r.top)
    const ratio = r.top && r.bottom ? (r.top / r.bottom) : null
    const flags = []
    if (r.top !== null && r.top > 3.5)
      flags.push(`间距>3.5em`)
    else if (r.top !== null && r.top > 2.6)
      flags.push(`间距偏大`)
    if (r.scale > (CORPUS[tag].scale + 0.25))
      flags.push(`字号超语料P90`)
    if (ratio !== null && (ratio < 1.6 || ratio > 2.6))
      flags.push(`比${ratio.toFixed(2)}`)
    console.log(
      `${t.padEnd(14)
      + r.scale.toFixed(2).padStart(6)
      + fmt(r.top).padStart(9)
      + fmt(r.bottom).padStart(9)
      + (ratio ? ratio.toFixed(2) : ` - `).padStart(7)
      }  ${flags.join(` `)}`,
    )
  }
  const med = (arr) => {
    const s = [...arr].sort((a, b) => a - b)
    return s.length ? s[Math.floor(s.length / 2)] : NaN
  }
  console.log(
    `${`中位数`.padEnd(14)
    + med(scales).toFixed(2).padStart(6)
    + med(tops).toFixed(2).padStart(9)
    }   （语料 ${CORPUS[tag].scale} / ${CORPUS[tag].top}）`,
  )
  console.log()
}

console.log(`── 块级元素间距（正文 em）──`)
const labels = BLOCK_PROBES.map(p => p[0])
console.log(`主题`.padEnd(14) + labels.map(l => l.padStart(8)).join(``))
for (const t of themes) {
  console.log(
    t.padEnd(14)
    + labels.map((l) => {
      const v = data[t].blocks[l]
      return (v === null || !Number.isFinite(v) ? `-` : v.toFixed(2)).padStart(8)
    }).join(``),
  )
}
console.log(
  `骨架基准`.padEnd(12)
  + labels.map(l => BASELINE_BLOCK[l].toFixed(2).padStart(8)).join(``),
)

const over = []
for (const t of themes) {
  for (const tag of [`h1`, `h2`, `h3`, `h4`]) {
    const r = data[t][tag]
    if (r.top !== null && r.top > 3.5)
      over.push(`${t}.${tag}=${r.top.toFixed(2)}`)
    if (r.scale > 1.75)
      over.push(`${t}.${tag} 字号 ${r.scale}`)
  }
}
console.log(`\n超标项：${over.length ? over.join(`, `) : `无`}`)
