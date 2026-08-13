// 主题可读性与层级验收：对每套挂载中的主题实测对比度和标题字号阶梯。
//
// 为什么必须实测而不是读 CSS：提示块的字色来自主题的 `blockquote { color }` 继承，
// 背景来自 base.css 的 class 选择器，两者谁赢只有浏览器算得准。审计里
// tech 1.07:1、scoreboard 1.10:1 这些数字就是这么来的。
//
// 判定线（WCAG AA）：
//   正文 / 引用块正文 / 提示块正文 ≥ 4.5:1
//   标题（h1/h2/h3）与提示块标题行 ≥ 3:1（大字号或粗体按 AA Large 处理）
//
// 字号阶梯的上下限（相对正文）：
//   958 篇真实公众号文章实测的中位序列是 1.13 / 1.25 / 1.38 / 1.50（h4/h3/h2/h1），
//   h1 的 P90 只有 1.75。上一轮按审计报告把下限定成 h1 ≥ 1.80，结果 23 套全部越过语料 P90，
//   375px 屏上中文长标题必然折行。这里改成「区间」而不是「下限」：
//   h1 1.50~1.75、h2 1.30~1.45、h3 1.20~1.30，另外要求相邻两级至少差 0.08，
//   保证压缩总幅度的同时层级还分得开（审计报告说 h3 与正文只差 1.06 太扁，那条仍然有效）。
//
// 用法：
//   node scripts/verify-theme-contrast.mjs                 直接判定
//   node scripts/verify-theme-contrast.mjs --json out.json  另存完整数据
//   MD_BASELINE=/tmp/before.json node scripts/verify-theme-contrast.mjs  与基线对照
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { launchPage } from './lib/wechat-cdp.mjs'

const DEBUG_PORT = Number(process.env.MD_DEBUG_PORT || 9233)
const DEV_URL = process.env.MOBI_DEV_URL || `http://localhost:5173/mobi/`
const jsonFlagIndex = process.argv.indexOf(`--json`)
const JSON_OUT = jsonFlagIndex > -1 ? process.argv[jsonFlagIndex + 1] : `/tmp/theme-audit/contrast.json`
const BASELINE = process.env.MD_BASELINE

const THRESHOLD = {
  body: 4.5,
  heading: 3,
  h1Scale: [1.5, 1.75],
  h2Scale: [1.3, 1.45],
  h3Scale: [1.2, 1.3],
  minStep: 0.08,
}

// 字号阶梯的豁免名单。只豁免「字号大小」这一项，颜色对比度一律照常判定。
// 想上名单，必须靠字距、大写、颜色或位置把层级建起来，不能只是把标题写小了。
const SCALE_EXEMPT = {
  gallery: {
    levels: [`h2`, `h3`],
    why: `美术馆展签版式：h2/h3 刻意小于正文，层级靠等宽大写、0.12em 字距与发丝线建立`,
  },
}

function isScaleExempt(theme, level) {
  return SCALE_EXEMPT[theme]?.levels.includes(level) ?? false
}

const SAMPLE_MARKDOWN = [
  `# 秋季复盘与下一步`,
  ``,
  `开篇导语，用来观察**正文字号**与行高的实际观感，混排*强调文字*、\`inline code\` 与[外部链接](https://example.com)。`,
  ``,
  `## 一、三个关键判断`,
  ``,
  `二级标题下的第一段正文，用来看标题与正文之间的呼吸感是否合理。`,
  ``,
  `- 无序列表第一项：检查项目符号的位置与颜色`,
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
  `> [!CAUTION]`,
  `> 危险提示块，检查最深的一档告警配色是否仍然可读。`,
  ``,
  `> [!TIP]`,
  `> 建议提示块，检查绿色一档的正文与标题行对比度。`,
  ``,
  `| 维度 | 权重 |`,
  `| --- | --- |`,
  `| 视觉精致度 | 30% |`,
  ``,
  `![示意图：检查图注对比度](__SAMPLE_IMAGE__)`,
  ``,
  `#### 四级标题`,
  ``,
  `结语段落。`,
].join(`\n`)

