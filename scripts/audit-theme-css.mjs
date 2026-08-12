// 挂载中的全部主题的静态 CSS 体检（只读，不改任何主题文件）。
//
// 视觉判断解释「好不好看」，这份统计解释「为什么」：
//   - 覆盖度：对照排版元素清单，哪些元素主题压根没管，只能吃骨架层和 base.css 的兜底
//   - 装饰手法：伪元素用了几处（辨识度的硬指标）、标题靠什么手法撑场面
//   - 配色组织：有没有独立的局部变量体系，还是散落的硬编码色值
//
// 另外做一遍一致性检查：themeMap 条目数、themeOptions 数、实际 CSS 文件数要对得上，
// 被砍掉的主题在 legacyThemeAliasMap 里必须有指向保留主题的有效映射。
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const CSS_DIR = resolve(process.cwd(), `packages/shared/src/configs/theme-css`)
const INDEX_FILE = resolve(CSS_DIR, `index.ts`)
const THEME_CONFIG_FILE = resolve(process.cwd(), `packages/shared/src/configs/theme.ts`)
// 这两个不是主题，是所有主题共享的底
const SHARED_CSS = new Set([`base.css`, `skeleton.css`])

// 排版元素清单：一套完整的主题应该对这些都有交代。
// test 收到的是「单条选择器」（逗号已拆开），命中任意一条即算覆盖。
const CHECKLIST = [
  { key: `h1`, label: `h1`, test: sel => /(^|\s|>)h1\b/.test(sel) },
  { key: `h2`, label: `h2`, test: sel => /(^|\s|>)h2\b/.test(sel) },
  { key: `h3`, label: `h3`, test: sel => /(^|\s|>)h3\b/.test(sel) },
  { key: `h4`, label: `h4`, test: sel => /(^|\s|>)h4\b/.test(sel) },
  { key: `h5h6`, label: `h5/h6`, test: sel => /(^|\s|>)h[56]\b/.test(sel) },
  { key: `p`, label: `p`, test: sel => /(^|\s|>)p\b/.test(sel) },
  { key: `strong`, label: `strong`, test: sel => /(^|\s|>)strong\b/.test(sel) },
  { key: `em`, label: `em`, test: sel => /(^|\s|>)em\b/.test(sel) },
  { key: `a`, label: `a`, test: sel => /(^|\s|>)a(?![-\w])/.test(sel) },
  { key: `list`, label: `ul/ol`, test: sel => /(^|\s|>)(ul|ol)\b/.test(sel) },
  { key: `li`, label: `li`, test: sel => /(^|\s|>)li\b/.test(sel) },
  // ::marker 的样式进不了剪贴板（juice 只内联 ::before/::after，已实测），
  // 所以序号/圆点由渲染器画成 <span class="listitem-marker"> 真实节点，查这个。
  { key: `marker`, label: `列表符号`, test: sel => /listitem-marker/.test(sel) || /::marker/.test(sel) },
  { key: `blockquote`, label: `blockquote`, test: sel => /blockquote/.test(sel) },
  { key: `code`, label: `code 行内`, test: sel => /(^|\s|>)code\b/.test(sel) && !/pre|code__pre|hljs/.test(sel) },
  { key: `pre`, label: `pre 代码块`, test: sel => /(^|\s|>)pre\b/.test(sel) || /code__pre|hljs/.test(sel) },
  { key: `table`, label: `table`, test: sel => /(^|\s|>)table\b/.test(sel) },
  { key: `th`, label: `th`, test: sel => /(^|\s|>)th\b/.test(sel) },
  { key: `td`, label: `td`, test: sel => /(^|\s|>)td\b/.test(sel) },
  { key: `trStripe`, label: `隔行底色`, test: sel => /nth-child/.test(sel) },
  { key: `hr`, label: `hr`, test: sel => /(^|\s|>)hr\b/.test(sel) },
  { key: `img`, label: `img`, test: sel => /(^|\s|>)img\b/.test(sel) },
  { key: `figcaption`, label: `figcaption`, test: sel => /figcaption/.test(sel) },
  { key: `alert`, label: `alert 提示块`, test: sel => /markdown-alert/.test(sel) },
  { key: `alertTitle`, label: `alert 标题行`, test: sel => /alert-title|alert-icon/.test(sel) },
]

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, ``)
}

