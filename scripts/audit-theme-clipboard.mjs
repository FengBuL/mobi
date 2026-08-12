// 18 套主题靠伪元素撑辨识度，3 套靠 CSS counter 自动编号。
// 但公众号只认内联样式，伪元素和计数器都不是真实 DOM 节点。
// 这个脚本走一遍真实的复制管线（processClipboardContent），看这些装饰到底还在不在——
// 如果不在，那「预览里好看」就不等于「读者看到好看」，辨识度得分要按剪贴板产物重打。
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { launchPage } from './lib/wechat-cdp.mjs'

const DEBUG_PORT = Number(process.env.MD_DEBUG_PORT || 9232)
const DEV_URL = process.env.MD_DEV_URL || `http://localhost:5173/md/`

// 只查有装饰可查的那些：伪元素 >= 1 处，或用了 counter
const TARGETS = [
  `default`,
  `magazine`,
  `pop`,
  `cyber`,
  `terminal`,
  `minimalist`,
  `academic`,
  `legal`,
  `ink`,
  `vermilion`,
  `xuan`,
  `porcelain`,
  `bloom`,
  `sequence`,
  `gallery`,
  `scoreboard`,
]

const SAMPLE_MD = [
  `# 秋季复盘与下一步`,
  ``,
  `一段正文。`,
  ``,
  `## 一、第一节`,
  ``,
  `一段正文。`,
  ``,
  `### 1.1 三级标题`,
  ``,
  `- 无序列表第一项`,
  `- 无序列表第二项`,
  ``,
  `1. 有序列表第一项`,
  `2. 有序列表第二项`,
  ``,
  `> 引用块。`,
  ``,
  `> [!NOTE]`,
  `> 提示块正文，用来检查配色有没有活着落进内联样式。`,
  ``,
  `## 二、第二节`,
  ``,
  `一段正文。`,
].join(`\n`)

