// 36 套主题的逐套视觉审计截图。
//
// 只读脚本：不改任何主题 CSS，只负责把每套主题在 375px（公众号真实阅读宽度）
// 下的完整排版渲染出来并截图，供人工逐张评分。
//
// 两个已知坑位，这里都做了处理：
//   1. #output 是 Vue 的 v-html 目标，应用的渲染管线是异步的。脚本刚把样张塞进去，
//      应用可能又把默认示例文档覆盖回来——之前就截到过示例文档。所以注入之后要
//      轮询确认哨兵节点还在、innerHTML 长度稳定，被覆盖就重注入。
//   2. 一张 375×3000 的长条图缩放后根本看不清字。所以每套主题除了「原尺寸单栏图」，
//      再出一张三栏拼版的 contact sheet，字号在缩略后依然可读。
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { launchPage } from './lib/wechat-cdp.mjs'

const DEBUG_PORT = Number(process.env.MD_DEBUG_PORT || 9231)
const DEV_URL = process.env.MOBI_DEV_URL || `http://localhost:5173/mobi/`
const OUT_DIR = process.env.MD_AUDIT_DIR || `/tmp/theme-audit`
const SHEET_DIR = `${OUT_DIR}/sheet`
const COLUMN_WIDTH = 375
const STAGE_PADDING = 16
const SHEET_COLUMNS = 3
const SHEET_GAP = 28

// 一份统一样张，覆盖审计清单里点名的全部排版元素。
// 所有主题吃同一份输入，差异才只来自主题本身。
const SAMPLE_MARKDOWN = [
  `# 秋季复盘与下一步`,
  ``,
  `开篇导语，用来观察**正文字号**与行高的实际观感。这里混排了*强调文字*、\`inline code\` 以及一个[外部链接](https://example.com)，用于检查行内元素在正文流里的对比度是否自然。`,
  ``,
  `第二段正文继续铺陈，验证段间距是否均匀、段落之间有没有挤压或过度留白。中文与 English words 混排时的字距也一并观察。`,
  ``,
  `## 一、三个关键判断`,
  ``,
  `二级标题下的第一段正文，用来看标题与正文之间的呼吸感是否合理，以及 h2 与正文的字号落差够不够。`,
  ``,
  `- 无序列表第一项：检查项目符号的位置与颜色`,
  `- 无序列表第二项：**带粗体**的条目`,
  `- 无序列表第三项：条目内含 \`code\` 片段`,
  ``,
  `1. 有序列表第一项：检查序号样式`,
  `2. 有序列表第二项：检查条目行距`,
  `3. 有序列表第三项：检查左侧缩进`,
  ``,
  `### 1.1 三级标题`,
  ``,
  `> 引用块承载一段被引述的观点，检查左侧装饰、内边距与背景在窄屏下是否成立。`,
  ``,
  `> [!NOTE]`,
  `> 提示块承载补充信息，检查图标、标题行与正文的间距关系。`,
  ``,
  `> [!WARNING]`,
  `> 警告块的配色与主题是否协调，还是直接沿用了基础样式的默认配色。`,
  ``,
  `\`\`\`js`,
  `// 代码块检查等宽字体、行高与配色`,
  `function audit(theme) {`,
  `  const score = theme.detail * 0.4 + theme.identity * 0.6`,
  `  return score > 3.5 ? '保留' : '待定'`,
  `}`,
  `\`\`\``,
  ``,
  `| 维度 | 权重 | 得分 |`,
  `| --- | --- | --- |`,
  `| 视觉精致度 | 30% | 3.5 |`,
  `| 辨识度 | 30% | 2.0 |`,
  `| 完成度 | 20% | 4.0 |`,
  ``,
  `## 二、配图与分隔`,
  ``,
  `![示意图：检查图片圆角、阴影与图注样式](__SAMPLE_IMAGE__)`,
  ``,
  `---`,
  ``,
  `#### 四级标题`,
  ``,
  `结语段落，检查文末的留白与整体收束感。`,
].join(`\n`)

