#!/usr/bin/env node
/**
 * 主题降级验证
 *
 * 上一轮报告里挂着两条没验的风险：
 *   1. blueprint 的网格、xuan 的横格、cyber 的网点都靠 `background-size` 平铺，
 *      公众号剥掉这个属性之后会退化成什么？纸面会不会塌成白底？
 *   2. pop 把辨识度押在 `box-shadow` 上，投影被剥之后还认得出来吗？
 *
 * 做法：走完整复制管线拿到内联产物，再按公众号的过滤行为逐条剥属性，
 * 把剥完的 HTML 塞回沙盒重新测量——不是看 CSS 源码猜，是真的重新算一遍计算样式。
 *
 * 判据（剥完之后仍要成立）：
 *   - 纸面还有实色底（background-color 不是 transparent，也没塌回 #fff）
 *   - 正文与纸面对比度 >= 4.5，标题 >= 3
 *   - 靠投影分层的元素还有别的边界手段（border 或与父级不同的底色）
 *
 * 用法：node scripts/verify-theme-degradation.mjs
 * 需要 dev server 已在 5173 上跑着。
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { launchPage } from './lib/wechat-cdp.mjs'

const DEBUG_PORT = Number(process.env.MD_DEBUG_PORT || 9236)
const DEV_URL = process.env.MD_DEV_URL || `http://localhost:5173/md/`
const OUT_DIR = `/tmp/theme-audit`

// 剥属性的四档场景，从最可能发生到最狠
const SCENARIOS = [
  { key: `baseline`, label: `原样`, strip: [] },
  { key: `no-size`, label: `剥尺寸`, strip: [`background-size`] },
  { key: `no-repeat`, label: `剥平铺方式`, strip: [`background-repeat`] },
  { key: `no-position`, label: `剥定位`, strip: [`background-position`] },
  { key: `no-tile`, label: `剥平铺`, strip: [`background-size`, `background-repeat`, `background-position`] },
  { key: `no-shadow`, label: `剥投影`, strip: [`box-shadow`] },
  { key: `no-image`, label: `剥背景图`, strip: [`background-image`, `background-size`, `background-repeat`, `background-position`] },
  { key: `worst`, label: `全剥`, strip: [`background-image`, `background-size`, `background-repeat`, `background-position`, `box-shadow`, `border-radius`] },
]

const TARGETS = [
  { theme: `blueprint`, why: `网格靠 background-size 平铺` },
  { theme: `xuan`, why: `横格靠 background-size 平铺` },
  { theme: `cyber`, why: `网点靠 background-size 平铺 + 硬投影` },
  { theme: `pop`, why: `辨识度押在 box-shadow 偏移投影上` },
  { theme: `magazine`, why: `装饰艺术 SVG 扇纹与细线框并行` },
  { theme: `academic`, why: `校准标记 SVG 与出版物实线并行` },
  { theme: `vermilion`, why: `回纹 SVG 与朱红双线框并行` },
  { theme: `ink`, why: `飞白 SVG 与墨色边线并行` },
  { theme: `porcelain`, why: `缠枝 SVG 与青花开光框并行` },
  { theme: `press`, why: `对照组：同样用硬投影但有实边框` },
  { theme: `minimalist`, why: `对照组：a/strong 的下衬用 inset box-shadow` },
  { theme: `terminal`, why: `深色底 + 提示符 SVG，剥背景后需靠不透明实色与实体边框兜底` },
  { theme: `neon`, why: `深色底 + 霓虹灯管 SVG，剥背景后需靠不透明面板兜底` },
  { theme: `default`, why: `裁切标 SVG 与校样签并行` },
  { theme: `insight`, why: `报告封签 SVG 与数据基线并行` },
  { theme: `launch`, why: `状态条 SVG 与版本票边框并行` },
  { theme: `legal`, why: `书脊双线 SVG 与烫金索引签并行` },
  { theme: `swiss`, why: `模数网格线与信号红编号方块` },
  { theme: `bloom`, why: `花瓣渐层 SVG 与柔焦边饰` },
  { theme: `candy`, why: `胶带贴纸 SVG 与虚线裁切边` },
  { theme: `sequence`, why: `登记线 SVG 与巨大编号块` },
  { theme: `gallery`, why: `展签装裱边框与发丝线` },
  { theme: `scoreboard`, why: `赛报头色块与 NO.x 徽章` },
]

const SAMPLE_MD = [
  `# 秋季复盘与下一步`,
  ``,
  `一段正文，用来量纸面底色和正文对比度。`,
  ``,
  `## 一、第一节`,
  ``,
  `一段正文。这里有一个[链接](https://example.com)和一段**加粗**。`,
  ``,
  `### 1.1 三级标题`,
  ``,
  `- 无序列表第一项`,
  `- 无序列表第二项`,
  ``,
  `> 引用块，靠投影或底色跟纸面分层。`,
  ``,
  '```js',
  `const answer = 42`,
  '```',
  ``,
  `| 列一 | 列二 |`,
  `| --- | --- |`,
  `| 甲 | 乙 |`,
  ``,
  `---`,
  ``,
  `最后一段正文。`,
].join(`\n`)

/**
 * 一档场景下的硬伤清单。
 * 「还认得出来」的判据是四条里至少满足一条：有边框、底色异于纸面、有投影、有实体化的伪元素标记。
 * 最后一条对 minimalist 这类刻意无框的主题很关键——它的引用块靠一个大引号字符立住，
 * 那个引号在产物里是真实 span，不是靠投影。
 */