function sampleImageDataUri() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500">`
    + `<rect width="800" height="500" fill="#c7d2fe"/></svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString(`base64`)}`
}

// 复制链路里颜色最终会被 juice 内联，所以这里直接量 computed style，
// 再顺着祖先链找第一层不透明背景——提示块自己是半透明时也要算对。
const BROWSER_SETUP = `
window.__cv = {};

document.documentElement.classList.remove('dark');
document.documentElement.style.colorScheme = 'light';

window.__cv.mountStage = function () {
  const output = document.querySelector('#output');
  if (!output) throw new Error('找不到 #output');
  let stage = document.querySelector('#cv-stage');
  if (!stage) {
    stage = document.createElement('div');
    stage.id = 'cv-stage';
    document.body.appendChild(stage);
    stage.appendChild(output);
  }
  let style = document.querySelector('#cv-stage-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'cv-stage-style';
    document.head.appendChild(style);
  }
  style.textContent = [
    'html, body { margin:0 !important; padding:0 !important; background:#ffffff !important; }',
    'body > *:not(#cv-stage) { display:none !important; }',
    '#cv-stage { box-sizing:border-box; width:375px; background:#ffffff; padding:16px; }',
    '#output { width:100%; }',
  ].join('\\n');
  window.__cv.stage = stage;
  window.__cv.output = output;
  return true;
};

window.__cv.injectAndSettle = function (html, quietMs) {
  const output = window.__cv.output;
  return new Promise(function (done) {
    let reinjected = 0;
    const write = function () { output.innerHTML = html; };
    write();
    let last = output.innerHTML.length;
    let stableSince = Date.now();
    const timer = setInterval(function () {
      if (!output.querySelector('[data-cv-sentinel]')) {
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

// 计算样式里的颜色不一定是 rgb()：color-mix() 在 Chrome 里会算成 color(srgb ...)。
// 用画布把任意合法色值解回 RGBA，ImageData 是非预乘的，半透明也不会失真。
window.__cv.toRgba = function (value) {
  const raw = String(value || '').trim();
  if (!raw || raw === 'none' || raw === 'transparent') return null;
  const quick = raw.match(/^rgba?\\(([^)]+)\\)$/);
  if (quick) {
    const parts = quick[1].split(/[,\\s/]+/).filter(Boolean).map(Number);
    if (parts.length >= 3 && parts.every(function (n) { return Number.isFinite(n); })) {
      return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
    }
  }
  if (!window.__cv.ctx) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    window.__cv.ctx = canvas.getContext('2d', { willReadFrequently: true });
  }
  const ctx = window.__cv.ctx;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = '#000000';
  const before = ctx.fillStyle;
  ctx.fillStyle = raw;
  if (ctx.fillStyle === before && !/^#0{3,8}$|^black$|^rgba?\\(0[,\\s]/.test(raw)) return null;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
};

window.__cv.blend = function (fg, bg) {
  const a = fg.a;
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    a: 1,
  };
};

// 渐变底没法用一个色值代表。把所有色标拆出来，逐个当候选底算一遍，
// 报最差的那个——渐变上的白字只要有一段浅色停靠点就该判不合格。
window.__cv.gradientStops = function (backgroundImage) {
  const raw = String(backgroundImage || '');
  if (!raw || raw === 'none' || !/gradient\\(/.test(raw)) return [];
  const pattern = /(?:rgba?|color|oklab|oklch|lab|lch|hwb|hsla?)\\([^()]*(?:\\([^()]*\\)[^()]*)*\\)|#[0-9a-fA-F]{3,8}\\b/g;
  const found = raw.match(pattern) || [];
  const stops = [];
  found.forEach(function (token) {
    const color = window.__cv.toRgba(token);
    if (color && color.a > 0) stops.push(color);
  });
  return stops;
};

// 从元素往上走，把每一层背景按绘制顺序堆起来，直到撞上一层不透明色。
// 返回一组候选底色：无渐变时只有一个，有渐变时每个色标各算一个。
window.__cv.backgroundCandidates = function (el) {
  const layers = [];
  let node = el;
  let hasGradient = false;
  while (node && node !== document.documentElement) {
    const cs = getComputedStyle(node);
    const stops = window.__cv.gradientStops(cs.backgroundImage);
    if (stops.length) {
      layers.push({ stops: stops });
      hasGradient = true;
    }
    const color = window.__cv.toRgba(cs.backgroundColor);
    if (color && color.a > 0) {
      layers.push({ color: color });
      if (color.a >= 1) break;
    }
    node = node.parentElement;
  }

  const compose = function (pickStop) {
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i -= 1) {
      const layer = layers[i];
      if (layer.color) {
        base = window.__cv.blend(layer.color, base);
      }
      else {
        base = window.__cv.blend(pickStop(layer.stops, i), base);
      }
    }
    return base;
  };

  const topGradient = layers.findIndex(function (layer) { return !!layer.stops; });
  if (topGradient === -1) {
    return { candidates: [compose(function (stops) { return stops[0]; })], gradient: false };
  }
  const candidates = layers[topGradient].stops.map(function (stop) {
    return compose(function (stops, index) { return index === topGradient ? stop : stops[0]; });
  });
  return { candidates: candidates, gradient: hasGradient };
};

window.__cv.luminance = function (c) {
  const f = function (v) {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
};

window.__cv.ratioOf = function (fg, bg) {
  const l1 = window.__cv.luminance(fg);
  const l2 = window.__cv.luminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

window.__cv.contrast = function (el) {
  if (!el) return null;
  const cs = getComputedStyle(el);
  const fgRaw = window.__cv.toRgba(cs.color);
  if (!fgRaw) return null;
  const bgInfo = window.__cv.backgroundCandidates(el);
  let worst = null;
  bgInfo.candidates.forEach(function (bg) {
    const fg = fgRaw.a < 1 ? window.__cv.blend(fgRaw, bg) : fgRaw;
    const ratio = window.__cv.ratioOf(fg, bg);
    if (!worst || ratio < worst.ratio) worst = { ratio: ratio, fg: fg, bg: bg };
  });
  if (!worst) return null;
  const round = function (n) { return Math.round(n); };
  return {
    ratio: Math.round(worst.ratio * 100) / 100,
    fg: 'rgb(' + round(worst.fg.r) + ',' + round(worst.fg.g) + ',' + round(worst.fg.b) + ')',
    bg: 'rgb(' + round(worst.bg.r) + ',' + round(worst.bg.g) + ',' + round(worst.bg.b) + ')',
    gradient: bgInfo.gradient,
    fontSize: Math.round(Number.parseFloat(cs.fontSize) * 100) / 100,
    fontWeight: cs.fontWeight,
  };
};

window.__cv.measure = function () {
  const root = window.__cv.output;
  const q = function (sel) { return root.querySelector(sel); };
  const size = function (sel) {
    const el = q(sel);
    return el ? Math.round(Number.parseFloat(getComputedStyle(el).fontSize) * 100) / 100 : null;
  };
  const alertKinds = ['note', 'warning', 'caution', 'tip'];
  const alerts = {};
  alertKinds.forEach(function (kind) {
    const box = q('.markdown-alert-' + kind);
    // 提示块正文就是块里第一个不是标题行的 <p>，渲染器没给它加 class。
    const body = box
      ? Array.prototype.find.call(box.querySelectorAll('p'), function (el) {
          return !/alert-title/.test(el.className || '');
        })
      : null;
    alerts[kind] = {
      body: window.__cv.contrast(body),
      title: window.__cv.contrast(box ? box.querySelector('[class*="alert-title"]') : null),
    };
  });
  return {
    fontSizes: {
      p: size('p'),
      h1: size('h1'),
      h2: size('h2'),
      h3: size('h3'),
      h4: size('h4'),
    },
    contrast: {
      body: window.__cv.contrast(q('p')),
      li: window.__cv.contrast(q('li')),
      h1: window.__cv.contrast(q('h1')),
      h2: window.__cv.contrast(q('h2')),
      h3: window.__cv.contrast(q('h3')),
      quote: window.__cv.contrast(q('blockquote:not([class*="markdown-alert"]) p')),
      figcaption: window.__cv.contrast(q('figcaption')),
      th: window.__cv.contrast(q('th')),
      td: window.__cv.contrast(q('td')),
    },
    alerts: alerts,
  };
};
`

