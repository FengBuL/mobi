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
      --violet: #5b4a7a;
      --teal: #2c6e6a;
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

    button, input, select { font: inherit; }
    button { color: inherit; }
    select { color: inherit; }

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
    .status-dot.live { background: var(--green); box-shadow: 0 0 0 3px color-mix(in srgb, var(--green) 15%, transparent); animation: pulse 2.4s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--green) 15%, transparent); } 50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--green) 8%, transparent); } }
    .ghost, .period, .chip {
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, .24);
      padding: 8px 11px;
      cursor: pointer;
      transition: background .18s, color .18s, border-color .18s, transform .18s;
    }
    .ghost:hover, .period:hover, .chip:hover { border-color: var(--ink); transform: translateY(-1px); }
    .period.active, .chip.active, .ghost.active { color: var(--paper); background: var(--ink); border-color: var(--ink); }
    .chip { padding: 5px 10px; font-size: 12px; display: inline-flex; align-items: center; gap: 6px; }
    .chip .swatch { width: 9px; height: 9px; border-radius: 2px; background: currentColor; }
    .chip.active .swatch { background: var(--chip-color, var(--paper)); }
    .chip:not(.active) .swatch { background: var(--chip-color, var(--ink)); opacity: .45; }

    .toolbar {
      display: grid;
      gap: 12px;
      padding: 14px 0;
      border-bottom: 1px solid var(--line);
    }
    .toolbar-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .periods { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
    .custom-range { display: inline-flex; align-items: center; gap: 6px; }
    .custom-range[hidden] { display: none; }
    .date-field { border: 1px solid var(--line); background: #fffef9; padding: 7px 9px; font-family: ui-monospace, monospace; font-size: 12px; }
    .updated { color: var(--muted); font-family: ui-monospace, "SFMono-Regular", monospace; font-size: 11px; display: flex; gap: 12px; align-items: center; }
    .filters { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .filter { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); }
    .filter select { border: 1px solid var(--line); background: #fffef9; padding: 6px 8px; font-size: 12px; max-width: 200px; }
    .filter select.on { border-color: var(--red); color: var(--red); font-weight: 600; }
    .filter-clear { font-size: 12px; color: var(--red); background: none; border: 0; cursor: pointer; text-decoration: underline; padding: 0 4px; }
    .filter-clear[hidden] { display: none; }
    .toggle { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; }
    .toggle input { accent-color: var(--red); }

    .notice { margin: 0; padding: 10px 14px; border: 1px dashed var(--gold); color: var(--gold); background: rgba(162, 118, 47, .06); font-size: 12px; line-height: 1.6; }
    .notice[hidden] { display: none; }

    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); border-bottom: 1px solid var(--ink); }
    .kpi { min-height: 172px; padding: 25px 20px 20px; border-right: 1px solid var(--line); position: relative; overflow: hidden; }
    .kpi:last-child { border-right: 0; }
    .kpi::after { content: attr(data-index); position: absolute; right: 12px; top: 10px; color: var(--line); font: 700 11px ui-monospace, monospace; }
    .kpi-label { margin: 0 0 14px; color: var(--muted); font-size: 13px; }
    .kpi-value { margin: 0; font: 800 clamp(34px, 4vw, 58px)/1 ui-monospace, "SFMono-Regular", monospace; letter-spacing: -.06em; font-variant-numeric: tabular-nums; }
    .kpi-delta { margin: 10px 0 0; font: 700 12px ui-monospace, monospace; display: inline-flex; align-items: center; gap: 6px; padding: 3px 8px; border: 1px solid transparent; }
    .kpi-delta.up { color: var(--green); border-color: color-mix(in srgb, var(--green) 40%, transparent); background: color-mix(in srgb, var(--green) 8%, transparent); }
    .kpi-delta.down { color: var(--red); border-color: color-mix(in srgb, var(--red) 40%, transparent); background: color-mix(in srgb, var(--red) 8%, transparent); }
    .kpi-delta.flat { color: var(--muted); border-color: var(--line); }
    .kpi-note { margin: 10px 0 0; color: var(--muted); font-size: 12px; }
    .kpi.weak .kpi-value { color: var(--muted); }

    .grid { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(300px, .85fr); border-bottom: 1px solid var(--ink); }
    .grid.even { grid-template-columns: 1fr 1fr; }
    .grid.thirds { grid-template-columns: 1fr 1fr 1fr; }
    .grid.single { grid-template-columns: 1fr; }
    .panel { padding: 24px 20px 26px; border-right: 1px solid var(--line); min-width: 0; }
    .panel:last-child { border-right: 0; }
    .panel-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 22px; flex-wrap: wrap; }
    .panel h2 { margin: 0; font-family: "Songti SC", STSong, Georgia, serif; font-size: 21px; }
    .panel-kicker { color: var(--red); font: 700 10px ui-monospace, monospace; letter-spacing: .14em; text-transform: uppercase; }
    .panel-hint { margin: -14px 0 18px; color: var(--muted); font-size: 12px; line-height: 1.6; }
    .panel-tools { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin: -8px 0 16px; }

    .chart-wrap { min-height: 250px; display: grid; align-items: center; position: relative; }
    .trend-svg { width: 100%; height: auto; overflow: visible; display: block; }
    .grid-line { stroke: var(--line); stroke-width: 1; stroke-dasharray: 3 5; }
    .series-line { fill: none; stroke-width: 2.5; vector-effect: non-scaling-stroke; stroke-linejoin: round; stroke-linecap: round; }
    .series-line.ghost { stroke: var(--muted); stroke-dasharray: 4 5; stroke-width: 1.5; opacity: .7; }
    .series-area { opacity: .12; }
    .axis-label { fill: var(--muted); font: 10px ui-monospace, monospace; }
    .crosshair { stroke: var(--ink); stroke-width: 1; stroke-dasharray: 2 3; opacity: 0; pointer-events: none; }
    .hover-dot { opacity: 0; pointer-events: none; stroke: var(--paper); stroke-width: 2; }
    .trend-svg.hovering .crosshair, .trend-svg.hovering .hover-dot { opacity: 1; }
    .hit { fill: transparent; cursor: crosshair; }
    .tooltip {
      position: absolute;
      z-index: 3;
      min-width: 150px;
      padding: 10px 12px;
      color: var(--paper);
      background: var(--ink);
      font: 12px/1.6 ui-monospace, monospace;
      pointer-events: none;
      opacity: 0;
      transform: translate(-50%, -8px);
      transition: opacity .12s;
      box-shadow: 6px 6px 0 rgba(23, 23, 19, .18);
    }
    .tooltip.show { opacity: 1; }
    .tooltip strong { display: block; margin-bottom: 4px; font-size: 11px; letter-spacing: .08em; color: rgba(242, 239, 231, .7); }
    .tooltip-row { display: flex; justify-content: space-between; gap: 14px; }
    .tooltip-row i { display: inline-block; width: 8px; height: 8px; margin-right: 6px; vertical-align: 1px; }
    .draw .series-line:not(.ghost) { stroke-dasharray: 2000; stroke-dashoffset: 2000; animation: draw 1.1s cubic-bezier(.3,.7,.2,1) forwards; }
    @keyframes draw { to { stroke-dashoffset: 0; } }

    .platform-layout { display: grid; grid-template-columns: 152px 1fr; align-items: center; gap: 24px; }
    .donut { width: 152px; aspect-ratio: 1; border-radius: 50%; position: relative; background: conic-gradient(var(--red) 0 50%, var(--blue) 50% 100%); transition: background .6s; }
    .donut::after { content: ""; position: absolute; inset: 24px; border-radius: 50%; background: var(--paper); border: 1px solid var(--line); }
    .donut-total { position: absolute; inset: 0; z-index: 1; display: grid; place-content: center; text-align: center; font: 800 27px ui-monospace, monospace; }
    .donut-total small { display: block; margin-top: 3px; color: var(--muted); font: 11px "PingFang SC", sans-serif; }
    .legend { display: grid; gap: 14px; }
    .legend-row { display: grid; grid-template-columns: 10px 1fr auto; align-items: center; gap: 9px; font-size: 13px; }
    .legend-swatch { width: 10px; height: 10px; background: var(--red); }
    .legend-value { font-family: ui-monospace, monospace; font-weight: 800; }

    .ranking { display: grid; gap: 12px; }
    .rank-row { display: grid; grid-template-columns: 30px minmax(110px, 1fr) minmax(100px, 2fr) 42px; align-items: center; gap: 12px; }
    .rank-row.with-users { grid-template-columns: 30px minmax(110px, 1fr) minmax(100px, 2fr) 42px 58px; }
    .rank-num { color: var(--muted); font: 11px ui-monospace, monospace; }
    .rank-name { min-width: 0; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rank-sub { display: block; margin-top: 2px; color: var(--muted); font: 10px ui-monospace, monospace; }
    .bar-track { height: 8px; background: var(--paper-deep); overflow: hidden; }
    .bar { height: 100%; min-width: 3px; background: var(--ink); transform-origin: left; animation: grow .7s cubic-bezier(.2,.8,.2,1) both; transition: width .5s cubic-bezier(.2,.8,.2,1); }
    .bar.red { background: var(--red); }
    .bar.blue { background: var(--blue); }
    .bar.green { background: var(--green); }
    .bar.gold { background: var(--gold); }
    .rank-value { text-align: right; font: 800 13px ui-monospace, monospace; }
    .rank-users { text-align: right; color: var(--muted); font: 11px ui-monospace, monospace; }
    .rank-row.dim { opacity: .45; }

    .funnel { display: grid; gap: 10px; }
    .funnel-step { display: grid; grid-template-columns: 96px 1fr 60px 64px; align-items: center; gap: 12px; font-size: 13px; cursor: pointer; padding: 4px 6px; margin: 0 -6px; border: 1px solid transparent; transition: background .18s, border-color .18s; }
    .funnel-step:hover { background: rgba(255, 255, 255, .35); }
    .funnel-step.active { border-color: var(--ink); background: rgba(255, 255, 255, .5); }
    .funnel-bar { height: 26px; background: var(--paper-deep); position: relative; overflow: hidden; }
    .funnel-bar span { position: absolute; inset: 0 auto 0 0; background: var(--ink); transform-origin: left; animation: grow .7s cubic-bezier(.2,.8,.2,1) both; transition: width .5s cubic-bezier(.2,.8,.2,1); }
    .funnel-step:nth-child(4) .funnel-bar span { background: var(--red); }
    .funnel-value { text-align: right; font: 800 14px ui-monospace, monospace; }
    .funnel-rate { text-align: right; color: var(--muted); font: 11px ui-monospace, monospace; }
    .funnel-prev { display: block; color: var(--muted); font: 10px ui-monospace, monospace; text-align: right; }
    .drill { margin-top: 16px; padding: 14px; border: 1px solid var(--line); background: rgba(255, 255, 255, .3); display: grid; grid-template-columns: 1fr 1fr; gap: 18px; animation: fade .3s ease both; }
    .drill[hidden] { display: none; }
    .drill h3 { margin: 0 0 10px; font-size: 12px; color: var(--muted); font-weight: 500; }
    @keyframes fade { from { opacity: 0; transform: translateY(-4px); } }

    .facts { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px 20px; }
    .fact { border-top: 1px solid var(--line); padding-top: 10px; }
    .fact-label { margin: 0 0 6px; color: var(--muted); font-size: 12px; }
    .fact-value { margin: 0; font: 800 26px/1 ui-monospace, monospace; letter-spacing: -.04em; }
    .fact-value small { color: var(--muted); font: 11px "PingFang SC", sans-serif; margin-left: 6px; }
    .verdict { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 18px; }
    .verdict-card { padding: 12px 14px; border: 1px solid var(--line); display: grid; gap: 4px; }
    .verdict-card b { font: 800 24px/1 ui-monospace, monospace; }
    .verdict-card span { color: var(--muted); font-size: 12px; }
    .verdict-card.bad b { color: var(--red); }
    .verdict-card.good b { color: var(--green); }

    .lower-grid { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid var(--ink); }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table th { color: var(--muted); font-size: 11px; font-weight: 500; text-align: left; border-bottom: 1px solid var(--line); padding: 8px 6px; }
    .data-table td { border-bottom: 1px dotted var(--line); padding: 12px 6px; vertical-align: top; }
    .data-table td:not(:first-child), .data-table th:not(:first-child) { text-align: right; font-family: ui-monospace, monospace; }
    .data-table.feedback td, .data-table.feedback th { text-align: left; font-family: inherit; }
    .data-table.retention td:not(:first-child) { font-variant-numeric: tabular-nums; }
    .retention-cell { display: inline-grid; gap: 3px; justify-items: end; }
    .retention-cell small { color: var(--muted); font-size: 10px; }
    .heat { display: inline-block; min-width: 46px; padding: 3px 6px; text-align: right; font-weight: 700; }
    .feedback-msg { white-space: pre-wrap; word-break: break-word; max-width: 720px; line-height: 1.6; }
    .feedback-meta { display: block; margin-top: 6px; color: var(--muted); font: 10px ui-monospace, monospace; }
    .tag { display: inline-block; padding: 2px 7px; border: 1px solid var(--ink); font-size: 11px; white-space: nowrap; }
    .tag.red { color: var(--red); border-color: var(--red); }
    .tag.green { color: var(--green); border-color: var(--green); }
    .tag.muted { color: var(--muted); border-color: var(--line); }
    .status-select { border: 1px solid var(--line); background: #fffef9; padding: 4px 6px; font-size: 12px; }
    .status-select.done { color: var(--green); border-color: var(--green); }
    .status-select.ignored { color: var(--muted); }
    .status-select.open { color: var(--red); border-color: var(--red); }
    tr.done .feedback-msg { color: var(--muted); }
    .empty { padding: 40px 16px; color: var(--muted); text-align: center; border: 1px dashed var(--line); font-size: 13px; }
    a { color: var(--blue); }

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

    .loading .kpi-value, .loading .chart-wrap, .loading .ranking, .loading .data-table, .loading .funnel, .loading .facts { opacity: .35; filter: grayscale(1); transition: opacity .2s; }
    .panel.fresh { animation: fade .35s ease both; }
    @keyframes grow { from { transform: scaleX(0); } }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }

    @media (max-width: 900px) {
      .kpis { grid-template-columns: 1fr 1fr; }
      .kpi:nth-child(2) { border-right: 0; }
      .kpi:nth-child(-n+2) { border-bottom: 1px solid var(--line); }
      .grid, .grid.even, .grid.thirds, .lower-grid { grid-template-columns: 1fr; }
      .panel { border-right: 0; border-bottom: 1px solid var(--line); }
      .panel:last-child { border-bottom: 0; }
      .drill { grid-template-columns: 1fr; }
    }
    @media (max-width: 620px) {
      .shell { width: min(100% - 24px, 1480px); padding-top: 14px; }
      .masthead { grid-template-columns: 1fr; align-items: start; }
      .mast-actions { justify-content: flex-start; }
      .kpis { grid-template-columns: 1fr; }
      .kpi { min-height: 138px; border-right: 0; border-bottom: 1px solid var(--line); }
      .kpi:last-child { border-bottom: 0; }
      .platform-layout { grid-template-columns: 118px 1fr; }
      .donut { width: 118px; }
      .donut::after { inset: 19px; }
      .rank-row, .rank-row.with-users { grid-template-columns: 24px minmax(95px, 1fr) 60px 34px; gap: 8px; }
      .rank-users { display: none; }
      .funnel-step { grid-template-columns: 72px 1fr 44px 50px; gap: 8px; }
      .facts { grid-template-columns: 1fr; }
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
        <label class="toggle ghost" title="每 60 秒自动拉一次"><input type="checkbox" id="auto-refresh"> 自动刷新</label>
        <button class="ghost" id="refresh" type="button">刷新</button>
        <button class="ghost" id="logout" type="button">退出</button>
      </div>
    </header>

    <section class="toolbar">
      <div class="toolbar-row">
        <div class="periods" aria-label="统计周期">
          <button class="period" data-days="1" type="button">今天</button>
          <button class="period" data-days="7" type="button">7 天</button>
          <button class="period active" data-days="30" type="button">30 天</button>
          <button class="period" data-days="90" type="button">90 天</button>
          <button class="period" id="custom-toggle" type="button">自定义</button>
          <span class="custom-range" id="custom-range" hidden>
            <input class="date-field" id="date-from" type="date"> <span style="color:var(--muted)">→</span>
            <input class="date-field" id="date-to" type="date">
            <button class="ghost" id="apply-range" type="button">应用</button>
          </span>
        </div>
        <div class="updated"><span id="range-text"></span><span id="updated">尚未更新</span></div>
      </div>
      <div class="toolbar-row">
        <div class="filters" aria-label="筛选">
          <label class="filter">平台 <select id="f-platform" data-filter="platform"><option value="">全部</option><option value="web">网页版</option><option value="desktop">桌面端</option></select></label>
          <label class="filter">版本 <select id="f-version" data-filter="version"><option value="">全部</option></select></label>
          <label class="filter">屏幕宽度 <select id="f-viewport" data-filter="viewport"><option value="">全部</option></select></label>
          <label class="filter">模式 <select id="f-mode" data-filter="mode"><option value="">全部</option><option value="simple">简洁</option><option value="professional">专业</option></select></label>
          <button class="filter-clear" id="filter-clear" type="button" hidden>清除筛选</button>
        </div>
        <span class="filter" id="compare-text"></span>
      </div>
    </section>

    <p class="notice" id="sample-notice" hidden></p>

    <section class="kpis">
      <article class="kpi" data-index="01"><p class="kpi-label">活跃设备</p><p class="kpi-value" id="kpi-users" data-count>—</p><p class="kpi-delta" id="kpi-users-delta"></p><p class="kpi-note" id="kpi-users-note">匿名设备 ID 去重</p></article>
      <article class="kpi" data-index="02"><p class="kpi-label">复制到公众号</p><p class="kpi-value" id="kpi-copies" data-count>—</p><p class="kpi-delta" id="kpi-copies-delta"></p><p class="kpi-note" id="kpi-copies-note">统计周期内复制次数</p></article>
      <article class="kpi" data-index="03"><p class="kpi-label">打开 → 复制</p><p class="kpi-value" id="kpi-conversion">—</p><p class="kpi-delta" id="kpi-conversion-delta"></p><p class="kpi-note" id="kpi-conversion-note">打开过的设备里有多少复制过</p></article>
      <article class="kpi" data-index="04"><p class="kpi-label">7 日回访</p><p class="kpi-value" id="kpi-retention">—</p><p class="kpi-delta" id="kpi-retention-delta"></p><p class="kpi-note" id="kpi-retention-note">首次出现后第 2–7 天又回来的比例</p></article>
    </section>

    <section class="grid">
      <article class="panel">
        <div class="panel-head"><h2>主路径漏斗</h2><span class="panel-kicker">Funnel · devices · 点一步看拆分</span></div>
        <p class="panel-hint">每一步统计做过这件事的设备数，灰字是上一周期。app_open 从 2.3.4 才开始记，老版本设备不会出现在第一步。</p>
        <div class="funnel" id="funnel"></div>
        <div class="drill" id="drill" hidden></div>
      </article>
      <article class="panel">
        <div class="panel-head"><h2>屏幕宽度</h2><span class="panel-kicker">Viewport</span></div>
        <p class="panel-hint">打开时的浏览器窗口宽度分桶，按设备去重。点一行 = 只看这类设备。</p>
        <div class="ranking" id="viewport-ranking"></div>
      </article>
    </section>

    <section class="grid">
      <article class="panel">
        <div class="panel-head"><h2>每日趋势</h2><span class="panel-kicker">Daily pulse · 悬停看数</span></div>
        <div class="panel-tools" id="trend-series"></div>
        <div class="chart-wrap" id="trend"><div class="tooltip" id="trend-tip"></div></div>
      </article>
      <article class="panel">
        <div class="panel-head"><h2>平台构成</h2><span class="panel-kicker">Platform</span></div>
        <div class="platform-layout"><div class="donut" id="donut"><div class="donut-total" id="donut-total">—<small>次操作</small></div></div><div class="legend" id="platform-legend"></div></div>
      </article>
    </section>

    <section class="grid even">
      <article class="panel">
        <div class="panel-head"><h2>留存</h2><span class="panel-kicker">Retention · weekly cohorts</span></div>
        <p class="panel-hint">按设备首次出现的那一周分组。「第 2–7 天」= 首次之后一周内又来过；「第 8–14 天」= 第二周还来。未满期的格子标灰。</p>
        <table class="data-table retention"><thead><tr><th>首次出现周</th><th>新设备</th><th>第 2–7 天</th><th>第 8–14 天</th></tr></thead><tbody id="retention-body"></tbody></table>
      </article>
      <article class="panel">
        <div class="panel-head"><h2>复制时的稿子</h2><span class="panel-kicker">Copy shape</span></div>
        <div class="facts" id="copy-facts"></div>
        <div class="verdict" id="copy-verdict"></div>
      </article>
    </section>

    <section class="grid even">
      <article class="panel">
        <div class="panel-head"><h2>全局样式 · 控件使用</h2><span class="panel-kicker">Style controls</span></div>
        <p class="panel-hint">右列是动过这个控件的设备数。长期为 0 或只有 1 台设备用过的控件，就是可以考虑收掉的。半透明行 = 只有 1 台设备用过。</p>
        <div class="ranking" id="style-control-ranking"></div>
      </article>
      <article class="panel">
        <div class="panel-head"><h2>全局样式 · 页签与精细调节</h2><span class="panel-kicker">Tabs · tokens</span></div>
        <p class="panel-hint">上半是四个页签各被多少设备翻开过；下半是「精细调节」里各分组被改过的次数。</p>
        <div class="ranking" id="style-tab-ranking" style="margin-bottom:22px"></div>
        <div class="ranking" id="token-group-ranking"></div>
      </article>
    </section>

    <section class="grid thirds">
      <article class="panel">
        <div class="panel-head"><h2>面板打开</h2><span class="panel-kicker">Panels</span></div>
        <div class="ranking" id="panel-ranking"></div>
      </article>
      <article class="panel">
        <div class="panel-head"><h2>错误</h2><span class="panel-kicker">Errors</span></div>
        <div class="ranking" id="error-ranking"></div>
      </article>
      <article class="panel">
        <div class="panel-head"><h2>版本分布</h2><span class="panel-kicker">Versions</span></div>
        <table class="data-table"><thead><tr><th>版本</th><th>设备</th><th>操作</th></tr></thead><tbody id="version-body"></tbody></table>
      </article>
    </section>

    <section class="grid">
      <article class="panel">
        <div class="panel-head"><h2>功能使用排行</h2><span class="panel-kicker">Events</span></div>
        <div class="ranking" id="event-ranking"></div>
      </article>
      <article class="panel">
        <div class="panel-head"><h2>主题热度</h2><span class="panel-kicker">Themes</span></div>
        <div class="ranking" id="theme-ranking"></div>
      </article>
    </section>

    <section class="lower-grid">
      <article class="panel">
        <div class="panel-head"><h2>板块预设热度</h2><span class="panel-kicker">Blocks</span></div>
        <div class="ranking" id="block-ranking"></div>
      </article>
      <article class="panel">
        <div class="panel-head"><h2>反馈来源</h2><span class="panel-kicker">Feedback sources</span></div>
        <p class="panel-hint">反馈从哪个入口进来的：顶栏按钮、复制后的「贴进去正常吗」、出错提示。</p>
        <div class="ranking" id="feedback-source-ranking"></div>
      </article>
    </section>

    <section class="grid single">
      <article class="panel">
        <div class="panel-head"><h2>用户反馈</h2><span class="panel-kicker" id="feedback-kicker">Feedback</span></div>
        <div class="panel-tools" id="feedback-filters"></div>
        <table class="data-table feedback"><thead><tr><th>时间</th><th>类型</th><th>内容</th><th>去向</th><th>状态</th></tr></thead><tbody id="feedback-body"></tbody></table>
      </article>
    </section>

    <footer class="footnote">
      <div><strong>口径：</strong>活跃设备按匿名 ID 去重；操作量代表功能触发次数；「设备」列均为去重后的设备数；环比对比的是紧邻的上一段同长周期，且沿用当前筛选。</div>
      <div>不采集文章正文、标题、账号名称或可识别个人身份的信息。反馈为用户主动填写。</div>
    </footer>
  </main>

  <script>
    const EVENT_LABELS = {
      app_open: '打开应用', copy: '复制内容', theme_change: '切换主题', block_select: '点选预览块',
      block_apply: '应用板块', image_layout_apply: '应用图文排版', export: '导出文件',
      style_adjust: '调整全局样式', style_token_adjust: '精细调节', style_tab_open: '翻样式页签',
      style_preset_apply: '应用整套搭配', panel_open: '打开面板', workspace_mode: '切换工作区',
      mp_config_saved: '保存公众号配置', copy_verdict: '复制后评价', feedback_submit: '提交反馈', error: '出错'
    };
    const PLATFORM_LABELS = { desktop: '桌面端', web: '网页版', unknown: '未知平台' };
    const FUNNEL_LABELS = { app_open: '打开', theme_change: '换主题', block_select: '点选', copy: '复制' };
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
    const CATEGORY_LABELS = { heading: '标题', quote: '引用', card: '卡片', list: '列表', data: '数据', image: '图片', divider: '分隔', interactive: '互动' };
    const CONTROL_LABELS = {
      font_family: '字体', font_size: '字号', primary_color: '主色', primary_color_follow_theme: '主色跟随主题', primary_color_save: '保存自定义色',
      indent: '首行缩进', justify: '两端对齐', code_block_theme: '代码块主题', code_language: '代码语言标注', line_number: '代码行号',
      cite_links: '外链转脚注', word_count: '字数阅读时间', reset_text_group: '重置文字组', reset_detail_group: '重置细节组',
      preset_save: '保存方案', preset_cancel: '取消方案', layout_restore: '恢复当前版式', custom_layout_apply: '选自定义版式', custom_layout_save: '保存自定义版式'
    };
    const SURFACE_LABELS = { panel: '样式面板', full: '样式面板', compact: '预览旁快捷条' };
    const TAB_LABELS = { template: '版式', text: '文字', block: '区块', detail: '细节', component: '当前组件' };
    const TOKEN_GROUP_LABELS = {
      base: '基础', paragraph: '段落', link: '链接', blockquote: '引用', list: '列表', table: '表格', divider: '分隔线',
      image: '图片', figcaption: '图注', codeBlock: '代码块', inlineCode: '行内代码', h1: '一级标题', h2: '二级标题', h3: '三级标题',
      h4: '四级标题', h5: '五级标题', h6: '六级标题', '*': '全部'
    };
    const TOKEN_ACTION_LABELS = { set: '改', reset: '重置字段', reset_group: '重置分组', reset_all: '全部重置', palette: '按主色派生' };
    const PANEL_LABELS = { style: '样式', blocks: '板块库', posts: '文章列表', folder: '本地文件夹', upload_img: '插入图片', image_layout: '图文排版' };
    const ERROR_LABELS = { copy_process: '复制前处理失败', copy_no_output: '复制找不到输出区', copy_clipboard: '写剪贴板失败', storage_write: '本地存稿写入失败', storage_near_full: '本地存稿快满', mp_upload: '公众号图床上传失败' };
    const FEEDBACK_LABELS = { paste: '贴进去不一样', image: '图丢了', copy_fail: '复制失败', theme: '主题不对', block: '板块不对', style_panel: '样式面板难用', suggestion: '想要新功能', other: '其他' };
    // type 列是逗号串（多选标签）；老数据是单个值
    const feedbackTypes = (row) => String(row.type || '').split(',').filter(Boolean);
    const STATUS_LABELS = { open: '待处理', done: '已处理', ignored: '不处理' };
    const SOURCE_LABELS = { button: '顶栏按钮', nudge: '复制后提示', error: '出错提示', menu: '帮助菜单' };
    const MODE_LABELS = { simple: '简洁', professional: '专业' };
    const SERIES = [
      { key: 'app_open', label: '打开', color: '#171713' },
      { key: 'copy', label: '复制', color: '#b73327' },
      { key: 'theme_change', label: '换主题', color: '#315e78' },
      { key: 'block_select', label: '点选', color: '#2f6652' },
      { key: 'style_adjust', label: '调样式', color: '#a2762f' },
      { key: 'feedback_submit', label: '反馈', color: '#5b4a7a' },
      { key: 'error', label: '出错', color: '#2c6e6a' }
    ];
    const COLORS = ['#b73327', '#315e78', '#2f6652', '#a2762f', '#746f65'];
    const SMALL_SAMPLE = 20;

    const state = {
      key: sessionStorage.getItem('mobi-admin-key') || '',
      days: 30, from: '', to: '',
      filters: { platform: '', version: '', viewport: '', mode: '' },
      series: new Set(['app_open', 'copy']),
      showPrevious: true,
      drill: '',
      feedbackType: '', feedbackStatus: 'open',
      data: null,
      timer: null
    };
    const el = (id) => document.getElementById(id);
    const esc = (value) => String(value == null ? '' : value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
    const number = (value) => new Intl.NumberFormat('zh-CN').format(Number(value) || 0);
    const percent = (part, whole) => whole ? Math.round(Number(part || 0) / Number(whole) * 100) + '%' : '—';
    const empty = (text) => '<div class="empty">' + esc(text) + '</div>';
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function parseProps(value) {
      try { return JSON.parse(value || '{}'); } catch { return {}; }
    }
    function eventCount(data, event) {
      const row = (data && data.byEvent || []).find((item) => item.event === event);
      return row ? Number(row.count || 0) : 0;
    }
    function funnelUsers(data, event) {
      const row = (data && data.funnel || []).find((step) => step.event === event);
      return row ? Number(row.users || 0) : 0;
    }
    function dayKey(ts) { return new Date(ts).toISOString().slice(0, 10); }

    // ---------- 环比 ----------
    function deltaHtml(current, previous, options) {
      const opts = options || {};
      const cur = Number(current) || 0, prev = Number(previous) || 0;
      if (!prev && !cur) return '<span class="kpi-delta flat">上期无数据</span>';
      if (!prev) return '<span class="kpi-delta up">▲ 新增 · 上期 0</span>';
      const diff = cur - prev;
      const ratio = Math.round(diff / prev * 100);
      if (opts.points) {
        const pts = Math.round((cur - prev) * 100);
        if (!pts) return '<span class="kpi-delta flat">— 与上期持平</span>';
        return '<span class="kpi-delta ' + (pts > 0 ? 'up' : 'down') + '">' + (pts > 0 ? '▲ +' : '▼ ') + pts + ' 个点 · 上期 ' + Math.round(prev * 100) + '%</span>';
      }
      if (!diff) return '<span class="kpi-delta flat">— 与上期持平 (' + number(prev) + ')</span>';
      return '<span class="kpi-delta ' + (diff > 0 ? 'up' : 'down') + '">' + (diff > 0 ? '▲ +' : '▼ ') + ratio + '% · 上期 ' + number(prev) + '</span>';
    }

    function countUp(node, target, format) {
      const end = Number(target) || 0;
      if (reduced) { node.textContent = format(end); return; }
      const startText = node.dataset.value;
      const start = startText === undefined ? 0 : Number(startText) || 0;
      node.dataset.value = String(end);
      const t0 = performance.now(), dur = 650;
      function tick(now) {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        node.textContent = format(start + (end - start) * eased);
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    // ---------- 排行 ----------
    function renderRanking(target, items, options) {
      if (!items.length) { target.innerHTML = empty(options.emptyText || '当前周期暂无数据'); return; }
      const max = Math.max(...items.map((item) => Number(item.count || 0)), 1);
      const withUsers = items.some((item) => item.users !== undefined);
      target.innerHTML = items.slice(0, options.limit || 10).map((item, index) => {
        const label = options.label(item);
        const sub = options.sub ? options.sub(item) : '';
        const width = Math.max(2, Number(item.count || 0) / max * 100);
        const dim = options.dimSingle && Number(item.users) === 1 ? ' dim' : '';
        const attrs = options.attr ? ' ' + options.attr(item) : '';
        return '<div class="rank-row' + (withUsers ? ' with-users' : '') + dim + '"' + attrs + '>' +
          '<span class="rank-num">' + String(index + 1).padStart(2, '0') + '</span>' +
          '<span class="rank-name" title="' + esc(label) + '">' + esc(label) + (sub ? '<span class="rank-sub">' + esc(sub) + '</span>' : '') + '</span>' +
          '<span class="bar-track"><span class="bar ' + (options.color || '') + '" style="width:' + width + '%"></span></span>' +
          '<span class="rank-value">' + number(item.count) + '</span>' +
          (withUsers ? '<span class="rank-users">' + number(item.users) + ' 台</span>' : '') +
          '</div>';
      }).join('');
    }

    // ---------- 漏斗 + 下钻 ----------
    function renderFunnel(data) {
      const steps = data.funnel || [];
      const prev = data.previous && data.previous.funnel || [];
      if (!steps.length || !steps.some((step) => Number(step.users))) { el('funnel').innerHTML = empty('漏斗尚无数据（需要 2.3.4+ 客户端上报 app_open）'); el('drill').hidden = true; return; }
      const first = Number(steps[0].users || 0) || 1;
      el('funnel').innerHTML = steps.map((step, index) => {
        const users = Number(step.users || 0);
        const before = index ? Number(steps[index - 1].users || 0) : users;
        const prevUsers = Number((prev.find((row) => row.event === step.event) || {}).users || 0);
        const width = Math.max(1, users / first * 100);
        return '<div class="funnel-step' + (state.drill === step.event ? ' active' : '') + '" data-step="' + step.event + '" role="button" tabindex="0" title="点一下看这一步按平台 / 屏幕宽度拆分">' +
          '<span>' + esc(FUNNEL_LABELS[step.event] || step.event) + '</span>' +
          '<span class="funnel-bar"><span style="width:' + width + '%"></span></span>' +
          '<span class="funnel-value">' + number(users) + '<span class="funnel-prev">上期 ' + number(prevUsers) + '</span></span>' +
          '<span class="funnel-rate">' + (index ? percent(users, before) + ' ↓' : '100%') + '</span>' +
          '</div>';
      }).join('');
      el('funnel').querySelectorAll('[data-step]').forEach((node) => {
        const toggle = () => { state.drill = state.drill === node.dataset.step ? '' : node.dataset.step; renderFunnel(state.data); };
        node.addEventListener('click', toggle);
        node.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); } });
      });
      renderDrill(data);
    }

    function renderDrill(data) {
      const box = el('drill');
      if (!state.drill) { box.hidden = true; return; }
      const breakdown = data.funnelBreakdown || {};
      const byPlatform = (breakdown.platform || []).filter((row) => row.event === state.drill).map((row) => ({ label: PLATFORM_LABELS[row.platform] || row.platform || '未知', count: row.users }));
      const byViewport = (breakdown.viewport || []).filter((row) => row.event === state.drill).map((row) => ({ label: (row.viewport || '未知') + ' px', count: row.users }));
      box.hidden = false;
      box.innerHTML = '<div><h3>「' + esc(FUNNEL_LABELS[state.drill] || state.drill) + '」按平台</h3><div class="ranking" id="drill-platform"></div></div>' +
        '<div><h3>按屏幕宽度</h3><div class="ranking" id="drill-viewport"></div></div>';
      renderRanking(el('drill-platform'), byPlatform, { label: (item) => item.label, color: 'blue', emptyText: '这一步没有数据' });
      renderRanking(el('drill-viewport'), byViewport, { label: (item) => item.label, color: 'green', emptyText: '没有可关联的 app_open 宽度' });
    }

    // ---------- 趋势 ----------
    function renderSeriesChips() {
      const chips = SERIES.map((series) =>
        '<button class="chip' + (state.series.has(series.key) ? ' active' : '') + '" type="button" data-series="' + series.key + '" style="--chip-color:' + series.color + '"><span class="swatch"></span>' + esc(series.label) + '</button>'
      ).join('') + '<button class="chip' + (state.showPrevious ? ' active' : '') + '" type="button" id="chip-previous" style="--chip-color:#746f65"><span class="swatch"></span>上一周期（勾选系列合计）</button>';
      el('trend-series').innerHTML = chips;
      el('trend-series').querySelectorAll('[data-series]').forEach((chip) => chip.addEventListener('click', () => {
        const key = chip.dataset.series;
        if (state.series.has(key)) { if (state.series.size > 1) state.series.delete(key); } else { state.series.add(key); }
        renderSeriesChips(); renderTrend(state.data, false);
      }));
      el('chip-previous').addEventListener('click', () => { state.showPrevious = !state.showPrevious; renderSeriesChips(); renderTrend(state.data, false); });
    }

    function buildDays(range, days) {
      const list = [];
      const startTs = range && range.since ? range.since : Date.now() - (days - 1) * 86400000;
      const endTs = range && range.until ? range.until - 1 : Date.now();
      let cursor = Date.UTC(new Date(startTs).getUTCFullYear(), new Date(startTs).getUTCMonth(), new Date(startTs).getUTCDate());
      const end = Date.UTC(new Date(endTs).getUTCFullYear(), new Date(endTs).getUTCMonth(), new Date(endTs).getUTCDate());
      while (cursor <= end && list.length < 400) { list.push(dayKey(cursor)); cursor += 86400000; }
      return list;
    }

    function renderTrend(data, animate) {
      const wrap = el('trend');
      const days = buildDays(data.range, data.days || state.days);
      const rows = data.byDayEvent || [];
      if (!rows.length && !(data.byDay || []).length) { wrap.innerHTML = empty('每日趋势尚无数据') + '<div class="tooltip" id="trend-tip"></div>'; return; }

      const active = SERIES.filter((series) => state.series.has(series.key));
      const lookup = new Map(rows.map((row) => [row.day + '|' + row.event, Number(row.count || 0)]));
      const values = active.map((series) => days.map((day) => lookup.get(day + '|' + series.key) || 0));

      // 上一周期：只加勾选中的系列，按「第 N 天」对齐到当前周期的第 N 天
      const prevRows = data.previous && data.previous.byDayEvent || [];
      const prevDays = buildDays(data.previous && data.previous.range, days.length);
      const prevLookup = new Map();
      prevRows.forEach((row) => { if (state.series.has(row.event)) prevLookup.set(row.day, (prevLookup.get(row.day) || 0) + Number(row.count || 0)); });
      const prevValues = state.showPrevious ? days.map((_, index) => prevLookup.get(prevDays[index]) || 0) : [];

      const width = 760, height = 250, left = 36, right = 14, top = 18, bottom = 30;
      const plotW = width - left - right, plotH = height - top - bottom;
      const allValues = values.flat().concat(prevValues);
      const max = Math.max(...allValues, 1);
      const x = (index) => left + (days.length === 1 ? plotW / 2 : index / (days.length - 1) * plotW);
      const y = (value) => top + plotH - value / max * plotH;
      const path = (arr) => arr.map((value, index) => (index ? 'L' : 'M') + x(index).toFixed(1) + ' ' + y(value).toFixed(1)).join(' ');

      const ticks = [0, .5, 1].map((ratio) => {
        const yy = top + plotH - ratio * plotH;
        return '<line class="grid-line" x1="' + left + '" y1="' + yy + '" x2="' + (width - right) + '" y2="' + yy + '"></line>' +
          '<text class="axis-label" x="0" y="' + (yy + 3) + '">' + Math.round(max * ratio) + '</text>';
      }).join('');
      const labelIdx = days.length <= 1 ? [0] : [0, Math.floor((days.length - 1) / 2), days.length - 1];
      const labels = labelIdx.map((index, i) =>
        '<text class="axis-label" text-anchor="' + (i === 0 ? 'start' : i === labelIdx.length - 1 ? 'end' : 'middle') + '" x="' + x(index) + '" y="' + (height - 4) + '">' + days[index].slice(5).replace('-', '/') + '</text>'
      ).join('');
      const ghost = prevValues.length ? '<path class="series-line ghost" d="' + path(prevValues) + '"></path>' : '';
      const areas = active.map((series, i) => {
        const line = path(values[i]);
        return '<path class="series-area" fill="' + series.color + '" d="' + line + ' L ' + x(days.length - 1).toFixed(1) + ' ' + (top + plotH) + ' L ' + x(0).toFixed(1) + ' ' + (top + plotH) + ' Z"></path>';
      }).join('');
      const lines = active.map((series, i) => '<path class="series-line" stroke="' + series.color + '" d="' + path(values[i]) + '"></path>').join('');
      const hoverDots = active.map((series) => '<circle class="hover-dot" data-dot="' + series.key + '" r="4.5" fill="' + series.color + '"></circle>').join('');

      wrap.innerHTML = '<svg class="trend-svg' + (animate && !reduced ? ' draw' : '') + '" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="每日趋势">' +
        ticks + areas + ghost + lines +
        '<line class="crosshair" id="crosshair" x1="0" x2="0" y1="' + top + '" y2="' + (top + plotH) + '"></line>' + hoverDots +
        '<rect class="hit" x="' + left + '" y="' + top + '" width="' + plotW + '" height="' + plotH + '"></rect>' +
        labels + '</svg><div class="tooltip" id="trend-tip"></div>';

      const svg = wrap.querySelector('svg');
      const hit = wrap.querySelector('.hit');
      const tipNode = el('trend-tip');
      function onMove(event) {
        const rect = svg.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width * width;
        const index = days.length === 1 ? 0 : Math.max(0, Math.min(days.length - 1, Math.round((px - left) / plotW * (days.length - 1))));
        const cx = x(index);
        svg.classList.add('hovering');
        el('crosshair').setAttribute('x1', cx); el('crosshair').setAttribute('x2', cx);
        active.forEach((series, i) => {
          const dot = svg.querySelector('[data-dot="' + series.key + '"]');
          dot.setAttribute('cx', cx); dot.setAttribute('cy', y(values[i][index]));
        });
        const rowsHtml = active.map((series, i) => '<div class="tooltip-row"><span><i style="background:' + series.color + '"></i>' + esc(series.label) + '</span><b>' + number(values[i][index]) + '</b></div>').join('') +
          (prevValues.length ? '<div class="tooltip-row" style="opacity:.7"><span><i style="background:#746f65"></i>上期第 ' + (index + 1) + ' 天（同系列合计）</span><b>' + number(prevValues[index]) + '</b></div>' : '');
        tipNode.innerHTML = '<strong>' + days[index] + '</strong>' + rowsHtml;
        tipNode.style.left = (cx / width * rect.width) + 'px';
        tipNode.style.top = '0px';
        tipNode.classList.add('show');
      }
      hit.addEventListener('mousemove', onMove);
      hit.addEventListener('mouseleave', () => { svg.classList.remove('hovering'); tipNode.classList.remove('show'); });
    }

    // ---------- 平台 ----------
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
        '<span>' + esc(PLATFORM_LABELS[item.platform] || item.platform || '未知平台') + '<span class="rank-sub">' + number(item.users) + ' 台设备</span></span>' +
        '<span class="legend-value">' + Math.round(Number(item.events || 0) / total * 100) + '%</span></div>'
      ).join('');
    }

    // ---------- 留存 ----------
    function heat(part, whole, matured) {
      if (!whole) return '<span class="heat" style="color:var(--muted)">—</span>';
      if (!matured) return '<span class="retention-cell"><span class="heat" style="color:var(--muted)">' + number(part) + '</span><small>未满期</small></span>';
      const ratio = Number(part) / Number(whole);
      const alpha = Math.min(.85, .12 + ratio * .9);
      return '<span class="retention-cell"><span class="heat" style="background:rgba(47,102,82,' + alpha.toFixed(2) + ');color:' + (ratio > .45 ? '#fff' : 'var(--ink)') + '">' + Math.round(ratio * 100) + '%</span><small>' + number(part) + ' / ' + number(whole) + '</small></span>';
    }
    function renderRetention(rows) {
      if (!rows.length) { el('retention-body').innerHTML = '<tr><td colspan="4">周期内没有新设备</td></tr>'; return; }
      el('retention-body').innerHTML = rows.map((row) => {
        const cohort = Number(row.cohort || 0);
        return '<tr><td>' + esc(row.week) + ' 周</td><td>' + number(cohort) + '</td>' +
          '<td>' + heat(row.d7, row.d7_matured, Number(row.d7_matured) === cohort) + '</td>' +
          '<td>' + heat(row.d14, row.d14_matured, Number(row.d14_matured) === cohort) + '</td></tr>';
      }).join('');
    }
    function retentionRate(rows) {
      let part = 0, whole = 0;
      rows.forEach((row) => { part += Number(row.d7 || 0); whole += Number(row.d7_matured || 0); });
      return { part, whole };
    }

    // ---------- 其它面板 ----------
    function renderVersions(rows) {
      el('version-body').innerHTML = rows.length ? rows.map((item) =>
        '<tr><td>' + esc(item.version || '未知版本') + '</td><td>' + number(item.users) + '</td><td>' + number(item.events) + '</td></tr>'
      ).join('') : '<tr><td colspan="3">暂无版本数据</td></tr>';
    }

    function renderCopyFacts(ctx, verdictRows) {
      const copies = Number(ctx.copies || 0);
      const facts = [
        ['复制到公众号', number(copies), '次'],
        ['带板块的稿子', percent(ctx.with_blocks, copies), number(ctx.with_blocks) + ' 次'],
        ['带图的稿子', percent(ctx.with_images, copies), number(ctx.with_images) + ' 次'],
        ['复制时有图没转存', percent(ctx.with_unsafe_images, copies), number(ctx.with_unsafe_images) + ' 次'],
        ['复制时已配图床', percent(ctx.mp_configured, copies), number(ctx.mp_configured) + ' 次']
      ];
      el('copy-facts').innerHTML = copies ? facts.map((fact) =>
        '<div class="fact"><p class="fact-label">' + esc(fact[0]) + '</p><p class="fact-value">' + esc(fact[1]) + '<small>' + esc(fact[2]) + '</small></p></div>'
      ).join('') : empty('尚无带上下文的复制记录（需要新版客户端）');
      const ok = verdictRows.find((row) => row.verdict === 'ok') || {};
      const bad = verdictRows.find((row) => row.verdict === 'bad') || {};
      const answered = Number(ok.count || 0) + Number(bad.count || 0);
      el('copy-verdict').innerHTML =
        '<div class="verdict-card good"><span>复制后说「正常」</span><b>' + number(ok.count) + '</b><span>' + number(ok.users) + ' 台设备 · ' + percent(ok.count, answered) + '</span></div>' +
        '<div class="verdict-card bad"><span>复制后说「不对」</span><b>' + number(bad.count) + '</b><span>' + number(bad.users) + ' 台设备 · ' + (answered ? percent(bad.count, answered) : '尚无回答') + '</span></div>';
    }

    // ---------- 反馈 ----------
    function renderFeedbackFilters(rows) {
      const types = [''].concat(Object.keys(FEEDBACK_LABELS));
      const statuses = ['open', 'done', 'ignored', ''];
      const countBy = (fn) => rows.filter(fn).length;
      el('feedback-filters').innerHTML =
        statuses.map((status) => '<button class="chip' + (state.feedbackStatus === status ? ' active' : '') + '" type="button" data-fstatus="' + status + '">' + (status ? STATUS_LABELS[status] : '全部状态') + ' · ' + countBy((row) => !status || (row.status || 'open') === status) + '</button>').join('') +
        '<span style="width:12px"></span>' +
        types.map((type) => '<button class="chip' + (state.feedbackType === type ? ' active' : '') + '" type="button" data-ftype="' + type + '">' + (type ? FEEDBACK_LABELS[type] + ' · ' + countBy((row) => feedbackTypes(row).includes(type)) : '全部标签') + '</button>').join('');
      el('feedback-filters').querySelectorAll('[data-fstatus]').forEach((chip) => chip.addEventListener('click', () => { state.feedbackStatus = chip.dataset.fstatus; renderFeedback(state.data); }));
      el('feedback-filters').querySelectorAll('[data-ftype]').forEach((chip) => chip.addEventListener('click', () => { state.feedbackType = chip.dataset.ftype; renderFeedback(state.data); }));
    }

    async function setFeedbackStatus(id, status, select) {
      select.disabled = true;
      try {
        const response = await fetch('/feedback/' + id + '/status', { method: 'POST', headers: { Authorization: 'Bearer ' + state.key, 'content-type': 'text/plain' }, body: JSON.stringify({ status }) });
        if (!response.ok) throw new Error('status ' + response.status);
        const row = (state.data.feedback || []).find((item) => Number(item.id) === Number(id));
        if (row) row.status = status;
        renderFeedback(state.data);
      } catch (error) {
        select.disabled = false;
        alert('更新失败：' + (error.message || error));
      }
    }

    function renderFeedback(data) {
      const rows = data.feedback || [];
      renderFeedbackFilters(rows);
      const open = rows.filter((row) => (row.status || 'open') === 'open').length;
      el('feedback-kicker').textContent = 'Feedback · ' + open + ' 条待处理';
      const shown = rows.filter((row) => (!state.feedbackStatus || (row.status || 'open') === state.feedbackStatus) && (!state.feedbackType || feedbackTypes(row).includes(state.feedbackType)));
      if (!shown.length) { el('feedback-body').innerHTML = '<tr><td colspan="5">' + (rows.length ? '这个筛选下没有反馈' : '当前周期没有反馈') + '</td></tr>'; return; }
      el('feedback-body').innerHTML = shown.map((item) => {
        const ctx = parseProps(item.context);
        const source = ctx.source ? SOURCE_LABELS[ctx.source] || ctx.source : '';
        const meta = Object.entries(ctx).filter(([key]) => key !== 'source').map(([key, value]) => key + '=' + value).join('  ');
        const when = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(Number(item.ts)));
        const dest = item.issue_url
          ? '<a href="' + esc(item.issue_url) + '" target="_blank" rel="noopener">Issue</a>'
          : '<span class="tag muted">仅 D1</span>';
        const status = item.status || 'open';
        return '<tr class="' + status + '"><td style="white-space:nowrap">' + esc(when) + (source ? '<span class="feedback-meta">来自 ' + esc(source) + '</span>' : '') + '</td>' +
          '<td>' + (feedbackTypes(item).length ? feedbackTypes(item).map((type) => '<span class="tag' + (type === 'paste' || type === 'image' || type === 'copy_fail' ? ' red' : '') + '" style="margin:1px 2px 1px 0">' + esc(FEEDBACK_LABELS[type] || type) + '</span>').join('') : '<span class="tag muted">无标签</span>') + '</td>' +
          '<td><div class="feedback-msg">' + (item.message ? esc(item.message) : '<span style="color:var(--muted)">（只勾了标签）</span>') + '</div>' +
          (item.contact ? '<span class="feedback-meta">联系：' + esc(item.contact) + '</span>' : '') +
          (meta ? '<span class="feedback-meta">' + esc(meta) + '</span>' : '') + '</td>' +
          '<td>' + dest + '</td>' +
          '<td><select class="status-select ' + status + '" data-fid="' + esc(item.id) + '">' + ['open', 'done', 'ignored'].map((option) => '<option value="' + option + '"' + (option === status ? ' selected' : '') + '>' + STATUS_LABELS[option] + '</option>').join('') + '</select></td></tr>';
      }).join('');
      el('feedback-body').querySelectorAll('[data-fid]').forEach((select) => select.addEventListener('change', () => setFeedbackStatus(select.dataset.fid, select.value, select)));
    }

    function renderFeedbackSources(rows) {
      const counts = new Map();
      rows.forEach((row) => { const source = parseProps(row.context).source || 'button'; counts.set(source, (counts.get(source) || 0) + 1); });
      const items = Array.from(counts.entries()).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);
      renderRanking(el('feedback-source-ranking'), items, { label: (item) => SOURCE_LABELS[item.source] || item.source, color: 'gold', emptyText: '周期内没有反馈' });
    }

    // ---------- 筛选项 ----------
    function fillSelect(select, rows, key, labelFn, current) {
      const options = ['<option value="">全部</option>'].concat(rows.map((row) => '<option value="' + esc(row[key]) + '">' + esc(labelFn(row[key])) + ' · ' + number(row.users) + ' 台</option>'));
      if (current && !rows.some((row) => String(row[key]) === current)) options.push('<option value="' + esc(current) + '">' + esc(labelFn(current)) + '（本期无数据）</option>');
      select.innerHTML = options.join('');
      select.value = current || '';
      select.classList.toggle('on', Boolean(current));
    }
    function renderFilters(data) {
      const filters = data.filters || {};
      fillSelect(el('f-version'), filters.versions || [], 'version', (value) => value, state.filters.version);
      fillSelect(el('f-viewport'), filters.viewports || [], 'viewport', (value) => value + ' px', state.filters.viewport);
      const modeRows = (filters.modes || []).filter((row) => row.mode);
      fillSelect(el('f-mode'), modeRows, 'mode', (value) => MODE_LABELS[value] || value, state.filters.mode);
      el('f-platform').value = state.filters.platform;
      el('f-platform').classList.toggle('on', Boolean(state.filters.platform));
      const any = Object.values(state.filters).some(Boolean);
      el('filter-clear').hidden = !any;
      const fmt = (ts) => new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date(ts));
      const range = data.range || {};
      const prev = data.previous && data.previous.range || {};
      el('range-text').textContent = range.since ? fmt(range.since) + ' – ' + fmt(range.until - 1) : '';
      el('compare-text').textContent = prev.since ? '环比：对比 ' + fmt(prev.since) + ' – ' + fmt(prev.until - 1) + (any ? '（沿用当前筛选）' : '') : '';
    }

    // ---------- 总渲染 ----------
    function render(data, animate) {
      state.data = data;
      const prev = data.previous || {};
      const opened = funnelUsers(data, 'app_open'), copied = funnelUsers(data, 'copy');
      const prevOpened = funnelUsers(prev, 'app_open'), prevCopied = funnelUsers(prev, 'copy');
      const weak = Number(data.activeUsers) < SMALL_SAMPLE;

      el('sample-notice').hidden = !weak;
      el('sample-notice').textContent = '本期只有 ' + number(data.activeUsers) + ' 台设备，少于 ' + SMALL_SAMPLE + ' 台。任何百分比和环比都会被一两个人的行为大幅带动，请以绝对数为准，不要据此砍功能。';
      document.querySelectorAll('.kpi').forEach((node) => node.classList.toggle('weak', weak));

      countUp(el('kpi-users'), data.activeUsers, (value) => number(Math.round(value)));
      el('kpi-users-delta').outerHTML = deltaHtml(data.activeUsers, prev.activeUsers).replace('class="kpi-delta', 'id="kpi-users-delta" class="kpi-delta');
      el('kpi-users-note').textContent = '新增 ' + number(data.newUsers) + ' · 回访（≥2 天）' + number(data.returningUsers);

      countUp(el('kpi-copies'), eventCount(data, 'copy'), (value) => number(Math.round(value)));
      el('kpi-copies-delta').outerHTML = deltaHtml(eventCount(data, 'copy'), eventCount(prev, 'copy')).replace('class="kpi-delta', 'id="kpi-copies-delta" class="kpi-delta');
      el('kpi-copies-note').textContent = number(copied) + ' 台设备复制过';

      el('kpi-conversion').textContent = opened ? percent(copied, opened) : '—';
      el('kpi-conversion-delta').outerHTML = (opened && prevOpened ? deltaHtml(copied / opened, prevCopied / prevOpened, { points: true }) : '<span class="kpi-delta flat">上期无可比数据</span>').replace('class="kpi-delta', 'id="kpi-conversion-delta" class="kpi-delta');
      el('kpi-conversion-note').textContent = number(copied) + ' / ' + number(opened) + ' 台';

      const ret = retentionRate(data.retention || []);
      el('kpi-retention').textContent = ret.whole ? percent(ret.part, ret.whole) : '—';
      el('kpi-retention-delta').outerHTML = '<span id="kpi-retention-delta" class="kpi-delta flat">' + (ret.whole ? number(ret.part) + ' / ' + number(ret.whole) + ' 台已满 7 天' : '还没有满 7 天的新设备') + '</span>';

      renderFilters(data);
      renderFunnel(data);
      renderRanking(el('viewport-ranking'), (data.byViewport || []).map((row) => ({ ...row, count: row.users })), {
        label: (item) => item.viewport ? item.viewport + ' px' : '未知',
        sub: (item) => number(item.opens) + ' 次打开',
        color: 'blue',
        attr: (item) => 'data-viewport="' + esc(item.viewport || '') + '" style="cursor:pointer" title="只看这类设备"',
        emptyText: '尚无宽度数据（需要新版客户端）'
      });
      el('viewport-ranking').querySelectorAll('[data-viewport]').forEach((row) => row.addEventListener('click', () => {
        state.filters.viewport = state.filters.viewport === row.dataset.viewport ? '' : row.dataset.viewport;
        load();
      }));
      renderSeriesChips();
      renderTrend(data, animate);
      renderPlatforms(data.byPlatform || []);
      renderRetention(data.retention || []);
      renderCopyFacts(data.copyContext || {}, data.copyVerdict || []);

      renderRanking(el('style-control-ranking'), (data.byStyleControl || []).map((row) => ({ ...row })), {
        label: (item) => CONTROL_LABELS[item.control] || item.control || '未知',
        sub: (item) => (SURFACE_LABELS[item.surface] || item.surface || '') + ' · ' + (item.control || ''),
        color: 'red',
        limit: 30,
        dimSingle: true,
        emptyText: '尚无样式调整记录（需要新版客户端）'
      });
      renderRanking(el('style-tab-ranking'), (data.byStyleTab || []).map((row) => ({ ...row })), {
        label: (item) => '页签 · ' + (TAB_LABELS[item.tab] || item.tab || '未知'),
        color: 'blue',
        emptyText: '尚无页签记录'
      });
      renderRanking(el('token-group-ranking'), (data.byTokenGroup || []).map((row) => ({ ...row })), {
        label: (item) => '精细 · ' + (TOKEN_GROUP_LABELS[item.grp] || item.grp || '未知'),
        sub: (item) => TOKEN_ACTION_LABELS[item.action] || item.action || '',
        limit: 20,
        dimSingle: true,
        emptyText: '尚无精细调节记录'
      });

      renderRanking(el('panel-ranking'), (data.byPanel || []).map((row) => ({ ...row })), {
        label: (item) => PANEL_LABELS[item.panel] || item.panel || '未知',
        color: 'green',
        emptyText: '尚无面板记录'
      });
      renderRanking(el('error-ranking'), (data.byError || []).map((row) => ({ ...row })), {
        label: (item) => ERROR_LABELS[item.kind] || item.kind || '未知',
        sub: (item) => item.message || '',
        color: 'red',
        limit: 15,
        emptyText: '周期内没有记录到错误'
      });
      renderVersions(data.byVersion || []);
      renderRanking(el('event-ranking'), data.byEvent || [], { label: (item) => EVENT_LABELS[item.event] || item.event, sub: (item) => item.event, color: 'red', limit: 20 });

      const details = (data.topDetails || []).map((item) => ({ ...item, parsed: parseProps(item.props) }));
      const themes = data.byTheme
        ? data.byTheme.filter((row) => row.theme)
        : details.filter((item) => item.event === 'theme_change' && item.parsed.theme).map((item) => ({ theme: item.parsed.theme, count: item.count }));
      renderRanking(el('theme-ranking'), themes, { label: (item) => THEME_LABELS[item.theme] || item.theme, sub: (item) => item.theme, color: 'blue' });
      const blocks = data.byBlock
        ? data.byBlock.filter((row) => row.preset)
        : details.filter((item) => item.event === 'block_apply' && item.parsed.preset).map((item) => ({ preset: item.parsed.preset, category: item.parsed.category, count: item.count }));
      renderRanking(el('block-ranking'), blocks, {
        label: (item) => BLOCK_LABELS[item.preset] || item.preset,
        sub: (item) => (CATEGORY_LABELS[item.category] || item.category || '板块') + ' · ' + item.preset,
        limit: 15
      });

      renderFeedbackSources(data.feedback || []);
      renderFeedback(data);

      if (animate && !reduced) {
        document.querySelectorAll('.panel').forEach((panel) => { panel.classList.remove('fresh'); void panel.offsetWidth; panel.classList.add('fresh'); });
      }
    }

    // ---------- 请求 / 状态 ----------
    function queryString() {
      const params = new URLSearchParams();
      if (state.from) { params.set('from', state.from); if (state.to) params.set('to', state.to); } else { params.set('days', String(state.days)); }
      Object.entries(state.filters).forEach(([key, value]) => { if (value) params.set(key, value); });
      return params.toString();
    }
    function syncUrl() {
      const qs = queryString();
      history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
    }
    function readUrl() {
      const params = new URLSearchParams(location.search);
      if (params.get('from')) { state.from = params.get('from'); state.to = params.get('to') || params.get('from'); }
      else if (params.get('days')) { state.days = Number(params.get('days')) || 30; }
      Object.keys(state.filters).forEach((key) => { if (params.get(key)) state.filters[key] = params.get(key); });
      document.querySelectorAll('[data-days]').forEach((item) => item.classList.toggle('active', !state.from && Number(item.dataset.days) === state.days));
      el('custom-toggle').classList.toggle('active', Boolean(state.from));
      el('custom-range').hidden = !state.from;
      if (state.from) { el('date-from').value = state.from; el('date-to').value = state.to; }
      // 密钥若曾出现在网址里（老链接），读进来后立刻清掉
      if (params.get('key')) { state.key = params.get('key'); sessionStorage.setItem('mobi-admin-key', state.key); }
    }

    let inflight = null;
    async function load(options) {
      const animate = !(options && options.silent);
      if (!state.key) { el('gate').hidden = false; return; }
      if (inflight) inflight.abort();
      inflight = new AbortController();
      if (animate) el('app').classList.add('loading');
      el('status-dot').classList.remove('live');
      el('status-text').textContent = '正在读取';
      syncUrl();
      try {
        const response = await fetch('/stats?' + queryString(), { headers: { Authorization: 'Bearer ' + state.key }, signal: inflight.signal });
        if (response.status === 401) throw new Error('密钥无效，请重新输入');
        if (!response.ok) throw new Error('数据读取失败（' + response.status + '）');
        const data = await response.json();
        render(data, animate);
        el('gate').hidden = true;
        el('gate-error').textContent = '';
        el('status-dot').classList.add('live');
        el('status-text').textContent = state.timer ? '实时 · 每 60 秒' : '数据已连接';
        el('updated').textContent = '更新于 ' + new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date());
      } catch (error) {
        if (error.name === 'AbortError') return;
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
    el('refresh').addEventListener('click', () => load());
    el('logout').addEventListener('click', () => {
      sessionStorage.removeItem('mobi-admin-key');
      state.key = '';
      el('key-input').value = '';
      el('gate').hidden = false;
      el('gate-error').textContent = '';
    });
    document.querySelectorAll('[data-days]').forEach((button) => button.addEventListener('click', () => {
      state.days = Number(button.dataset.days);
      state.from = ''; state.to = '';
      document.querySelectorAll('[data-days]').forEach((item) => item.classList.toggle('active', item === button));
      el('custom-toggle').classList.remove('active');
      el('custom-range').hidden = true;
      load();
    }));
    el('custom-toggle').addEventListener('click', () => {
      const show = el('custom-range').hidden;
      el('custom-range').hidden = !show;
      if (show && !el('date-from').value) {
        const today = new Date();
        el('date-to').value = dayKey(today.getTime());
        el('date-from').value = dayKey(today.getTime() - 13 * 86400000);
      }
    });
    el('apply-range').addEventListener('click', () => {
      const from = el('date-from').value, to = el('date-to').value || from;
      if (!from) return;
      state.from = from <= to ? from : to; state.to = from <= to ? to : from;
      document.querySelectorAll('[data-days]').forEach((item) => item.classList.remove('active'));
      el('custom-toggle').classList.add('active');
      load();
    });
    document.querySelectorAll('[data-filter]').forEach((select) => select.addEventListener('change', () => {
      state.filters[select.dataset.filter] = select.value;
      load();
    }));
    el('filter-clear').addEventListener('click', () => {
      Object.keys(state.filters).forEach((key) => { state.filters[key] = ''; });
      load();
    });
    el('auto-refresh').addEventListener('change', (event) => {
      if (state.timer) { clearInterval(state.timer); state.timer = null; }
      if (event.target.checked) { state.timer = setInterval(() => load({ silent: true }), 60000); el('status-text').textContent = '实时 · 每 60 秒'; }
      else { el('status-text').textContent = '数据已连接'; }
      event.target.closest('.toggle').classList.toggle('active', event.target.checked);
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && state.timer) load({ silent: true }); });

    readUrl();
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