// 极简 CSS 规则切分：主题文件都是扁平结构，够用。
function parseRules(css) {
  const rules = []
  const body = stripComments(css)
  const re = /([^{}]+)\{([^{}]*)\}/g
  let match = re.exec(body)
  while (match) {
    const selector = match[1].trim().replace(/\s+/g, ` `)
    if (selector && !selector.startsWith(`@`)) {
      rules.push({ selector, declarations: match[2].trim() })
    }
    match = re.exec(body)
  }
  return rules
}

// 标题靠什么手法撑场面。同质化最严重的是 border-left 竖条。
function classifyHeadingTechnique(rules) {
  const techniques = new Set()
  rules.forEach(({ selector, declarations }) => {
    if (!/h[1-4]/.test(selector)) {
      return
    }
    const decl = declarations.toLowerCase()
    if (/::before|::after/.test(selector)) {
      techniques.add(`伪元素装饰`)
    }
    if (/border-left\s*:\s*(?!0)/.test(decl)) {
      techniques.add(`border-left 竖条`)
    }
    if (/border-bottom\s*:\s*(?!0)/.test(decl)) {
      techniques.add(`border-bottom 下划线`)
    }
    if (/border-top\s*:\s*(?!0)/.test(decl)) {
      techniques.add(`border-top 上划线`)
    }
    if (/^\s*border\s*:\s*(?!0|none)/m.test(decl) || /;\s*border\s*:\s*(?!0|none)/.test(decl)) {
      techniques.add(`整框描边`)
    }
    if (/background\s*:\s*(?!none|transparent)/.test(decl) || /background-color\s*:/.test(decl)) {
      techniques.add(`整块底色`)
    }
    if (/counter-increment|counter-reset|counter\(/.test(decl)) {
      techniques.add(`自动编号`)
    }
    if (/text-transform\s*:\s*uppercase/.test(decl)) {
      techniques.add(`全大写`)
    }
    if (/letter-spacing\s*:\s*0?\.(?:0[89]|[1-9])/.test(decl)) {
      techniques.add(`宽字距`)
    }
    if (/writing-mode/.test(decl) || /(?:^|[;\s])transform\s*:/.test(decl)) {
      techniques.add(`变形/竖排`)
    }
  })
  return [...techniques]
}

function selectorAtoms(css) {
  // 逗号拆开逐条判断：不然 `pre.code__pre, .hljs.code__pre` 里的 `pre`
  // 会把同一条规则里的 `code` 判成代码块，行内 code 就永远显示为「没管」。
  return parseRules(css)
    .map(r => r.selector)
    .flatMap(sel => sel.split(`,`).map(part => part.trim()).filter(Boolean))
}

function analyzeTheme(name, css, platformAtoms) {
  const rules = parseRules(css)
  const selectors = rules.map(r => r.selector)
  const atoms = selectorAtoms(css)

  // 覆盖度按「主题 + 平台层（base.css + skeleton.css）」算：
  // 骨架层的存在意义就是让主题不必逐套重写这些元素，只统计主题文件会误报成缺口。
  const missing = CHECKLIST
    .filter(item => !atoms.some(sel => item.test(sel)) && !platformAtoms.some(sel => item.test(sel)))
    .map(item => item.label)
  const covered = CHECKLIST.filter(item => atoms.some(sel => item.test(sel))).map(item => item.label)
  const delegated = CHECKLIST
    .filter(item => !atoms.some(sel => item.test(sel)) && platformAtoms.some(sel => item.test(sel)))
    .map(item => item.label)

  const pseudoRules = rules.filter(r => /::before|::after/.test(r.selector))
  const pseudoTargets = pseudoRules.map(r => r.selector)

  const counterRules = rules.filter(r => /counter/.test(r.declarations))

  // 局部变量体系 vs 硬编码色值
  const declaredVars = [...css.matchAll(/(--[\w-]+)\s*:/g)]
    .map(m => m[1])
    .filter(v => !v.startsWith(`--md-`))
  const uniqueVars = [...new Set(declaredVars)]
  const hexColors = [...css.matchAll(/#[0-9a-f]{3,8}\b/gi)].map(m => m[0].toLowerCase())
  const uniqueHex = [...new Set(hexColors)]
  const rgbaColors = [...css.matchAll(/rgba?\([^)]*\)/gi)].map(m => m[0])

  // 主题是否有自己的字体主张
  const fontFamilyRules = rules.filter(r => /font-family/.test(r.declarations))

  // 深色底：section/container 上有没有铺深色背景
  const shellRule = rules.find(r => /^(section|container|section\s*,\s*container|container\s*,\s*section)$/.test(r.selector))
  const shellBackground = shellRule && /background/.test(shellRule.declarations)
    ? (shellRule.declarations.match(/background[^;]*/) || [``])[0].trim()
    : ``

  const usesGradient = /linear-gradient|radial-gradient|conic-gradient/.test(css)
  const usesShadow = /box-shadow\s*:\s*(?!none)/.test(css)
  const usesColorMix = /color-mix\(/.test(css)

  return {
    name,
    lines: css.split(`\n`).length,
    bytes: css.length,
    ruleCount: rules.length,
    selectors,
    covered,
    delegated,
    missing,
    pseudoCount: pseudoRules.length,
    pseudoTargets,
    counterCount: counterRules.length,
    headingTechniques: classifyHeadingTechnique(rules),
    localVars: uniqueVars,
    localVarCount: uniqueVars.length,
    hexCount: uniqueHex.length,
    hexColors: uniqueHex,
    rgbaCount: rgbaColors.length,
    fontFamilyRuleCount: fontFamilyRules.length,
    fontFamilies: fontFamilyRules.map(r => (r.declarations.match(/font-family[^;]*/) || [``])[0].trim()),
    shellBackground,
    usesGradient,
    usesShadow,
    usesColorMix,
  }
}

// 结构指纹：只保留「哪个选择器声明了哪些属性」，把具体色值/尺寸全部丢掉。
// 两套主题如果指纹几乎一样，那它们的差别就只剩换色，这正是「不够独特」的量化证据。
function fingerprint(css) {
  const rules = parseRules(css)
  const set = new Set()
  rules.forEach(({ selector, declarations }) => {
    const props = [...declarations.matchAll(/(^|;)\s*([\w-]+)\s*:/g)].map(m => m[2]).sort()
    const key = selector.replace(/\s+/g, ``)
    props.forEach(prop => set.add(`${key}|${prop}`))
  })
  return set
}

function jaccard(a, b) {
  let shared = 0
  a.forEach((item) => { if (b.has(item)) { shared += 1 } })
  return shared / (a.size + b.size - shared)
}

function reportSimilarity(report, cssByName) {
  const prints = new Map(report.map(item => [item.name, fingerprint(cssByName[item.name])]))
  const pairs = []
  const names = report.map(item => item.name)
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      pairs.push({
        a: names[i],
        b: names[j],
        score: jaccard(prints.get(names[i]), prints.get(names[j])),
      })
    }
  }
  pairs.sort((x, y) => y.score - x.score)

  console.log(`\n=== 结构同质化 Top 25（只比「谁声明了什么属性」，不比色值）===`)
  pairs.slice(0, 25).forEach((pair) => {
    console.log(`${(pair.a + ` ↔ ` + pair.b).padEnd(28)} ${(pair.score * 100).toFixed(1)}%`)
  })

  // 每套主题「和它最像的那一套」，用来找可以合并的双胞胎
  console.log(`\n=== 每套主题的最近邻 ===`)
  names.forEach((name) => {
    const best = pairs.filter(p => p.a === name || p.b === name)[0]
    const other = best.a === name ? best.b : best.a
    console.log(`${name.padEnd(12)} 最像 ${other.padEnd(12)} ${(best.score * 100).toFixed(1)}%`)
  })

  return pairs
}

// themeMap / themeOptions / 实际文件 / 别名映射 四边对账
function checkConsistency(themeNames) {
  const problems = []
  const configSource = readFileSync(THEME_CONFIG_FILE, `utf8`)

  const categoryBlock = configSource.slice(
    configSource.indexOf(`export const themeCategoryOptions`),
    configSource.indexOf(`export const themeOptions`),
  )
  const optionValues = [...categoryBlock.matchAll(/value:\s*`([\w-]+)`/g)].map(m => m[1])
  const categories = [...categoryBlock.matchAll(/category:\s*`([^`]+)`/g)].map(m => m[1])
  const optionPrimaries = [...categoryBlock.matchAll(/defaultPrimaryColor:\s*`(#[0-9a-fA-F]{3,8})`/g)].map(m => m[1])

  const aliasBlock = configSource.slice(
    configSource.indexOf(`export const legacyThemeAliasMap`),
    configSource.indexOf(`export function isThemeName`),
  )
  const aliases = [...aliasBlock.matchAll(/'?([\w-]+)'?\s*:\s*`([\w-]+)`/g)].map(m => ({ from: m[1], to: m[2] }))

  const cssFiles = readdirSync(CSS_DIR)
    .filter(file => file.endsWith(`.css`) && !SHARED_CSS.has(file))
    .map(file => file.replace(/\.css$/, ``))

  const themeSet = new Set(themeNames)

  if (optionValues.length !== themeNames.length) {
    problems.push(`themeOptions ${optionValues.length} 条 ≠ themeMap ${themeNames.length} 条`)
  }
  if (cssFiles.length !== themeNames.length) {
    problems.push(`CSS 文件 ${cssFiles.length} 个 ≠ themeMap ${themeNames.length} 条`)
  }
  if (optionPrimaries.length !== optionValues.length) {
    problems.push(`defaultPrimaryColor ${optionPrimaries.length} 个 ≠ themeOptions ${optionValues.length} 条`)
  }
  optionValues.forEach((value) => {
    if (!themeSet.has(value)) {
      problems.push(`themeOptions 里的 ${value} 不在 themeMap`)
    }
  })
  cssFiles.forEach((name) => {
    if (!themeSet.has(name)) {
      problems.push(`存在孤儿 CSS 文件 ${name}.css（不在 themeMap）`)
    }
  })
  themeNames.forEach((name) => {
    if (!cssFiles.includes(name)) {
      problems.push(`themeMap 里的 ${name} 找不到对应 CSS 文件`)
    }
  })
  aliases.forEach(({ from, to }) => {
    if (!themeSet.has(to)) {
      problems.push(`别名 ${from} → ${to}：映射目标不是保留主题`)
    }
    if (from === to) {
      problems.push(`别名 ${from} 自映射`)
    }
    if (themeSet.has(from)) {
      problems.push(`别名 ${from} 与保留主题同名`)
    }
  })

  console.log(`\n=== 一致性检查 ===`)
  console.log(`themeMap ${themeNames.length} 套 / themeOptions ${optionValues.length} 条 / CSS 文件 ${cssFiles.length} 个 / 分类 ${categories.length} 个（${categories.join(`、`)}）`)
  console.log(`别名映射 ${aliases.length} 条`)
  if (problems.length) {
    problems.forEach(line => console.log(`  ✗ ${line}`))
    process.exitCode = 1
  }
  else {
    console.log(`四边对账通过`)
  }
}

function main() {
  const indexSource = readFileSync(INDEX_FILE, `utf8`)
  const mapBlock = indexSource.slice(indexSource.indexOf(`export const themeMap`))
  const themeNames = [...mapBlock.matchAll(/^\s*'?([\w-]+)'?\s*:\s*\w+CSS,/gm)].map(m => m[1])

  checkConsistency(themeNames)

  const platformAtoms = [
    ...selectorAtoms(readFileSync(resolve(CSS_DIR, `base.css`), `utf8`)),
    ...selectorAtoms(readFileSync(resolve(CSS_DIR, `skeleton.css`), `utf8`)),
  ]

  const cssByName = {}
  const report = themeNames.map((name) => {
    const css = readFileSync(resolve(CSS_DIR, `${name}.css`), `utf8`)
    cssByName[name] = css
    return analyzeTheme(name, css, platformAtoms)
  })

  console.log(`\n=== 覆盖度缺口（主题自有 / 骨架兜底 / 真缺口）===`)
  report.forEach((item) => {
    const tag = item.missing.length ? `缺 ${item.missing.length}` : `全覆盖`
    console.log(
      `${item.name.padEnd(12)} ${String(item.lines).padStart(4)} 行  自有 ${String(item.covered.length).padStart(2)}  兜底 ${String(item.delegated.length).padStart(2)}  ${tag.padEnd(7)} ${item.missing.join(`, `)}`,
    )
  })

  console.log(`\n=== 缺口按元素统计（多少套主题漏掉了它）===`)
  const gapTally = {}
  CHECKLIST.forEach((item) => { gapTally[item.label] = 0 })
  report.forEach(item => item.missing.forEach((label) => { gapTally[label] += 1 }))
  Object.entries(gapTally)
    .sort((a, b) => b[1] - a[1])
    .forEach(([label, count]) => {
      if (count) {
        console.log(`${label.padEnd(14)} ${String(count).padStart(2)} / ${report.length} 套没管`)
      }
    })

  console.log(`\n=== 伪元素装饰（辨识度硬指标）===`)
  const zeroPseudo = report.filter(item => item.pseudoCount === 0)
  report.slice().sort((a, b) => b.pseudoCount - a.pseudoCount).forEach((item) => {
    console.log(`${item.name.padEnd(12)} ${String(item.pseudoCount).padStart(2)} 处  ${item.pseudoTargets.slice(0, 4).join(` | `)}`)
  })
  console.log(`零伪元素：${zeroPseudo.length} 套 —— ${zeroPseudo.map(i => i.name).join(`, `) || `无`}`)

  console.log(`\n=== 标题手法分布 ===`)
  const techTally = {}
  report.forEach(item => item.headingTechniques.forEach((t) => {
    techTally[t] = techTally[t] || []
    techTally[t].push(item.name)
  }))
  Object.entries(techTally)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([tech, names]) => {
      console.log(`${tech.padEnd(18)} ${String(names.length).padStart(2)} 套：${names.join(`, `)}`)
    })

  console.log(`\n=== 配色组织 ===`)
  report.forEach((item) => {
    console.log(`${item.name.padEnd(12)} 局部变量 ${String(item.localVarCount).padStart(2)} 个  硬编码色值 ${String(item.hexCount).padStart(2)} 种  rgba ${String(item.rgbaCount).padStart(2)} 处  ${item.shellBackground ? `底色: ${item.shellBackground.slice(0, 40)}` : ``}`)
  })

  const similarity = reportSimilarity(report, cssByName)

  writeFileSync(`/tmp/theme-audit/css-analysis.json`, JSON.stringify({ report, similarity: similarity.slice(0, 120) }, null, 2))
  console.log(`\n完整数据：/tmp/theme-audit/css-analysis.json`)
}

main()