async function main() {
  mkdirSync(`/tmp/theme-audit`, { recursive: true })
  const { page, dispose } = await launchPage({
    port: DEBUG_PORT,
    profile: `/tmp/md-theme-clip-profile`,
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
      window.__clip = { core, utils, themeConfig };
      // 主色跟着主题走，产物里的伪元素配色才是用户真正复制出去的那一版
      window.__clip.variables = {
        primaryColor: styleConfig.defaultStyleConfig.primaryColor,
        fontFamily: styleConfig.defaultStyleConfig.fontFamily,
        fontSize: styleConfig.defaultStyleConfig.fontSize,
      };
      window.__clip.variablesFor = function (name) {
        return Object.assign({}, window.__clip.variables, {
          primaryColor: themeConfig.getThemeDefaultPrimaryColor(name),
        });
      };
      const renderer = core.initRenderer({ isMacCodeBlock: true });
      renderer.reset({ legend: 'alt', themeMode: 'light', isMacCodeBlock: true });
      const rendered = utils.renderMarkdown(${JSON.stringify(SAMPLE_MD)}, renderer);
      window.__clip.html = utils.postProcessHtml(rendered.html, rendered.readingTime, renderer)
        + '<p data-audit-sentinel style="height:0;margin:0;overflow:hidden;">.</p>';

      await new Promise((done) => {
        const output = document.querySelector('#output');
        let last = output.innerHTML.length;
        let since = Date.now();
        const timer = setInterval(() => {
          const now = output.innerHTML.length;
          if (now !== last) { last = now; since = Date.now(); return; }
          if (Date.now() - since >= 800) { clearInterval(timer); done(true); }
        }, 60);
      });
      return true;
    })()`)

    // ── 对照实验：::marker 到底能不能进剪贴板 ──
    // 设计语言研究是「推断」juice 不处理 ::marker。这里临时注一条 li::marker 规则再走一遍
    // 复制管线，直接看产物里还有没有这个颜色。这是把推断变成实测的唯一办法。
    const pseudoProbe = await page.evaluate(`(async () => {
      const { core, utils } = window.__clip;
      const variables = window.__clip.variablesFor('default');
      await core.applyTheme({ themeName: 'default', variables: variables });

      const probeStyle = document.createElement('style');
      probeStyle.id = 'marker-probe';
      // 用 #output 前缀对齐主题 CSS 的作用域，同时把原生 marker 放回来才看得到效果
      probeStyle.textContent =
        '#output section ul, #output section ol { list-style-type: disc !important; }'
        + '#output section li::marker { color: rgb(1, 2, 3) !important; }'
        + '#output section li::first-letter { color: rgb(4, 5, 6) !important; }';
      document.head.appendChild(probeStyle);

      const output = document.querySelector('#output');
      output.innerHTML = window.__clip.html;
      await new Promise(function (done) { setTimeout(done, 500); });

      const li = output.querySelector('ul li');
      const previewMarker = li ? getComputedStyle(li, '::marker').color : null;
      const previewFirstLetter = li ? getComputedStyle(li, '::first-letter').color : null;

      await utils.processClipboardContent(variables.primaryColor);
      const clipboard = output.innerHTML;
      probeStyle.remove();

      return {
        previewMarker: previewMarker,
        previewFirstLetter: previewFirstLetter,
        clipHasMarkerColor: clipboard.indexOf('1, 2, 3') >= 0 || clipboard.indexOf('rgb(1,2,3)') >= 0,
        clipHasFirstLetterColor: clipboard.indexOf('4, 5, 6') >= 0 || clipboard.indexOf('rgb(4,5,6)') >= 0,
        clipHasMarkerSelector: /::marker/.test(clipboard),
        clipHasListStyleColor: /list-style-color/.test(clipboard),
      };
    })()`)

    console.log(`── 对照实验：伪元素能不能进剪贴板 ──`)
    console.log(`  li::marker        预览生效=${pseudoProbe.previewMarker} → 产物里找到该颜色=${pseudoProbe.clipHasMarkerColor}`
      + ` / 残留 ::marker 选择器=${pseudoProbe.clipHasMarkerSelector} / list-style-color=${pseudoProbe.clipHasListStyleColor}`)
    console.log(`  li::first-letter  预览生效=${pseudoProbe.previewFirstLetter} → 产物里找到该颜色=${pseudoProbe.clipHasFirstLetterColor}`)
    console.log(`  结论：${pseudoProbe.clipHasMarkerColor ? `::marker 能进剪贴板（推断错了）` : `::marker 进不了剪贴板，推断成立 —— 必须自绘`}\n`)

    const rows = []
    const alertIssues = []
    const markerRows = []
    const svgIssues = []
    for (const theme of TARGETS) {
      const result = await page.evaluate(`(async () => {
        const { core, utils } = window.__clip;
        const variables = window.__clip.variablesFor(${JSON.stringify(theme)});
        await core.applyTheme({ themeName: ${JSON.stringify(theme)}, variables: variables });
        const output = document.querySelector('#output');
        output.innerHTML = window.__clip.html;
        await new Promise((done) => {
          let last = output.innerHTML.length;
          let since = Date.now();
          const timer = setInterval(() => {
            if (!output.querySelector('[data-audit-sentinel]')) {
              output.innerHTML = window.__clip.html;
              last = output.innerHTML.length; since = Date.now(); return;
            }
            const now = output.innerHTML.length;
            if (now !== last) { last = now; since = Date.now(); return; }
            if (Date.now() - since >= 400) { clearInterval(timer); done(true); }
          }, 60);
        });

        // 复制前先记下预览里伪元素画了什么
        const before = [];
        ['h1', 'h2', 'h3', 'blockquote'].forEach((tag) => {
          const el = output.querySelector(tag);
          if (!el) return;
          ['::before', '::after'].forEach((which) => {
            const cs = getComputedStyle(el, which);
            if (!cs.content || cs.content === 'none') return;
            before.push(tag + which + ' = ' + cs.content + ' / ' + cs.width + 'x' + cs.height + ' / ' + cs.backgroundColor);
          });
        });

        await utils.processClipboardContent(variables.primaryColor);
        const clipboard = output.innerHTML;

        // 产物里能不能找到「伪元素被 juice 实体化后的痕迹」
        const holder = document.createElement('div');
        holder.innerHTML = clipboard;
        const spans = Array.from(holder.querySelectorAll('h1 > span, h2 > span, h3 > span, blockquote > span'));
        const injected = spans.map((s) => (s.getAttribute('style') || '').slice(0, 70) + ' | 文本=' + JSON.stringify(s.textContent));

        // counter() 是否被当成字面量留在产物里（那就等于编号丢了）
        const literalCounter = /counter\\s*\\(/.test(clipboard);
        const h2Text = (holder.querySelector('h2') || {}).textContent || '';

        const svgSelectors = ['section', 'h1', 'h2', 'blockquote:not(.markdown-alert)'];
        const previewSvg = svgSelectors.flatMap(function (selector) {
          return Array.from(output.querySelectorAll(selector)).slice(0, 1).map(function (el) {
            const image = getComputedStyle(el).backgroundImage || '';
            return { selector: selector, image: image, hasSvg: /data:image\\/svg\\+xml/i.test(image) };
          });
        }).filter(function (item) { return item.hasSvg; });
        const clipSvg = Array.from(holder.querySelectorAll('[style]')).map(function (el) {
          const style = el.getAttribute('style') || '';
          return { tag: el.tagName.toLowerCase(), style: style };
        }).filter(function (item) { return /data:image\\/svg\\+xml/i.test(item.style); });
        const svg = {
          previewCount: previewSvg.length,
          clipboardCount: clipSvg.length,
          preview: previewSvg,
          clipboard: clipSvg.map(function (item) {
            return item.tag + ' ' + item.style.slice(0, 180);
          }),
          hasRawHash: clipSvg.some(function (item) {
            return /data:image\\/svg\\+xml[^)]*#/i.test(item.style);
          }),
        };

        // 提示块的配色由 color-mix 推导，juice 内联后必须已经落成 rgb/#hex，
        // 留下 var() / color-mix() / color(srgb) 字面量的话公众号会整条丢弃，
        // 提示块就会变回白底浅字——正是这轮要修掉的那个故障。
        const alertBox = holder.querySelector('.markdown-alert-note');
        const alertBody = alertBox
          ? Array.prototype.find.call(alertBox.querySelectorAll('p'), function (el) {
              return !/alert-title/.test(el.className || '');
            })
          : null;
        const unresolved = /var\\(|color-mix\\(|color\\(\\s*srgb/i;
        const alertStyle = alertBox ? (alertBox.getAttribute('style') || '') : '';
        const alertBodyStyle = alertBody ? (alertBody.getAttribute('style') || '') : '';
        const alert = {
          found: !!alertBox,
          hasBackground: /background(-color)?\\s*:/.test(alertStyle),
          hasColor: /(^|;)\\s*color\\s*:/.test(alertStyle),
          bodyHasColor: /(^|;)\\s*color\\s*:/.test(alertBodyStyle),
          unresolved: unresolved.test(alertStyle) || unresolved.test(alertBodyStyle),
          sample: alertStyle.slice(0, 150),
        };

        // li::marker：juice 的 inlinePseudoElements 只处理 ::before/::after，
        // ::marker 不在其中，所以序号 / 圆点改由渲染器画成 <span class="listitem-marker">。
        // 这里查三件事：预览里 marker 是不是真实节点、产物里那个 span 有没有带上颜色、
        // 以及颜色是不是真的跟正文不同（不同才说明主题的 marker 配色活着到了对面）。
        const previewLi = output.querySelector('ul li');
        const previewMarkerSpan = previewLi ? previewLi.querySelector('.listitem-marker') : null;
        const previewMarkerColor = previewMarkerSpan ? getComputedStyle(previewMarkerSpan).color : null;
        const previewLiColor = previewLi ? getComputedStyle(previewLi).color : null;
        const previewPseudoMarker = previewLi ? getComputedStyle(previewLi, '::marker') : null;
        const clipUl = holder.querySelector('ul');
        const clipLi = holder.querySelector('ul li');
        const clipMarkerSpan = clipLi ? clipLi.querySelector('.listitem-marker') : null;
        const clipMarkerStyle = clipMarkerSpan ? (clipMarkerSpan.getAttribute('style') || '') : '';
        const clipMarkerColor = (clipMarkerStyle.match(/(?:^|;)\\s*color\\s*:\\s*([^;]+)/) || [])[1] || null;
        // 原生 marker 还在的话会跟自绘前缀叠成两个点
        const clipUlStyle = clipUl ? (clipUl.getAttribute('style') || '') : '';
        const listStyleNone = /list-style-type\\s*:\\s*none/.test(clipUlStyle);
        const marker = {
          previewMarkerIsRealNode: !!previewMarkerSpan,
          previewMarkerText: previewMarkerSpan ? previewMarkerSpan.textContent : null,
          previewMarkerColor: previewMarkerColor,
          previewLiColor: previewLiColor,
          previewPseudoMarkerContent: previewPseudoMarker ? previewPseudoMarker.content : null,
          markerDiffersFromText: !!(previewMarkerColor && previewLiColor && previewMarkerColor !== previewLiColor),
          clipUlStyle: clipUlStyle,
          clipLiStyle: clipLi ? (clipLi.getAttribute('style') || '') : null,
          clipMarkerText: clipMarkerSpan ? clipMarkerSpan.textContent : null,
          clipMarkerColor: clipMarkerColor ? clipMarkerColor.trim() : null,
          colorSurvived: !!(clipMarkerColor && previewMarkerColor
            && clipMarkerColor.replace(/\\s/g, '') === previewMarkerColor.replace(/\\s/g, '')),
          listStyleNone: listStyleNone,
          doubleMarkerRisk: !listStyleNone && !!clipMarkerSpan,
        };

        return { before, injected, literalCounter, h2Text, svg, alert, marker, clipLength: clipboard.length };
      })()`)

      rows.push({ theme, ...result })
      const kept = result.injected.length
      console.log(`${theme.padEnd(12)} 预览伪元素 ${String(result.before.length).padStart(2)} 处 → 产物里实体化 ${String(kept).padStart(2)} 个 span${result.literalCounter ? `  ⛔ 产物残留 counter() 字面量` : ``}`)
      result.before.forEach(item => console.log(`    预览 ${item}`))
      result.injected.forEach(item => console.log(`    产物 ${item}`))
      if (/^\s*\d/.test(result.h2Text)) {
        console.log(`    h2 文本 = ${JSON.stringify(result.h2Text)}`)
      }
      const svg = result.svg
      const svgOk = svg.previewCount === 0 || (svg.clipboardCount >= svg.previewCount && !svg.hasRawHash)
      if (!svgOk) {
        svgIssues.push(theme)
      }
      console.log(`    SVG 背景 ${svgOk ? `OK` : `⛔`} 预览=${svg.previewCount} 产物=${svg.clipboardCount} 裸#=${svg.hasRawHash}`)
      const alert = result.alert
      const alertOk = alert.found && alert.hasBackground && alert.hasColor && alert.bodyHasColor && !alert.unresolved
      if (!alertOk) {
        alertIssues.push(theme)
      }
      console.log(`    提示块 ${alertOk ? `OK` : `⛔`} 底色=${alert.hasBackground} 字色=${alert.hasColor} 正文字色=${alert.bodyHasColor} 残留未解析值=${alert.unresolved}`)

      const m = result.marker
      if (m) {
        // 自绘节点存在、颜色跟着内联出去、且原生 marker 已关掉 = 预览与导出一致
        const lost = !m.previewMarkerIsRealNode || !m.clipMarkerText || !m.colorSurvived
        markerRows.push({ theme, ...m, lost })
        console.log(
          `    列表符号 预览=${JSON.stringify(m.previewMarkerText)}@${m.previewMarkerColor}`
          + ` 产物=${JSON.stringify(m.clipMarkerText)}@${m.clipMarkerColor}`
          + ` 与正文异色=${m.markerDiffersFromText}`
          + ` 原生marker已关=${m.listStyleNone}`
          + ` 双重符号风险=${m.doubleMarkerRisk}`
          + ` ${lost ? `⛔ 预览与导出不一致` : `OK`}`,
        )
      }
    }

    writeFileSync(`/tmp/theme-audit/clipboard-check.json`, JSON.stringify(rows, null, 2))

    const markerLost = markerRows.filter(r => r.lost)
    console.log(`\n列表 marker 实测：${markerRows.length} 套里 ${markerLost.length} 套预览与导出不一致`)
    if (markerLost.length) {
      console.log(`  丢失：${markerLost.map(r => r.theme).join(`, `)}`)
    }
    if (alertIssues.length) {
      console.log(`\n⛔ 提示块内联失败：${alertIssues.join(`, `)}`)
      process.exitCode = 1
    }
    else {
      console.log(`\n提示块内联检查：${rows.length}/${rows.length} 套底色与字色都已落成 rgb/#hex`)
    }
    if (svgIssues.length) {
      console.log(`\n⛔ SVG 背景穿过复制链路失败：${svgIssues.join(`, `)}`)
      process.exitCode = 1
    }
    else {
      const svgThemes = rows.filter(row => row.svg.previewCount > 0)
      console.log(`SVG 背景内联检查：${svgThemes.length}/${svgThemes.length} 套预览与剪贴板产物一致`)
    }
    console.log(`完整数据：/tmp/theme-audit/clipboard-check.json`)
  }
  finally {
    dispose()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