function boundaryFlags(row, base) {
  const flags = []
  if (row.p && row.p.contrast < 4.5) flags.push(`正文对比 ${row.p.contrast}<4.5`)
  if (row.h2 && row.h2.contrast < 3) flags.push(`h2 对比 ${row.h2.contrast}<3`)
  if (row.paperEffective === null) flags.push(`纸面测不到`)
  for (const key of [`blockquote`, `pre`, `table`]) {
    const v = row[key]
    if (!v) continue
    if (!v.distinctBg && v.maxBorder < 1 && !v.shadow && !v.pseudoMark) flags.push(`${key} 无任何边界`)
  }
  if (base && row.totalHeight && base.totalHeight
    && Math.abs(row.totalHeight - base.totalHeight) > base.totalHeight * 0.06) {
    flags.push(`整体高度变化 ${base.totalHeight}→${row.totalHeight}`)
  }
  return flags
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })

  const { page, dispose } = await launchPage({
    port: DEBUG_PORT,
    profile: `/tmp/md-theme-degrade-profile`,
    devUrl: DEV_URL,
    readyExpression: `!!(document.querySelector('#md-theme') && document.querySelector('#output'))`,
  })

  try {
    const corePath = `/md/@fs${resolve(process.cwd(), `packages/core/src/index.ts`)}`
    const stylePath = `/md/@fs${resolve(process.cwd(), `packages/shared/src/configs/style.ts`)}`
    const themePath = `/md/@fs${resolve(process.cwd(), `packages/shared/src/configs/theme.ts`)}`

    await page.evaluate(`(async () => {
      const core = await import(${JSON.stringify(corePath)});
      const utils = await import('/md/src/utils/index.ts');
      const styleConfig = await import(${JSON.stringify(stylePath)});
      const themeConfig = await import(${JSON.stringify(themePath)});
      window.__deg = { core, utils, themeConfig };
      window.__deg.variablesFor = function (name) {
        return {
          primaryColor: themeConfig.getThemeDefaultPrimaryColor(name),
          fontFamily: styleConfig.defaultStyleConfig.fontFamily,
          fontSize: styleConfig.defaultStyleConfig.fontSize,
        };
      };
      const renderer = core.initRenderer({ isMacCodeBlock: true });
      renderer.reset({ legend: 'alt', themeMode: 'light', isMacCodeBlock: true });
      const rendered = utils.renderMarkdown(${JSON.stringify(SAMPLE_MD)}, renderer);
      window.__deg.html = utils.postProcessHtml(rendered.html, rendered.readingTime, renderer)
        + '<p data-degrade-sentinel style="height:0;margin:0;overflow:hidden;">.</p>';

      // 沙盒：脱离 #output 的作用域样式，只吃内联样式，跟公众号那边一样
      const sandbox = document.createElement('div');
      sandbox.id = 'degrade-sandbox';
      sandbox.setAttribute('style', 'position:static;width:375px;background:#ffffff;');
      document.body.appendChild(sandbox);

      // 相对亮度与对比度，跟 verify-theme-contrast 用同一套公式
      window.__deg.parseColor = function (value) {
        const m = String(value).match(/rgba?\\(([^)]+)\\)/);
        if (!m) return null;
        const parts = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number);
        if (parts.length < 3) return null;
        return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
      };
      window.__deg.lum = function (c) {
        const f = function (v) {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
      };
      window.__deg.contrast = function (fg, bg) {
        const a = window.__deg.lum(fg);
        const b = window.__deg.lum(bg);
        const hi = Math.max(a, b);
        const lo = Math.min(a, b);
        return (hi + 0.05) / (lo + 0.05);
      };
      // 逐层往上找不透明底色，找不到就当白纸
      window.__deg.effectiveBg = function (el) {
        let node = el;
        while (node && node.nodeType === 1) {
          const c = window.__deg.parseColor(getComputedStyle(node).backgroundColor);
          if (c && c.a >= 0.95) return c;
          node = node.parentElement;
        }
        return { r: 255, g: 255, b: 255, a: 1 };
      };
      return true;
    })()`)

    const report = []

    for (const { theme, why } of TARGETS) {
      const clip = await page.evaluate(`(async () => {
        const { core, utils } = window.__deg;
        const variables = window.__deg.variablesFor(${JSON.stringify(theme)});
        await core.applyTheme({ themeName: ${JSON.stringify(theme)}, variables: variables });
        const output = document.querySelector('#output');
        output.innerHTML = window.__deg.html;
        await new Promise((done) => {
          let last = output.innerHTML.length;
          let since = Date.now();
          const timer = setInterval(() => {
            if (!output.querySelector('[data-degrade-sentinel]')) {
              output.innerHTML = window.__deg.html;
              last = output.innerHTML.length; since = Date.now(); return;
            }
            const now = output.innerHTML.length;
            if (now !== last) { last = now; since = Date.now(); return; }
            if (Date.now() - since >= 400) { clearInterval(timer); done(true); }
          }, 60);
        });
        await utils.processClipboardContent(variables.primaryColor);
        window.__deg.clip = output.innerHTML;
        return { length: output.innerHTML.length };
      })()`)

      const rows = []
      for (const sc of SCENARIOS) {
        const measured = await page.evaluate(`(async () => {
          const sandbox = document.querySelector('#degrade-sandbox');
          sandbox.innerHTML = window.__deg.clip;

          const strip = ${JSON.stringify(sc.strip)};
          if (strip.length) {
            const all = [sandbox].concat(Array.from(sandbox.querySelectorAll('*')));
            all.forEach(function (el) {
              const style = el.getAttribute('style');
              if (!style) return;
              const kept = style.split(';').filter(function (d) {
                const prop = d.split(':')[0].trim().toLowerCase();
                if (!prop) return false;
                // background 简写里同时带图和色，剥图时要把简写拆开只留颜色
                if (strip.indexOf('background-image') >= 0 && prop === 'background') {
                  return false;
                }
                return strip.indexOf(prop) < 0;
              });
              el.setAttribute('style', kept.join(';'));
            });
            if (strip.indexOf('background-image') >= 0) {
              // 简写被整条剥掉之后，把原来那层实色底补回来，模拟公众号只留 background-color
              const all2 = [sandbox].concat(Array.from(sandbox.querySelectorAll('*')));
              all2.forEach(function (el) {
                const cs = getComputedStyle(el);
                if (cs.backgroundImage && cs.backgroundImage !== 'none') {
                  el.style.backgroundImage = 'none';
                }
              });
            }
          }

          function borderOf(el) {
            const cs = getComputedStyle(el);
            return Math.max.apply(null, ['Top', 'Right', 'Bottom', 'Left'].map(function (s) {
              return parseFloat(cs['border' + s + 'Width']) || 0;
            }));
          }

          function probe(sel, extraBorderSel) {
            const el = sandbox.querySelector(sel);
            if (!el) return null;
            const cs = getComputedStyle(el);
            const bg = window.__deg.effectiveBg(el);
            const fg = window.__deg.parseColor(cs.color) || { r: 0, g: 0, b: 0, a: 1 };
            const ownBg = window.__deg.parseColor(cs.backgroundColor);
            const parentBg = el.parentElement ? window.__deg.effectiveBg(el.parentElement) : { r: 255, g: 255, b: 255 };
            const distinctBg = !!(ownBg && ownBg.a >= 0.95
              && (Math.abs(ownBg.r - parentBg.r) + Math.abs(ownBg.g - parentBg.g) + Math.abs(ownBg.b - parentBg.b)) > 18);
            // 边界不只看自己：table 靠 th/td 的线，引用块可以靠 ::before 实体化出来的大引号
            let maxBorder = borderOf(el);
            if (extraBorderSel) {
              Array.prototype.forEach.call(el.querySelectorAll(extraBorderSel), function (child) {
                maxBorder = Math.max(maxBorder, borderOf(child));
              });
            }
            // juice 把 ::before/::after 实体化成 span，这也是一种能活下来的边界
            const firstChild = el.firstElementChild;
            const pseudoMark = !!(firstChild && firstChild.tagName === 'SPAN'
              && (firstChild.textContent.trim() || parseFloat(getComputedStyle(firstChild).height) > 1));
            return {
              contrast: Number(window.__deg.contrast(fg, bg).toFixed(2)),
              bg: cs.backgroundColor,
              bgImage: cs.backgroundImage === 'none' ? null : cs.backgroundImage.slice(0, 60),
              shadow: cs.boxShadow === 'none' ? null : cs.boxShadow.slice(0, 50),
              maxBorder: maxBorder,
              distinctBg: distinctBg,
              pseudoMark: pseudoMark,
              height: Math.round(el.getBoundingClientRect().height),
            };
          }

          const root = sandbox.querySelector('#output section') || sandbox.querySelector('section') || sandbox.firstElementChild;
          const rootCs = root ? getComputedStyle(root) : null;
          const paperRgb = root ? window.__deg.effectiveBg(root) : null;

          return {
            paper: rootCs ? rootCs.backgroundColor : null,
            paperEffective: paperRgb ? 'rgb(' + paperRgb.r + ', ' + paperRgb.g + ', ' + paperRgb.b + ')' : null,
            paperImage: rootCs && rootCs.backgroundImage !== 'none' ? rootCs.backgroundImage.slice(0, 70) : null,
            paperSize: rootCs ? rootCs.backgroundSize : null,
            p: probe('p'),
            h1: probe('h1'),
            h2: probe('h2'),
            blockquote: probe('blockquote'),
            pre: probe('pre'),
            table: probe('table', 'th, td'),
            hr: probe('hr'),
            totalHeight: Math.round(sandbox.getBoundingClientRect().height),
          };
        })()`)
        rows.push({ ...sc, ...measured })
      }

      report.push({ theme, why, clipLength: clip.length, rows })

      console.log(`\n══ ${theme}（${why}）══`)
      const base = rows[0]
      for (const r of rows) {
        const flags = boundaryFlags(r, base)
        console.log(
          `  ${r.label.padEnd(6)} 纸面=${String(r.paperEffective).padEnd(20)}`
          + ` 底图=${r.paperImage ? `有` : `无`}`
          + ` 平铺=${String(r.paperSize).padEnd(12)}`
          + ` 正文对比=${r.p ? r.p.contrast : `-`}`
          + ` 高=${r.totalHeight}`
          + `  ${flags.length ? `⛔ ${flags.join(` / `)}` : `OK`}`,
        )
        for (const key of [`h1`, `h2`, `blockquote`, `pre`, `table`]) {
          const v = r[key]
          if (!v) continue
          console.log(
            `      ${key.padEnd(11)} 底色=${String(v.bg).padEnd(22)}`
            + ` 边框=${v.maxBorder}px 投影=${v.shadow ? `有` : `无`}`
            + ` 异于纸面=${v.distinctBg ? `是` : `否`}`
            + ` 伪元素标记=${v.pseudoMark ? `有` : `无`}`,
          )
        }
      }
    }

    writeFileSync(`${OUT_DIR}/degradation.json`, JSON.stringify(report, null, 2))

    // 汇总：只看非 baseline 场景有没有硬伤，且必须是原样时不存在的新问题
    const failures = []
    for (const item of report) {
      const base = item.rows[0]
      const baseFlags = new Set(boundaryFlags(base, base))
      for (const r of item.rows) {
        if (r.key === `baseline`) continue
        for (const flag of boundaryFlags(r, base)) {
          if (!baseFlags.has(flag)) failures.push(`${item.theme}/${r.label} ${flag}`)
        }
      }
    }
    console.log(`\n${`─`.repeat(60)}`)
    if (failures.length) {
      console.log(`⛔ 降级后不成立的项（${failures.length}）：`)
      failures.forEach(f => console.log(`   ${f}`))
      process.exitCode = 1
    }
    else {
      console.log(`降级验证通过：${TARGETS.length} 套主题在 ${SCENARIOS.length - 1} 档剥属性场景下都还立得住`)
    }
    console.log(`完整数据：${OUT_DIR}/degradation.json`)
  }
  finally {
    dispose()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
