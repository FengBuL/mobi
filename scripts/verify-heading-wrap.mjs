#!/usr/bin/env node
/**
 * 375px 折行实测
 *
 * 字号该定多大，争论点是「够不够有层级」和「会不会折行」。层级可以看数字，折行只能量。
 * 这个脚本在 375px（公众号真实阅读宽度）里排一组真实长度的中文标题，数每条占几行。
 *
 * 两部分：
 *   1. 扫描：把 h1 字号倍率从 1.45 扫到 2.05，看几字标题在哪一档开始折行。
 *      这条曲线跟主题无关，是「375px + 中文方块字」这个物理约束本身。
 *   2. 逐套：每套主题在自己最终的字号下，h1/h2/h3 各占几行。
 *
 * 用法：node scripts/verify-heading-wrap.mjs
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { launchPage } from './lib/wechat-cdp.mjs'

const DEBUG_PORT = Number(process.env.MD_DEBUG_PORT || 9237)
const DEV_URL = process.env.MD_DEV_URL || `http://localhost:5173/md/`
const OUT_DIR = `/tmp/theme-audit`
const COLUMN = 375

// 真实公众号标题长度分布大致落在 8~20 字，这里取三档
const TITLES = [
  { chars: 10, text: `秋季复盘与下一步` + `规划` },
  { chars: 14, text: `秋季复盘与下一步：三个判断和一` },
  { chars: 18, text: `秋季复盘与下一步：三个判断、两处返工和一个` },
]

const SWEEP = [1.45, 1.5, 1.55, 1.6, 1.65, 1.7, 1.75, 1.8, 1.86, 1.92, 1.96, 2.02]

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })

  const { page, dispose } = await launchPage({
    port: DEBUG_PORT,
    profile: `/tmp/md-wrap-profile`,
    devUrl: DEV_URL,
    readyExpression: `!!(document.querySelector('#md-theme') && document.querySelector('#output'))`,
  })

  try {
    const themePath = `/md/@fs${resolve(process.cwd(), `packages/shared/src/configs/theme.ts`)}`
    const stylePath = `/md/@fs${resolve(process.cwd(), `packages/shared/src/configs/style.ts`)}`
    const corePath = `/md/@fs${resolve(process.cwd(), `packages/core/src/index.ts`)}`

    const setup = await page.evaluate(`(async () => {
      const core = await import(${JSON.stringify(corePath)});
      const themeConfig = await import(${JSON.stringify(themePath)});
      const styleConfig = await import(${JSON.stringify(stylePath)});
      window.__wrap = { core, themeConfig, styleConfig };

      // 编辑器布局里预览区可能是折叠的，直接量会拿到宽 0。跟 audit-theme-visuals 一样，
      // 把 #output 搬到一个自己控制宽度的舞台上——主题 CSS 是 '#output ...' 的 ID 选择器，
      // 换父节点照样命中。
      const output = document.querySelector('#output');
      const stage = document.createElement('div');
      stage.id = 'wrap-stage';
      document.body.appendChild(stage);
      stage.appendChild(output);
      const stageStyle = document.createElement('style');
      stageStyle.textContent = [
        'html, body { margin:0 !important; padding:0 !important; }',
        'body > *:not(#wrap-stage):not(#wrap-ruler) { display:none !important; }',
        '#wrap-stage { display:block !important; width:${COLUMN}px; box-sizing:border-box; }',
        '#output { display:block !important; width:100% !important; }',
        '#output section { box-sizing:border-box; }',
      ].join('\\n');
      document.head.appendChild(stageStyle);

      // 独立量尺：不吃主题样式，用来扫「纯字号 vs 折行」的物理关系
      const ruler = document.createElement('div');
      ruler.id = 'wrap-ruler';
      ruler.setAttribute('style', 'display:block;width:${COLUMN}px;padding:0;overflow:hidden;');
      document.body.appendChild(ruler);

      // 折行数只能量文字本身。用元素高度除行高会把眉标、装饰条一起算进去，
      // ink 那种带两条水墨线的 h1 会被算成 4 行，看着像折行其实没折。
      // Range.getClientRects() 每行文字返回一个矩形，这才是真正的折行数。
      window.__wrap.lines = function (el) {
        let node = null;
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          if (walker.currentNode.textContent.trim().length > 1) { node = walker.currentNode; break; }
        }
        if (!node) return 1;
        const range = document.createRange();
        range.selectNodeContents(node);
        const rects = Array.prototype.filter.call(range.getClientRects(), function (r) {
          return r.width > 0.5 && r.height > 0.5;
        });
        // 同一行可能被切成多个矩形，按 top 去重
        const tops = [];
        rects.forEach(function (r) {
          if (!tops.some(function (t) { return Math.abs(t - r.top) < 2; })) tops.push(r.top);
        });
        return Math.max(1, tops.length);
      };
      return {
        themes: themeConfig.themeOptions.map(function (t) { return { value: t.value, label: t.label }; }),
        bodyFontSize: styleConfig.defaultStyleConfig.fontSize,
      };
    })()`)

    console.log(`版心 ${COLUMN}px，产品默认正文 ${setup.bodyFontSize}\n`)

    // ── 第一部分：字号扫描 ──
    // 用 16px 正文（语料里 76% 的文章是 16px）作为基准来扫，结论才对得上语料。
    // 关键指标不是「折不折」而是「一行装得下几个字」——这才是字号涨价的直接代价。
    const sweep = await page.evaluate(`(async () => {
      const ruler = document.querySelector('#wrap-ruler');
      const titles = ${JSON.stringify(TITLES)};
      const scales = ${JSON.stringify(SWEEP)};
      const out = [];
      for (const scale of scales) {
        const row = { scale: scale, px: Math.round(16 * scale * 100) / 100, lines: {}, fitChars: 0 };

        // 一行能装几个汉字：一个字一个字加，高度一涨就说明换行了
        ruler.innerHTML = '<h1 id="probe" style="margin:0;padding:0;font-size:'
          + (16 * scale) + 'px;line-height:1.3;font-weight:800;white-space:normal;'
          + 'font-family:-apple-system,BlinkMacSystemFont,PingFang SC,sans-serif;"></h1>';
        const probe = ruler.querySelector('#probe');
        probe.textContent = '复';
        const oneLine = probe.getBoundingClientRect().height;
        for (let n = 2; n <= 40; n++) {
          probe.textContent = '复'.repeat(n);
          if (probe.getBoundingClientRect().height > oneLine + 1) { row.fitChars = n - 1; break; }
          row.fitChars = n;
        }

        for (const t of titles) {
          probe.textContent = t.text;
          row.lines[t.chars] = window.__wrap.lines(probe);
        }
        out.push(row);
      }
      ruler.innerHTML = '';
      return out;
    })()`)

    console.log(`── h1 字号扫描（正文锚定 16px，行高 1.3，粗体）──`)
    console.log(`倍率`.padEnd(8) + `实际px`.padStart(8) + `一行几字`.padStart(10) + TITLES.map(t => `${t.chars}字`.padStart(8)).join(``))
    for (const row of sweep) {
      console.log(
        row.scale.toFixed(2).padEnd(8)
        + String(row.px).padStart(8)
        + `${row.fitChars} 字`.padStart(10)
        + TITLES.map(t => `${row.lines[t.chars]} 行`.padStart(8)).join(``),
      )
    }
    const firstWrap = {}
    for (const t of TITLES) {
      const hit = sweep.find(r => r.lines[t.chars] > 1)
      firstWrap[t.chars] = hit ? hit.scale : null
    }
    console.log(`\n开始折行的倍率：${TITLES.map(t => `${t.chars}字 → ${firstWrap[t.chars] ?? `扫到 2.02 都不折`}`).join(`，`)}`)

    // ── 第二部分：逐套主题在真实样式下的行数 ──
    const rows = []
    for (const theme of setup.themes) {
      const result = await page.evaluate(`(async () => {
        const { core, themeConfig, styleConfig } = window.__wrap;
        const variables = {
          primaryColor: themeConfig.getThemeDefaultPrimaryColor(${JSON.stringify(theme.value)}),
          fontFamily: styleConfig.defaultStyleConfig.fontFamily,
          fontSize: '16px',
        };
        await core.applyTheme({ themeName: ${JSON.stringify(theme.value)}, variables: variables });
        await new Promise(function (d) { setTimeout(d, 120); });

        // 主题 CSS 的作用域是 #output section 的后代，所以量尺塞进 section 里就能吃到真实样式，
        // 同时给量尺写死 375px，不受预览区自身宽度影响
        const output = document.querySelector('#output');
        const section = output.querySelector('section') || output;
        const titles = ${JSON.stringify(TITLES)};
        const long = titles[titles.length - 1].text;
        const mid = titles[1].text;
        section.innerHTML =
          '<div id="wrap-inner" style="padding:0;margin:0;">'
          + '<h1>' + long + '</h1>'
          + '<h1 class="mid">' + mid + '</h1>'
          + '<h2>' + mid + '</h2>'
          + '<h3>' + mid + '</h3>'
          + '<p>一段正文，用来对照标题的实际高度。</p>'
          + '</div>';
        await new Promise(function (d) { requestAnimationFrame(function () { requestAnimationFrame(d); }); });

        const inner = section.querySelector('#wrap-inner');
        function measureLines(sel) {
          const el = inner.querySelector(sel);
          return el ? window.__wrap.lines(el) : null;
        }
        function info(sel) {
          const el = inner.querySelector(sel);
          if (!el) return null;
          const cs = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return {
            lines: window.__wrap.lines(el),
            fontPx: Math.round(parseFloat(cs.fontSize) * 10) / 10,
            scale: Math.round((parseFloat(cs.fontSize) / 16) * 100) / 100,
            boxWidth: Math.round(rect.width),
            innerWidth: Math.round(inner.getBoundingClientRect().width),
            display: cs.display,
          };
        }
        const out = { h1: info('h1'), h2: info('h2'), h3: info('h3'), h1Mid: measureLines('h1.mid') };

        // 对照：把 h1 强行拉回上一轮的中位字号 1.86，同一条标题会多占几行
        let probe = document.querySelector('#wrap-old-scale');
        if (!probe) {
          probe = document.createElement('style');
          probe.id = 'wrap-old-scale';
          document.head.appendChild(probe);
        }
        probe.textContent = '#output section h1 { font-size: calc(var(--md-font-size) * 1.86) !important; }';
        await new Promise(function (d) { requestAnimationFrame(function () { requestAnimationFrame(d); }); });
        out.oldScaleLines = measureLines('h1');
        out.oldScaleMidLines = measureLines('h1.mid');
        probe.textContent = '';
        return out;
      })()`)
      rows.push({ ...theme, ...result })
    }

    console.log(`\n── 逐套主题在 375px 的折行情况（正文 16px，行数只数文字本身，不含眉标与装饰条）──`)
    console.log(
      `主题`.padEnd(14) + `版心`.padStart(6) + `h1字号`.padStart(9)
      + `18字`.padStart(7) + `14字`.padStart(7) + `旧1.86下18字`.padStart(15) + `旧1.86下14字`.padStart(15)
      + `h2字号`.padStart(9) + `h2(14字)`.padStart(10) + `h3字号`.padStart(9) + `h3(14字)`.padStart(10),
    )
    for (const r of rows) {
      console.log(
        r.value.padEnd(14)
        + `${r.h1?.innerWidth ?? `-`}`.padStart(6)
        + `${r.h1?.fontPx ?? `-`}px`.padStart(9)
        + `${r.h1?.lines ?? `-`}行`.padStart(7)
        + `${r.h1Mid ?? `-`}行`.padStart(7)
        + `${r.oldScaleLines ?? `-`}行`.padStart(15)
        + `${r.oldScaleMidLines ?? `-`}行`.padStart(15)
        + `${r.h2?.fontPx ?? `-`}px`.padStart(9)
        + `${r.h2?.lines ?? `-`}行`.padStart(10)
        + `${r.h3?.fontPx ?? `-`}px`.padStart(9)
        + `${r.h3?.lines ?? `-`}行`.padStart(10),
      )
    }

    const sum = (arr, key) => arr.reduce((a, r) => a + (r[key] ?? 0), 0)
    const now18 = sum(rows, `oldScaleLines`) ? null : null
    void now18
    const totalNew18 = rows.reduce((a, r) => a + (r.h1?.lines ?? 0), 0)
    const totalOld18 = sum(rows, `oldScaleLines`)
    const totalNew14 = sum(rows, `h1Mid`)
    const totalOld14 = sum(rows, `oldScaleMidLines`)
    const worse18 = rows.filter(r => (r.oldScaleLines ?? 0) > (r.h1?.lines ?? 0))
    const worse14 = rows.filter(r => (r.oldScaleMidLines ?? 0) > (r.h1Mid ?? 0))
    console.log(`\n18 字标题：现在合计 ${totalNew18} 行，拉回旧 1.86 是 ${totalOld18} 行；被旧字号多推一行的主题 ${worse18.length} 套`)
    console.log(`14 字标题：现在合计 ${totalNew14} 行，拉回旧 1.86 是 ${totalOld14} 行；被旧字号多推一行的主题 ${worse14.length} 套`
      + `${worse14.length ? ` —— ${worse14.map(r => r.value).join(`, `)}` : ``}`)
    const three = rows.filter(r => (r.h1?.lines ?? 0) >= 3)
    console.log(`现在 18 字标题占到 3 行的主题：${three.length ? three.map(r => `${r.value}(${r.h1.lines})`).join(`, `) : `无`}`)

    writeFileSync(`${OUT_DIR}/heading-wrap.json`, JSON.stringify({ sweep, firstWrap, rows }, null, 2))
    console.log(`完整数据：${OUT_DIR}/heading-wrap.json`)
  }
  finally {
    dispose()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