function fmt(value, width) {
  return String(value).padEnd(width)
}

function ratioText(entry) {
  if (!entry) {
    return `  ——  `
  }
  return `${entry.ratio.toFixed(2).padStart(6)}`
}

async function main() {
  mkdirSync(dirname(JSON_OUT), { recursive: true })

  const { page, dispose } = await launchPage({
    port: DEBUG_PORT,
    profile: `/tmp/md-theme-contrast-profile`,
    devUrl: DEV_URL,
    readyExpression: `!!(document.querySelector('#md-theme') && document.querySelector('#output'))`,
  })

  const results = []

  try {
    const corePath = `/mobi/@fs${resolve(process.cwd(), `packages/core/src/index.ts`)}`
    const themePath = `/mobi/@fs${resolve(process.cwd(), `packages/shared/src/configs/theme.ts`)}`
    const stylePath = `/mobi/@fs${resolve(process.cwd(), `packages/shared/src/configs/style.ts`)}`

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

    const bootstrap = await page.evaluate(`(async () => {
      ${BROWSER_SETUP}
      const themeConfig = await import(${JSON.stringify(themePath)});
      const styleConfig = await import(${JSON.stringify(stylePath)});
      const core = await import(${JSON.stringify(corePath)});
      const utils = await import('/mobi/src/utils/index.ts');
      window.__cv.core = core;
      window.__cv.themeConfig = themeConfig;
      window.__cv.styleConfig = styleConfig;

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
      window.__cv.sampleHtml = utils.postProcessHtml(rendered.html, rendered.readingTime, renderer)
        + '<p data-cv-sentinel style="height:0;margin:0;overflow:hidden;opacity:0;">.</p>';

      window.__cv.mountStage();

      const themes = themeConfig.themeCategoryOptions.flatMap((group) => group.themes.map((t) => ({
        category: group.category,
        label: t.label,
        value: t.value,
      })));

      return {
        themes,
        fontFamily: styleConfig.defaultStyleConfig.fontFamily,
        fontSize: styleConfig.defaultStyleConfig.fontSize,
        fallbackPrimary: styleConfig.defaultStyleConfig.primaryColor,
        hasThemeDefaultPrimary: typeof themeConfig.getThemeDefaultPrimaryColor === 'function',
      };
    })()`)

    console.log(`共 ${bootstrap.themes.length} 套主题；主色来源：${bootstrap.hasThemeDefaultPrimary ? `每套主题的 defaultPrimaryColor` : `出厂默认 ${bootstrap.fallbackPrimary}`}\n`)

    for (const theme of bootstrap.themes) {
      const measured = await page.evaluate(`(async () => {
        const primaryColor = window.__cv.themeConfig.getThemeDefaultPrimaryColor
          ? window.__cv.themeConfig.getThemeDefaultPrimaryColor(${JSON.stringify(theme.value)})
          : window.__cv.styleConfig.defaultStyleConfig.primaryColor;
        await window.__cv.core.applyTheme({
          themeName: ${JSON.stringify(theme.value)},
          variables: {
            primaryColor,
            fontFamily: ${JSON.stringify(bootstrap.fontFamily)},
            fontSize: ${JSON.stringify(bootstrap.fontSize)},
          },
        });
        await window.__cv.injectAndSettle(window.__cv.sampleHtml, 300);
        await new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });
        const sentinel = !!window.__cv.output.querySelector('[data-cv-sentinel]');
        const headingText = (window.__cv.output.querySelector('h1') || {}).textContent || '';
        return { primaryColor, sentinel, headingText, ...window.__cv.measure() };
      })()`)

      if (!measured.sentinel || !measured.headingText.includes(`秋季复盘`)) {
        throw new Error(`${theme.value}：样张被应用覆盖，测到的不是审计内容`)
      }

      results.push({ ...theme, ...measured })
    }

    const body = results.length
    const failures = []
    const exemptions = []

    console.log(`=== 提示块对比度（正文 ≥ ${THRESHOLD.body}，标题行 ≥ ${THRESHOLD.heading}）===`)
    console.log(`${fmt(`主题`, 14)}${[`note`, `warning`, `caution`, `tip`].map(k => `${k}正文  ${k}标题`.padStart(18)).join(``)}`)
    results.forEach((item) => {
      const cells = [`note`, `warning`, `caution`, `tip`].map((kind) => {
        const a = item.alerts[kind]
        return `${ratioText(a.body)} ${ratioText(a.title)}`.padStart(18)
      })
      console.log(`${fmt(item.value, 14)}${cells.join(``)}`)
    })

    console.log(`\n=== 正文 / 引用块 / 标题 对比度 ===`)
    console.log(`${fmt(`主题`, 14)}${`正文`.padStart(8)}${`列表`.padStart(8)}${`引用块`.padStart(9)}${`h1`.padStart(8)}${`h2`.padStart(8)}${`h3`.padStart(8)}${`表头`.padStart(8)}${`图注`.padStart(8)}`)
    results.forEach((item) => {
      const c = item.contrast
      console.log(
        `${fmt(item.value, 14)}${ratioText(c.body).padStart(8)}${ratioText(c.li).padStart(8)}${ratioText(c.quote).padStart(9)}`
        + `${ratioText(c.h1).padStart(8)}${ratioText(c.h2).padStart(8)}${ratioText(c.h3).padStart(8)}${ratioText(c.th).padStart(8)}${ratioText(c.figcaption).padStart(8)}`,
      )
    })

    console.log(`\n=== 标题字号阶梯（相对正文；下限 ${THRESHOLD.h1Scale} / ${THRESHOLD.h2Scale} / ${THRESHOLD.h3Scale}）===`)
    console.log(`${fmt(`主题`, 14)}${`正文px`.padStart(9)}${`h1`.padStart(8)}${`h2`.padStart(8)}${`h3`.padStart(8)}${`h4`.padStart(8)}`)
    results.forEach((item) => {
      const f = item.fontSizes
      const scale = level => (f[level] && f.p ? (f[level] / f.p).toFixed(2) : `——`)
      item.scales = {
        h1: f.h1 && f.p ? f.h1 / f.p : null,
        h2: f.h2 && f.p ? f.h2 / f.p : null,
        h3: f.h3 && f.p ? f.h3 / f.p : null,
        h4: f.h4 && f.p ? f.h4 / f.p : null,
      }
      console.log(`${fmt(item.value, 14)}${String(f.p).padStart(9)}${scale(`h1`).padStart(8)}${scale(`h2`).padStart(8)}${scale(`h3`).padStart(8)}${scale(`h4`).padStart(8)}`)
    })

    results.forEach((item) => {
      const push = (label, actual, min) => {
        if (actual === null || actual === undefined) {
          failures.push(`${item.value}：${label} 测不到`)
          return
        }
        if (actual < min) {
          failures.push(`${item.value}：${label} ${actual.toFixed(2)} < ${min}`)
        }
      }

      push(`正文对比度`, item.contrast.body?.ratio ?? null, THRESHOLD.body)
      push(`列表对比度`, item.contrast.li?.ratio ?? null, THRESHOLD.body)
      push(`引用块对比度`, item.contrast.quote?.ratio ?? null, THRESHOLD.body)
      push(`表头对比度`, item.contrast.th?.ratio ?? null, THRESHOLD.heading)
      push(`图注对比度`, item.contrast.figcaption?.ratio ?? null, THRESHOLD.body)
      ;[`h1`, `h2`, `h3`].forEach((level) => {
        push(`${level} 对比度`, item.contrast[level]?.ratio ?? null, THRESHOLD.heading)
      })
      ;[`note`, `warning`, `caution`, `tip`].forEach((kind) => {
        push(`提示块 ${kind} 正文`, item.alerts[kind].body?.ratio ?? null, THRESHOLD.body)
        push(`提示块 ${kind} 标题`, item.alerts[kind].title?.ratio ?? null, THRESHOLD.heading)
      })

      const range = (level, label, actual, [min, max]) => {
        if (actual === null || actual === undefined) {
          failures.push(`${item.value}：${label} 测不到`)
          return
        }
        if (isScaleExempt(item.value, level)) {
          exemptions.push(`${item.value}：${label} ${actual.toFixed(2)}（豁免｜${SCALE_EXEMPT[item.value].why}）`)
          return
        }
        if (actual < min)
          failures.push(`${item.value}：${label} ${actual.toFixed(2)} < 下限 ${min}`)
        else if (actual > max)
          failures.push(`${item.value}：${label} ${actual.toFixed(2)} > 上限 ${max}（375px 会折行）`)
      }
      range(`h1`, `h1 字号比`, item.scales.h1, THRESHOLD.h1Scale)
      range(`h2`, `h2 字号比`, item.scales.h2, THRESHOLD.h2Scale)
      range(`h3`, `h3 字号比`, item.scales.h3, THRESHOLD.h3Scale)

      // 相邻两级挨太近的话，压缩幅度就变成了「层级消失」
      const steps = [[`h1`, `h2`, `h1-h2`, item.scales.h1, item.scales.h2], [`h2`, `h3`, `h2-h3`, item.scales.h2, item.scales.h3], [`h3`, null, `h3-正文`, item.scales.h3, 1]]
      steps.forEach(([hiLevel, loLevel, label, hi, lo]) => {
        if (hi === null || lo === null)
          return
        if (isScaleExempt(item.value, hiLevel) || (loLevel && isScaleExempt(item.value, loLevel)))
          return
        if (hi - lo < THRESHOLD.minStep) {
          failures.push(`${item.value}：${label} 只差 ${(hi - lo).toFixed(2)} < ${THRESHOLD.minStep}，层级挤在一起`)
        }
      })
    })

    writeFileSync(JSON_OUT, JSON.stringify({ threshold: THRESHOLD, results }, null, 2))

    if (BASELINE && existsSync(BASELINE)) {
      const before = JSON.parse(readFileSync(BASELINE, `utf8`))
      const beforeMap = new Map(before.results.map(item => [item.value, item]))
      console.log(`\n=== 与基线对照：提示块 NOTE 正文对比度 ===`)
      console.log(`${fmt(`主题`, 14)}${`修复前`.padStart(9)}${`修复后`.padStart(9)}`)
      results.forEach((item) => {
        const prev = beforeMap.get(item.value)
        if (!prev) {
          return
        }
        console.log(`${fmt(item.value, 14)}${ratioText(prev.alerts.note.body).padStart(9)}${ratioText(item.alerts.note.body).padStart(9)}`)
      })
    }

    if (exemptions.length) {
      console.log(`\n=== 字号阶梯豁免（${exemptions.length} 项，颜色对比度仍照常判定）===`)
      exemptions.forEach(line => console.log(`  · ${line}`))
    }

    console.log(`\n主题数 ${body}；不达标项 ${failures.length}`)
    if (failures.length) {
      failures.forEach(line => console.log(`  ✗ ${line}`))
      process.exitCode = 1
    }
    else {
      console.log(`全部达标`)
    }
    console.log(`完整数据：${JSON_OUT}`)
  }
  finally {
    dispose()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
