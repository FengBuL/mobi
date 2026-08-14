const DASHBOARD_HTML = String.raw`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex,nofollow">
  <title>墨笔数据观测台</title>
  <style>
    :root {
      color-scheme: light;
      --paper: #f2efe7;
      --paper-deep: #e8e2d5;
      --ink: #171713;
      --muted: #746f65;
      --line: #c9c0b0;
      --red: #b73327;
      --red-dark: #7f211b;
      --green: #2f6652;
      --blue: #315e78;
      --gold: #a2762f;
    }

    * { box-sizing: border-box; }
    html { background: var(--ink); }
    body {
      margin: 0;
      min-height: 100vh;
      color: var(--ink);
      background:
        linear-gradient(rgba(23, 23, 19, .035) 1px, transparent 1px),
        linear-gradient(90deg, rgba(23, 23, 19, .035) 1px, transparent 1px),
        var(--paper);
      background-size: 28px 28px;
      font-family: "PingFang SC", "Hiragino Sans GB", sans-serif;
    }

    button, input { font: inherit; }
    button { color: inherit; }

    .shell { width: min(1480px, calc(100% - 40px)); margin: 0 auto; padding: 30px 0 64px; }
    .masthead {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: end;
      gap: 24px;
      padding: 18px 0 22px;
      border-top: 6px solid var(--ink);
      border-bottom: 1px solid var(--ink);
    }
    .eyebrow {
      margin: 0 0 8px;
      color: var(--red);
      font-family: ui-monospace, "SFMono-Regular", monospace;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: .18em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0;
      font-family: "Songti SC", STSong, Georgia, serif;
      font-size: clamp(36px, 5vw, 72px);
      font-weight: 900;
      letter-spacing: -.055em;
      line-height: .96;
    }
    .mast-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
    .status { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 12px; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--gold); box-shadow: 0 0 0 3px color-mix(in srgb, var(--gold) 15%, transparent); }
    .status-dot.live { background: var(--green); box-shadow: 0 0 0 3px color-mix(in srgb, var(--green) 15%, transparent); }
    .ghost, .period {
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, .24);
      padding: 8px 11px;
      cursor: pointer;
      transition: background .18s, color .18s, border-color .18s, transform .18s;
    }
    .ghost:hover, .period:hover { border-color: var(--ink); transform: translateY(-1px); }
    .period.active { color: var(--paper); background: var(--ink); border-color: var(--ink); }

    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 0;
      border-bottom: 1px solid var(--line);
    }
    .periods { display: flex; gap: 6px; }
    .updated { color: var(--muted); font-family: ui-monospace, "SFMono-Regular", monospace; font-size: 11px; }

    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); border-bottom: 1px solid var(--ink); }
    .kpi { min-height: 166px; padding: 25px 20px 20px; border-right: 1px solid var(--line); position: relative; overflow: hidden; }
    .kpi:last-child { border-right: 0; }
    .kpi::after { content: attr(data-index); position: absolute; right: 12px; top: 10px; color: var(--line); font: 700 11px ui-monospace, monospace; }
    .kpi-label { margin: 0 0 18px; color: var(--muted); font-size: 13px; }
    .kpi-value { margin: 0; font: 800 clamp(34px, 4vw, 58px)/1 ui-monospace, "SFMono-Regular", monospace; letter-spacing: -.06em; }
    .kpi-note { margin: 12px 0 0; color: var(--muted); font-size: 12px; }

    .grid { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(300px, .85fr); border-bottom: 1px solid var(--ink); }
    .panel { padding: 24px 20px 26px; border-right: 1px solid var(--line); min-width: 0; }
    .panel:last-child { border-right: 0; }
    .panel-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 22px; }
    .panel h2 { margin: 0; font-family: "Songti SC", STSong, Georgia, serif; font-size: 21px; }
    .panel-kicker { color: var(--red); font: 700 10px ui-monospace, monospace; letter-spacing: .14em; text-transform: uppercase; }

    .chart-wrap { min-height: 230px; display: grid; align-items: center; }
    .trend-svg { width: 100%; height: auto; overflow: visible; }
    .grid-line { stroke: var(--line); stroke-width: 1; stroke-dasharray: 3 5; }
    .trend-area { fill: url(#trend-fill); }
    .trend-line { fill: none; stroke: var(--red); stroke-width: 3; vector-effect: non-scaling-stroke; }
    .trend-dot { fill: var(--paper); stroke: var(--red); stroke-width: 2; }
    .axis-label { fill: var(--muted); font: 10px ui-monospace, monospace; }

    .platform-layout { display: grid; grid-template-columns: 152px 1fr; align-items: center; gap: 24px; }
    .donut { width: 152px; aspect-ratio: 1; border-radius: 50%; position: relative; background: conic-gradient(var(--red) 0 50%, var(--blue) 50% 100%); }
    .donut::after { content: ""; position: absolute; inset: 24px; border-radius: 50%; background: var(--paper); border: 1px solid var(--line); }
    .donut-total { position: absolute; inset: 0; z-index: 1; display: grid; place-content: center; text-align: center; font: 800 27px ui-monospace, monospace; }
    .donut-total small { display: block; margin-top: 3px; color: var(--muted); font: 11px "PingFang SC", sans-serif; }
    .legend { display: grid; gap: 14px; }
    .legend-row { display: grid; grid-template-columns: 10px 1fr auto; align-items: center; gap: 9px; font-size: 13px; }
    .legend-swatch { width: 10px; height: 10px; background: var(--red); }
    .legend-value { font-family: ui-monospace, monospace; font-weight: 800; }

    .ranking { display: grid; gap: 12px; }
    .rank-row { display: grid; grid-template-columns: 30px minmax(110px, 1fr) minmax(100px, 2fr) 42px; align-items: center; gap: 12px; }
    .rank-num { color: var(--muted); font: 11px ui-monospace, monospace; }
    .rank-name { min-width: 0; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rank-sub { display: block; margin-top: 2px; color: var(--muted); font: 10px ui-monospace, monospace; }
    .bar-track { height: 8px; background: var(--paper-deep); overflow: hidden; }
    .bar { height: 100%; min-width: 3px; background: var(--ink); transform-origin: left; animation: grow .7s cubic-bezier(.2,.8,.2,1) both; }
    .bar.red { background: var(--red); }
    .bar.blue { background: var(--blue); }
    .rank-value { text-align: right; font: 800 13px ui-monospace, monospace; }

    .lower-grid { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid var(--ink); }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table th { color: var(--muted); font-size: 11px; font-weight: 500; text-align: left; border-bottom: 1px solid var(--line); padding: 8px 6px; }
    .data-table td { border-bottom: 1px dotted var(--line); padding: 12px 6px; }
    .data-table td:not(:first-child), .data-table th:not(:first-child) { text-align: right; font-family: ui-monospace, monospace; }
    .empty { padding: 40px 16px; color: var(--muted); text-align: center; border: 1px dashed var(--line); font-size: 13px; }

    .footnote { display: flex; justify-content: space-between; gap: 24px; padding: 16px 0; color: var(--muted); font-size: 11px; line-height: 1.7; }
    .footnote strong { color: var(--ink); }

    .gate {
      position: fixed;
      inset: 0;
      z-index: 10;
      display: grid;
      place-items: center;
      padding: 20px;
      background: rgba(23, 23, 19, .9);
      backdrop-filter: blur(8px);
    }
    .gate[hidden] { display: none; }
    .gate-card {
      width: min(520px, 100%);
      padding: 34px;
      color: var(--ink);
      background: var(--paper);
      border: 1px solid #fff;
      box-shadow: 12px 12px 0 var(--red-dark);
    }
    .gate-mark { width: 42px; height: 42px; display: grid; place-items: center; margin-bottom: 26px; color: var(--paper); background: var(--red); font-family: "Songti SC", serif; font-size: 25px; }
    .gate h2 { margin: 0 0 10px; font: 900 34px/1 "Songti SC", STSong, serif; }
    .gate p { margin: 0 0 22px; color: var(--muted); font-size: 13px; line-height: 1.7; }
    .key-field { width: 100%; border: 1px solid var(--ink); background: #fffef9; padding: 13px 14px; font-family: ui-monospace, monospace; outline: none; }
    .key-field:focus { box-shadow: 0 0 0 3px rgba(183, 51, 39, .16); }
    .gate-actions { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
    .enter { flex: 1; border: 1px solid var(--ink); color: var(--paper); background: var(--ink); padding: 12px 18px; cursor: pointer; }
    .enter:hover { background: var(--red); border-color: var(--red); }
    .gate-error { min-height: 18px; margin-top: 10px !important; color: var(--red) !important; }

    .loading .kpi-value, .loading .chart-wrap, .loading .ranking, .loading .data-table { opacity: .35; filter: grayscale(1); }
    @keyframes grow { from { transform: scaleX(0); } }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }

    @media (max-width: 900px) {
      .kpis { grid-template-columns: 1fr 1fr; }
      .kpi:nth-child(2) { border-right: 0; }
      .kpi:nth-child(-n+2) { border-bottom: 1px solid var(--line); }
      .grid, .lower-grid { grid-template-columns: 1fr; }
      .panel { border-right: 0; border-bottom: 1px solid var(--line); }
      .panel:last-child { border-bottom: 0; }
    }
    @media (max-width: 620px) {
      .shell { width: min(100% - 24px, 1480px); padding-top: 14px; }
      .masthead { grid-template-columns: 1fr; align-items: start; }
      .mast-actions { justify-content: flex-start; }
      .toolbar { align-items: flex-start; flex-direction: column; }
      .kpis { grid-template-columns: 1fr; }
      .kpi { min-height: 138px; border-right: 0; border-bottom: 1px solid var(--line); }
      .kpi:last-child { border-bottom: 0; }
      .platform-layout { grid-template-columns: 118px 1fr; }
      .donut { width: 118px; }
      .donut::after { inset: 19px; }
      .rank-row { grid-template-columns: 24px minmax(95px, 1fr) 60px 34px; gap: 8px; }
      .gate-card { padding: 26px 22px; box-shadow: 7px 7px 0 var(--red-dark); }
      .footnote { flex-direction: column; }
    }
  </style>
</head>
<body>
  <div class="gate" id="gate">
    <form class="gate-card" id="gate-form">
      <div class="gate-mark">墨</div>
      <p class="eyebrow">Private analytics</p>
      <h2>进入数据观测台</h2>
      <p>输入 Cloudflare 管理密钥。密钥仅保存在当前浏览器会话中，通过请求头发送，不会写入网址。</p>
      <input class="key-field" id="key-input" type="password" autocomplete="current-password" placeholder="管理密钥" required>
      <div class="gate-actions"><button class="enter" type="submit">验证并进入</button></div>
      <p class="gate-error" id="gate-error" role="alert"></p>
    </form>
  </div>

  <main class="shell loading" id="app">
    <header class="masthead">
      <div>
        <p class="eyebrow">Mobi / anonymous telemetry</p>
        <h1>墨笔数据观测台</h1>
      </div>
      <div class="mast-actions">
        <div class="status"><span class="status-dot" id="status-dot"></span><span id="status-text">等待连接</span></div>
        <button class="ghost" id="refresh" type="button">刷新</button>
        <button class="ghost" id="logout" type="button">退出</button>
      </div>
    </header>

    <section class="toolbar">
      <div class="periods" aria-label="统计周期">
        <button class="period" data-days="7" type="button">7 天</button>
        <button class="period active" data-days="30" type="button">30 天</button>
        <button class="period" data-days="90" type="button">90 天</button>
      </div>
      <div class="updated" id="updated">尚未更新</div>
    </section>

    <section class="kpis">
      <article class="kpi" data-index="01"><p class="kpi-label">活跃设备</p><p class="kpi-value" id="kpi-users">—</p><p class="kpi-note">匿名设备 ID 去重</p></article>
      <article class="kpi" data-index="02"><p class="kpi-label">功能操作</p><p class="kpi-value" id="kpi-events">—</p><p class="kpi-note">统计周期内事件总数</p></article>
      <article class="kpi" data-index="03"><p class="kpi-label">桌面端占比</p><p class="kpi-value" id="kpi-desktop">—</p><p class="kpi-note">按操作次数计算</p></article>
      <article class="kpi" data-index="04"><p class="kpi-label">高频功能</p><p class="kpi-value" id="kpi-top">—</p><p class="kpi-note" id="kpi-top-note">等待数据</p></article>
    </section>

    <section class="grid">
      <article class="panel">
        <div class="panel-head"><h2>每日操作趋势</h2><span class="panel-kicker">Daily pulse</span></div>
        <div class="chart-wrap" id="trend"></div>
      </article>
      <article class="panel">
        <div class="panel-head"><h2>平台构成</h2><span class="panel-kicker">Platform</span></div>
        <div class="platform-layout"><div class="donut" id="donut"><div class="donut-total" id="donut-total">—<small>次操作</small></div></div><div class="legend" id="platform-legend"></div></div>
      </article>
    </section>

    <section class="grid">
      <article class="panel">
        <div class="panel-head"><h2>功能使用排行</h2><span class="panel-kicker">Events</span></div>
        <div class="ranking" id="event-ranking"></div>
      </article>
      <article class="panel">
        <div class="panel-head"><h2>版本分布</h2><span class="panel-kicker">Versions</span></div>
        <table class="data-table"><thead><tr><th>版本</th><th>设备</th><th>操作</th></tr></thead><tbody id="version-body"></tbody></table>
      </article>
    </section>

    <section class="lower-grid">
      <article class="panel">
        <div class="panel-head"><h2>主题热度</h2><span class="panel-kicker">Themes</span></div>
        <div class="ranking" id="theme-ranking"></div>
      </article>
      <article class="panel">
        <div class="panel-head"><h2>板块预设热度</h2><span class="panel-kicker">Blocks</span></div>
        <div class="ranking" id="block-ranking"></div>
      </article>
    </section>

    <footer class="footnote">
      <div><strong>口径：</strong>活跃设备按匿名 ID 去重；操作量代表功能触发次数。</div>
      <div>不采集文章正文、标题、账号名称或可识别个人身份的信息。</div>
    </footer>
  </main>

  <script>
    const EVENT_LABELS = {
      copy: '复制内容', theme_change: '切换主题', block_apply: '应用板块',
      image_layout_apply: '应用图文排版', export: '导出文件',
      style_preset_apply: '应用整套搭配', mp_config_saved: '保存公众号配置'
    };
    const PLATFORM_LABELS = { desktop: '桌面端', web: '网页版', unknown: '未知平台' };
    const THEME_LABELS = {
      default: '编辑黑白', magazine: '奢刊衬线', press: '复古铅印', insight: '行业洞察',
      launch: '产品发布', legal: '琥珀手册', cyber: '霓虹粗野', blueprint: '蓝图工程',
      terminal: '绿屏极客', minimalist: '留白日记', academic: '研究论文', swiss: '瑞士网格',
      ink: '水墨留白', vermilion: '朱砂古卷', xuan: '宣纸信笺', porcelain: '青花瓷韵',
      bloom: '花期柔粉', candy: '糖果手账', pop: '波普撞色', neon: '荧光夜行',
      sequence: '编号索引', gallery: '展签白盒', scoreboard: '赛报计分'
    };
    const BLOCK_LABELS = {
      'heading-signal-banner': '信号通栏', 'heading-editorial-rail': '编辑引线',
      'heading-ceremony-rules': '典礼双线', 'heading-center-horizon': '中央地平线',
      'heading-number-seal': '序章印记', 'heading-swiss-index': '瑞士索引',
      'heading-magazine-kicker': '刊首眉标', 'heading-literary-bracket': '文稿括注',
      'heading-cut-corner': '切角号令', 'heading-soft-capsule': '柔光胶囊',
      'heading-ink-underline': '墨迹下划', 'heading-quoted-statement': '开篇引号',
      'heading-dawn-gradient': '晨昏渐层', 'heading-duotone-split': '双色分镜',
      'heading-vertical-mark': '纵向题签', 'quote-paper-card': '纸页藏句',
      'quote-center-statement': '留白宣言', 'quote-interview-exchange': '问答切片',
      'quote-margin-note': '案头批笺', 'quote-double-embrace': '双引相拥',
      'quote-author-signature': '署名侧影'
    };
    const CATEGORY_LABELS = { heading: '标题', quote: '引用', card: '卡片', list: '列表', data: '数据', image: '图片' };
    const COLORS = ['#b73327', '#315e78', '#2f6652', '#a2762f', '#746f65'];

    const state = { key: sessionStorage.getItem('mobi-admin-key') || '', days: 30 };
    const el = (id) => document.getElementById(id);
    const esc = (value) => String(value == null ? '' : value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
    const number = (value) => new Intl.NumberFormat('zh-CN').format(Number(value) || 0);
    const empty = (text) => '<div class="empty">' + esc(text) + '</div>';

    function parseProps(value) {
      try { return JSON.parse(value || '{}'); } catch { return {}; }
    }

    function totalEvents(data) {
      return (data.byEvent || []).reduce((sum, item) => sum + Number(item.count || 0), 0);
    }

    function renderRanking(target, items, options) {
      if (!items.length) { target.innerHTML = empty('当前周期暂无数据'); return; }
      const max = Math.max(...items.map((item) => Number(item.count || 0)), 1);
      target.innerHTML = items.slice(0, options.limit || 10).map((item, index) => {
        const label = options.label(item);
        const sub = options.sub ? options.sub(item) : '';
        const width = Math.max(2, Number(item.count || 0) / max * 100);
        return '<div class="rank-row">' +
          '<span class="rank-num">' + String(index + 1).padStart(2, '0') + '</span>' +
          '<span class="rank-name" title="' + esc(label) + '">' + esc(label) + (sub ? '<span class="rank-sub">' + esc(sub) + '</span>' : '') + '</span>' +
          '<span class="bar-track"><span class="bar ' + (options.color || '') + '" style="width:' + width + '%"></span></span>' +
          '<span class="rank-value">' + number(item.count) + '</span></div>';
      }).join('');
    }

    function renderTrend(rows, days) {
      if (!rows.length) { el('trend').innerHTML = empty('每日趋势尚无数据'); return; }
      const byDate = new Map(rows.map((row) => [row.day, Number(row.events || 0)]));
      const points = [];
      const today = new Date();
      for (let offset = days - 1; offset >= 0; offset--) {
        const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset));
        const day = date.toISOString().slice(0, 10);
        points.push({ day, value: byDate.get(day) || 0 });
      }
      const width = 760, height = 230, left = 34, right = 12, top = 16, bottom = 30;
      const plotW = width - left - right, plotH = height - top - bottom;
      const max = Math.max(...points.map((point) => point.value), 1);
      const coords = points.map((point, index) => ({
        ...point,
        x: left + (points.length === 1 ? 0 : index / (points.length - 1) * plotW),
        y: top + plotH - point.value / max * plotH
      }));
      const line = coords.map((point, index) => (index ? 'L' : 'M') + point.x.toFixed(1) + ' ' + point.y.toFixed(1)).join(' ');
      const area = line + ' L ' + coords[coords.length - 1].x.toFixed(1) + ' ' + (top + plotH) + ' L ' + coords[0].x.toFixed(1) + ' ' + (top + plotH) + ' Z';
      const ticks = [0, .5, 1].map((ratio) => {
        const y = top + plotH - ratio * plotH;
        return '<line class="grid-line" x1="' + left + '" y1="' + y + '" x2="' + (width - right) + '" y2="' + y + '"></line>' +
          '<text class="axis-label" x="0" y="' + (y + 3) + '">' + Math.round(max * ratio) + '</text>';
      }).join('');
      const labels = [coords[0], coords[Math.floor((coords.length - 1) / 2)], coords[coords.length - 1]].map((point, index) =>
        '<text class="axis-label" text-anchor="' + (index === 0 ? 'start' : index === 2 ? 'end' : 'middle') + '" x="' + point.x + '" y="' + (height - 4) + '">' + point.day.slice(5).replace('-', '/') + '</text>'
      ).join('');
      const dots = days <= 30 ? coords.filter((_, index) => index % Math.max(1, Math.ceil(days / 15)) === 0 || index === coords.length - 1).map((point) =>
        '<circle class="trend-dot" cx="' + point.x + '" cy="' + point.y + '" r="3"><title>' + point.day + ' · ' + point.value + ' 次</title></circle>'
      ).join('') : '';
      el('trend').innerHTML = '<svg class="trend-svg" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="每日操作趋势">' +
        '<defs><linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b73327" stop-opacity=".25"></stop><stop offset="1" stop-color="#b73327" stop-opacity="0"></stop></linearGradient></defs>' +
        ticks + '<path class="trend-area" d="' + area + '"></path><path class="trend-line" d="' + line + '"></path>' + dots + labels + '</svg>';
    }

    function renderPlatforms(rows) {
      const total = rows.reduce((sum, item) => sum + Number(item.events || 0), 0);
      el('donut-total').innerHTML = number(total) + '<small>次操作</small>';
      if (!rows.length || !total) {
        el('donut').style.background = 'var(--paper-deep)';
        el('platform-legend').innerHTML = empty('暂无平台数据');
        return;
      }
      let cursor = 0;
      const segments = rows.map((item, index) => {
        const start = cursor;
        cursor += Number(item.events || 0) / total * 100;
        return COLORS[index % COLORS.length] + ' ' + start.toFixed(2) + '% ' + cursor.toFixed(2) + '%';
      });
      el('donut').style.background = 'conic-gradient(' + segments.join(',') + ')';
      el('platform-legend').innerHTML = rows.map((item, index) =>
        '<div class="legend-row"><span class="legend-swatch" style="background:' + COLORS[index % COLORS.length] + '"></span>' +
        '<span>' + esc(PLATFORM_LABELS[item.platform] || item.platform || '未知平台') + '</span>' +
        '<span class="legend-value">' + Math.round(Number(item.events || 0) / total * 100) + '%</span></div>'
      ).join('');
    }

    function renderVersions(rows) {
      el('version-body').innerHTML = rows.length ? rows.map((item) =>
        '<tr><td>' + esc(item.version || '未知版本') + '</td><td>' + number(item.users) + '</td><td>' + number(item.events) + '</td></tr>'
      ).join('') : '<tr><td colspan="3">暂无版本数据</td></tr>';
    }

    function render(data) {
      const total = totalEvents(data);
      const desktop = (data.byPlatform || []).find((item) => item.platform === 'desktop');
      const top = (data.byEvent || [])[0];
      el('kpi-users').textContent = number(data.activeUsers);
      el('kpi-events').textContent = number(total);
      el('kpi-desktop').textContent = total ? Math.round(Number(desktop && desktop.events || 0) / total * 100) + '%' : '0%';
      el('kpi-top').textContent = top ? number(top.count) : '0';
      el('kpi-top-note').textContent = top ? (EVENT_LABELS[top.event] || top.event) : '暂无功能数据';
      renderTrend(data.byDay || [], data.days || state.days);
      renderPlatforms(data.byPlatform || []);
      renderRanking(el('event-ranking'), data.byEvent || [], { label: (item) => EVENT_LABELS[item.event] || item.event, sub: (item) => item.event, color: 'red' });
      renderVersions(data.byVersion || []);

      const details = (data.topDetails || []).map((item) => ({ ...item, parsed: parseProps(item.props) }));
      const themes = details.filter((item) => item.event === 'theme_change' && item.parsed.theme);
      renderRanking(el('theme-ranking'), themes, {
        label: (item) => THEME_LABELS[item.parsed.theme] || item.parsed.theme,
        sub: (item) => item.parsed.theme,
        color: 'blue'
      });
      const blocks = details.filter((item) => item.event === 'block_apply' && item.parsed.preset);
      renderRanking(el('block-ranking'), blocks, {
        label: (item) => BLOCK_LABELS[item.parsed.preset] || item.parsed.preset,
        sub: (item) => (CATEGORY_LABELS[item.parsed.category] || item.parsed.category || '板块') + ' · ' + item.parsed.preset
      });
    }

    async function load() {
      if (!state.key) { el('gate').hidden = false; return; }
      el('app').classList.add('loading');
      el('status-dot').classList.remove('live');
      el('status-text').textContent = '正在读取';
      try {
        const response = await fetch('/stats?days=' + state.days, { headers: { Authorization: 'Bearer ' + state.key } });
        if (response.status === 401) throw new Error('密钥无效，请重新输入');
        if (!response.ok) throw new Error('数据读取失败（' + response.status + '）');
        const data = await response.json();
        render(data);
        el('gate').hidden = true;
        el('gate-error').textContent = '';
        el('status-dot').classList.add('live');
        el('status-text').textContent = '数据已连接';
        el('updated').textContent = '更新于 ' + new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date());
      } catch (error) {
        el('status-text').textContent = '连接异常';
        el('gate').hidden = false;
        el('gate-error').textContent = error.message || '无法读取数据';
        if (/密钥/.test(error.message || '')) {
          sessionStorage.removeItem('mobi-admin-key');
          state.key = '';
        }
      } finally {
        el('app').classList.remove('loading');
      }
    }

    el('gate-form').addEventListener('submit', (event) => {
      event.preventDefault();
      state.key = el('key-input').value.trim();
      sessionStorage.setItem('mobi-admin-key', state.key);
      load();
    });
    el('refresh').addEventListener('click', load);
    el('logout').addEventListener('click', () => {
      sessionStorage.removeItem('mobi-admin-key');
      state.key = '';
      el('key-input').value = '';
      el('gate').hidden = false;
      el('gate-error').textContent = '';
    });
    document.querySelectorAll('[data-days]').forEach((button) => button.addEventListener('click', () => {
      state.days = Number(button.dataset.days);
      document.querySelectorAll('[data-days]').forEach((item) => item.classList.toggle('active', item === button));
      load();
    }));

    if (state.key) load();
  </script>
</body>
</html>`

export function dashboardResponse() {
  return new Response(DASHBOARD_HTML, {
    headers: {
      'content-type': `text/html; charset=utf-8`,
      'cache-control': `no-store`,
      'content-security-policy': `default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`,
      'referrer-policy': `no-referrer`,
      'x-content-type-options': `nosniff`,
      'x-frame-options': `DENY`,
    },
  })
}