function sampleImageDataUri() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500">`
    + `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">`
    + `<stop offset="0" stop-color="#c7d2fe"/><stop offset="1" stop-color="#94a3b8"/></linearGradient></defs>`
    + `<rect width="800" height="500" fill="url(#g)"/>`
    + `<circle cx="250" cy="200" r="90" fill="#ffffff" opacity="0.55"/>`
    + `<rect x="380" y="270" width="330" height="150" rx="18" fill="#ffffff" opacity="0.4"/>`
    + `</svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString(`base64`)}`
}

const BROWSER_SETUP = `
window.__audit = {};

// 主题 CSS 里的深色/浅色判断只在浅色页面下才说明问题，先把应用切回浅色。
document.documentElement.classList.remove('dark');
document.documentElement.style.colorScheme = 'light';

// 把 #output 从应用的 flex 布局里摘出来，放进一个宽度可控的舞台。
// 主题 CSS 全是 '#output ...' 的 ID 选择器，换了父节点依然命中。
window.__audit.mountStage = function () {
  const output = document.querySelector('#output');
  if (!output) throw new Error('找不到 #output');
  let stage = document.querySelector('#audit-stage');
  if (!stage) {
    stage = document.createElement('div');
    stage.id = 'audit-stage';
    document.body.appendChild(stage);
    stage.appendChild(output);
  }
  let style = document.querySelector('#audit-stage-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'audit-stage-style';
    document.head.appendChild(style);
  }
  style.textContent = [
    'html, body { margin:0 !important; padding:0 !important; background:#ffffff !important; }',
    'body > *:not(#audit-stage) { display:none !important; }',
    '#audit-stage { box-sizing:border-box; background:#ffffff; padding:${STAGE_PADDING}px; }',
    '#audit-stage.single { width:${COLUMN_WIDTH}px; }',
    '#audit-stage.sheet { width:${SHEET_COLUMNS * COLUMN_WIDTH + (SHEET_COLUMNS - 1) * SHEET_GAP + STAGE_PADDING * 2}px;',
    '  column-count:${SHEET_COLUMNS}; column-gap:${SHEET_GAP}px; column-fill:balance;',
    '  column-rule:1px dashed #cbd5e1; }',
    '#output { width:100%; }',
  ].join('\\n');
  window.__audit.stage = stage;
  window.__audit.output = output;
  return true;
};

// 应用可能把 #output 重新写一遍。哨兵掉了就重注入，长度连续稳定才算落定。
window.__audit.injectAndSettle = function (html, quietMs) {
  const output = window.__audit.output;
  return new Promise(function (done) {
    let reinjected = 0;
    const write = function () { output.innerHTML = html; };
    write();
    let last = output.innerHTML.length;
    let stableSince = Date.now();
    const timer = setInterval(function () {
      if (!output.querySelector('[data-audit-sentinel]')) {
        reinjected += 1;
        write();
        last = output.innerHTML.length;
        stableSince = Date.now();
        return;
      }
      const now = output.innerHTML.length;
      if (now !== last) { last = now; stableSince = Date.now(); return; }
      if (Date.now() - stableSince >= quietMs) { clearInterval(timer); done(reinjected); }
    }, 60);
  });
};

window.__audit.settleVisuals = async function () {
  const stage = window.__audit.stage;
  await Promise.all(Array.prototype.slice.call(stage.querySelectorAll('img')).map(function (image) {
    return (image.complete && image.naturalWidth)
      ? null
      : new Promise(function (r) {
          image.addEventListener('load', r, { once: true });
          image.addEventListener('error', r, { once: true });
        });
  }));
  if (document.fonts && document.fonts.ready) { await document.fonts.ready; }
  await new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });
  return true;
};

window.__audit.setMode = function (mode) {
  const stage = window.__audit.stage;
  stage.className = mode;
  return true;
};

window.__audit.measure = function () {
  const stage = window.__audit.stage;
  const rect = stage.getBoundingClientRect();
  return { width: Math.ceil(rect.width), height: Math.ceil(rect.height) };
};

// 量化指标：把肉眼要判断的东西（字号层级、行高、间距、配色）先测成数字。
// 「h2 和正文字号差距太小」这种结论要有据可依，不能只凭印象。
window.__audit.metrics = function () {
  const root = window.__audit.output;
  const px = function (v) { return Math.round(Number.parseFloat(v) * 100) / 100; };
  const pick = function (selector, props) {
    const el = root.querySelector(selector);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const out = {};
    props.forEach(function (p) { out[p] = cs.getPropertyValue(p); });
    return out;
  };
  const box = function (selector) {
    const el = root.querySelector(selector);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      fontSize: px(cs.fontSize),
      lineHeight: cs.lineHeight === 'normal' ? 'normal' : px(cs.lineHeight),
      fontWeight: cs.fontWeight,
      color: cs.color,
      background: cs.backgroundColor,
      backgroundImage: cs.backgroundImage === 'none' ? '' : cs.backgroundImage.slice(0, 90),
      marginTop: px(cs.marginTop),
      marginBottom: px(cs.marginBottom),
      paddingLeft: px(cs.paddingLeft),
      paddingTop: px(cs.paddingTop),
      borderLeft: cs.borderLeftWidth === '0px' ? '' : cs.borderLeftWidth + ' ' + cs.borderLeftStyle + ' ' + cs.borderLeftColor,
      borderBottom: cs.borderBottomWidth === '0px' ? '' : cs.borderBottomWidth + ' ' + cs.borderBottomStyle + ' ' + cs.borderBottomColor,
      borderRadius: cs.borderTopLeftRadius,
      letterSpacing: cs.letterSpacing,
      textAlign: cs.textAlign,
      textTransform: cs.textTransform,
    };
  };
  // 伪元素装饰是辨识度的关键指标，computed style 能直接问出来。
  const pseudo = function (selector, which) {
    const el = root.querySelector(selector);
    if (!el) return null;
    const cs = getComputedStyle(el, which);
    if (!cs.content || cs.content === 'none') return null;
    return {
      content: cs.content.slice(0, 30),
      width: cs.width,
      height: cs.height,
      background: cs.backgroundColor,
      backgroundImage: cs.backgroundImage === 'none' ? '' : cs.backgroundImage.slice(0, 70),
      color: cs.color,
      fontSize: px(cs.fontSize),
    };
  };
  const sectionCS = getComputedStyle(root.querySelector('section') || root);
  return {
    section: { background: sectionCS.backgroundColor, color: sectionCS.color },
    h1: box('h1'),
    h2: box('h2'),
    h3: box('h3'),
    h4: box('h4'),
    p: box('p'),
    li: box('li'),
    strong: box('strong'),
    em: box('em'),
    a: box('a'),
    codeInline: box('p code'),
    pre: box('.code__pre, pre'),
    blockquote: box('blockquote:not(.markdown-alert)'),
    alertNote: box('.markdown-alert-note'),
    alertWarning: box('.markdown-alert-warning'),
    alertTitle: box('.alert-title'),
    table: box('table'),
    th: box('th'),
    td: box('td'),
    hr: box('hr'),
    img: box('img'),
    figcaption: box('figcaption'),
    ul: box('ul'),
    pseudos: {
      h1Before: pseudo('h1', '::before'),
      h1After: pseudo('h1', '::after'),
      h2Before: pseudo('h2', '::before'),
      h2After: pseudo('h2', '::after'),
      h3Before: pseudo('h3', '::before'),
      h3After: pseudo('h3', '::after'),
      bqBefore: pseudo('blockquote:not(.markdown-alert)', '::before'),
      preBefore: pseudo('.code__pre, pre', '::before'),
    },
    marker: pick('li', ['list-style-type']),
  };
};
`

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  mkdirSync(SHEET_DIR, { recursive: true })

  const { page, dispose } = await launchPage({
    port: DEBUG_PORT,
    profile: `/tmp/md-theme-audit-profile`,
    devUrl: DEV_URL,
    readyExpression: `!!(document.querySelector('#md-theme') && document.querySelector('#output'))`,
  })

  const results = []

  try {
    const corePath = `/mobi/@fs${resolve(process.cwd(), `packages/core/src/index.ts`)}`
    const themePath = `/mobi/@fs${resolve(process.cwd(), `packages/shared/src/configs/theme.ts`)}`
    const stylePath = `/mobi/@fs${resolve(process.cwd(), `packages/shared/src/configs/style.ts`)}`

    // 应用启动后 #output 还会被异步渲染覆盖若干次，先等它自己安静下来。
    await page.evaluate(`(async () => {
      const output = document.querySelector('#output');
      await new Promise((done) => {
        let last = output.innerHTML.length;
        let stableSince = Date.now();
        const timer = setInterval(() => {
          const now = output.innerHTML.length;
          if (now !== last) { last = now; stableSince = Date.now(); return; }
          if (Date.now() - stableSince >= 800) { clearInterval(timer); done(true); }
        }, 60);
      });
      return true;
    })()`)

    const themes = await page.evaluate(`(async () => {
      ${BROWSER_SETUP}
      const themeConfig = await import(${JSON.stringify(themePath)});
      const styleConfig = await import(${JSON.stringify(stylePath)});
      const core = await import(${JSON.stringify(corePath)});
      const utils = await import('/mobi/src/utils/index.ts');
      window.__audit.core = core;
      window.__audit.utils = utils;
      window.__audit.themeConfig = themeConfig;
      // 用产品出厂默认值，审计的才是用户真正看到的样子。
      // 主色现在跟着主题走，每套主题各取自己的 defaultPrimaryColor。
      window.__audit.variables = {
        fontFamily: styleConfig.defaultStyleConfig.fontFamily,
        fontSize: styleConfig.defaultStyleConfig.fontSize,
      };
      window.__audit.primaryColorOf = function (name) {
        return themeConfig.getThemeDefaultPrimaryColor
          ? themeConfig.getThemeDefaultPrimaryColor(name)
          : styleConfig.defaultStyleConfig.primaryColor;
      };

      // 渲染器只建一次，样张 HTML 也只生成一次：所有主题吃完全相同的 DOM。
      const renderer = core.initRenderer({ isMacCodeBlock: true, isShowLineNumber: false });
      renderer.reset({
        legend: 'alt',
        citeStatus: false,
        countStatus: false,
        isMacCodeBlock: true,
        isShowLineNumber: false,
        themeMode: 'light',
        headingDecorationStatus: false,
      });
      const markdown = ${JSON.stringify(SAMPLE_MARKDOWN)}.replace('__SAMPLE_IMAGE__', ${JSON.stringify(sampleImageDataUri())});
      const rendered = utils.renderMarkdown(markdown, renderer);
      window.__audit.sampleHtml = utils.postProcessHtml(rendered.html, rendered.readingTime, renderer)
        + '<p data-audit-sentinel style="height:0;margin:0;overflow:hidden;opacity:0;">.</p>';

      window.__audit.mountStage();

      return {
        variables: window.__audit.variables,
        themes: themeConfig.themeCategoryOptions.flatMap((group) => group.themes.map((t) => ({
          category: group.category,
          label: t.label,
          value: t.value,
          desc: t.desc,
        }))),
      };
    })()`)

    const themeList = themes.themes
    console.log(`共 ${themeList.length} 套主题，出厂默认值 ${JSON.stringify(themes.variables)}（主色逐套取自 defaultPrimaryColor）\n`)

    for (const theme of themeList) {
      const record = { ...theme, ok: false }
      try {
        const applied = await page.evaluate(`(async () => {
          await window.__audit.core.applyTheme({
            themeName: ${JSON.stringify(theme.value)},
            variables: Object.assign({}, window.__audit.variables, {
              primaryColor: window.__audit.primaryColorOf(${JSON.stringify(theme.value)}),
            }),
          });
          const reinjected = await window.__audit.injectAndSettle(window.__audit.sampleHtml, 420);
          window.__audit.setMode('single');
          await window.__audit.settleVisuals();
          return {
            reinjected,
            sentinel: !!window.__audit.output.querySelector('[data-audit-sentinel]'),
            headingText: (window.__audit.output.querySelector('h1') || {}).textContent || '',
            metrics: window.__audit.metrics(),
          };
        })()`)

        if (!applied.sentinel || !applied.headingText.includes(`秋季复盘`)) {
          throw new Error(`样张被应用覆盖，截到的不是审计内容`)
        }
        record.reinjected = applied.reinjected
        record.metrics = applied.metrics

        // 单栏原尺寸：375px 宽 + 全页高
        const single = await page.evaluate(`window.__audit.measure()`)
        await page.send(`Emulation.setDeviceMetricsOverride`, {
          width: single.width,
          height: single.height,
          deviceScaleFactor: 2,
          mobile: false,
        })
        await new Promise(done => setTimeout(done, 120))
        const singleShot = await page.send(`Page.captureScreenshot`, { format: `png`, fromSurface: true })
        writeFileSync(`${OUT_DIR}/${theme.value}.png`, Buffer.from(singleShot.data, `base64`))
        record.singleHeight = single.height

        // 三栏拼版：同样是 375px 的版心，只是流进三列，缩略后仍能看清字
        await page.evaluate(`(async () => {
          window.__audit.setMode('sheet');
          await window.__audit.settleVisuals();
          return true;
        })()`)
        const sheet = await page.evaluate(`window.__audit.measure()`)
        await page.send(`Emulation.setDeviceMetricsOverride`, {
          width: sheet.width,
          height: sheet.height,
          deviceScaleFactor: 2,
          mobile: false,
        })
        await new Promise(done => setTimeout(done, 120))
        const sheetShot = await page.send(`Page.captureScreenshot`, { format: `png`, fromSurface: true })
        writeFileSync(`${SHEET_DIR}/${theme.value}.png`, Buffer.from(sheetShot.data, `base64`))
        record.sheetSize = sheet

        await page.send(`Emulation.clearDeviceMetricsOverride`)
        record.ok = true
        console.log(`[ OK ] ${theme.value.padEnd(12)} ${theme.label.padEnd(6)} 单栏高 ${String(single.height).padStart(5)}px  拼版 ${sheet.width}×${sheet.height}${applied.reinjected ? `  （重注入 ${applied.reinjected} 次）` : ``}`)
      }
      catch (error) {
        record.error = error.message
        console.log(`[FAIL] ${theme.value.padEnd(12)} ${theme.label.padEnd(6)} ${error.message}`)
        try {
          await page.send(`Emulation.clearDeviceMetricsOverride`)
        }
        catch {
          // ignore
        }
      }
      results.push(record)
    }

    const failed = results.filter(item => !item.ok)
    writeFileSync(`${OUT_DIR}/manifest.json`, JSON.stringify({ variables: themes.variables, results }, null, 2))
    console.log(`\n截图完成：${results.length - failed.length}/${results.length}`)
    if (failed.length) {
      console.log(`失败：${failed.map(item => `${item.value}（${item.error}）`).join(`, `)}`)
      process.exitCode = 1
    }
    console.log(`单栏图：${OUT_DIR}/  拼版图：${SHEET_DIR}/`)
  }
  finally {
    dispose()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
