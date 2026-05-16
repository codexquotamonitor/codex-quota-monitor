const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ROOT = path.join(__dirname, '..');
const STORE_ASSETS = path.join(ROOT, 'store-assets');
const SCREENSHOTS = path.join(STORE_ASSETS, 'screenshots');
const ICON_DATA_URI = `data:image/png;base64,${fs.readFileSync(path.join(ROOT, 'icons', 'icon128.png')).toString('base64')}`;

const COLORS = {
  ink: '#0b0f14',
  page: '#f7faf9',
  darkPage: '#091015',
  darkSurface: '#111827',
  darkSurface2: '#1f2937',
  lightSurface: '#eaf3ef',
  lightSurface2: '#d6e5df',
  orange: '#e67e00',
  orangeSoft: '#ffb74d',
  orangeDeep: '#b45309',
  green: '#16a34a',
  blue: '#0284c7',
  white: '#ffffff',
  text: '#1f2937',
  muted: '#68756f',
};

const SAMPLE = {
  plan: 'Plus',
  usedPercent: 27,
  sessionRemaining: 73,
  sessionReset: '4h 35m',
  weeklyRemaining: 96,
  weeklyReset: '6d 2h 35m',
  credits: '0',
  updatedAgo: '31s',
};

function ensureDirs() {
  fs.mkdirSync(SCREENSHOTS, { recursive: true });
}

function loadLocale(code) {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, '_locales', code, 'messages.json'), 'utf8'));
  return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, value.message]));
}

function chromeArgs() {
  return ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--headless=new'];
}

async function renderPng({ html, width, height, out, deviceScaleFactor = 1 }) {
  const browser = await puppeteer.launch({ args: chromeArgs() });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: out });
  } finally {
    await browser.close();
  }
}

function brandBackground(extraCss = '') {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      overflow: hidden;
      background:
        radial-gradient(circle at 16% 14%, rgba(230,126,0,.19), transparent 28%),
        radial-gradient(circle at 84% 82%, rgba(2,132,199,.13), transparent 26%),
        ${COLORS.darkPage};
      color: ${COLORS.white};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      position: relative;
    }
    body::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image: radial-gradient(circle, rgba(255,255,255,.08) 1px, transparent 1px);
      background-size: 30px 30px;
      opacity: .5;
    }
    ${extraCss}
  `;
}

function logo(size = 44) {
  return `<img src="${ICON_DATA_URI}" alt="" style="width:${size}px;height:${size}px;border-radius:${Math.round(size * .22)}px;display:block;">`;
}

function popupStyles(dark = true) {
  const vars = dark
    ? `
      --popup-bg:${COLORS.darkPage};
      --surface:${COLORS.darkSurface};
      --surface2:${COLORS.darkSurface2};
      --text:#d1d5db;
      --text-bright:#fff;
      --muted:#8b95a1;
      --label:#6b7280;
      --bar-bg:#253142;
      --badge-bg:#241607;
      --brand-text:${COLORS.orangeSoft};
    `
    : `
      --popup-bg:${COLORS.page};
      --surface:${COLORS.lightSurface};
      --surface2:${COLORS.lightSurface2};
      --text:${COLORS.text};
      --text-bright:${COLORS.ink};
      --muted:#60706c;
      --label:${COLORS.muted};
      --bar-bg:#d4dfdf;
      --badge-bg:#fff3e0;
      --brand-text:${COLORS.orangeDeep};
    `;

  return `
    .popup {
      ${vars}
      width: 280px;
      background: var(--popup-bg);
      color: var(--text);
      border-radius: 14px;
      border: 1px solid rgba(230,126,0,.18);
      box-shadow: 0 22px 60px rgba(0,0,0,.42), 0 0 0 1px rgba(230,126,0,.08);
    }
    .popup-body { padding: 16px; display:flex; flex-direction:column; gap:14px; }
    .popup header { display:flex; align-items:center; gap:10px; }
    .popup .head-copy { flex:1; display:flex; flex-direction:column; gap:4px; min-width:0; }
    .popup .top, .popup .bottom, .popup .meta { display:flex; justify-content:space-between; align-items:center; }
    .popup h1 { font-size:15px; line-height:1; font-weight:600; color:var(--text-bright); white-space:nowrap; }
    .popup .badge { font-size:11px; color:var(--brand-text); background:var(--badge-bg); border:1px solid ${COLORS.orange}; border-radius:999px; padding:2px 8px; }
    .popup .icon { color:var(--muted); font-size:13px; line-height:1; }
    .popup .label { font-size:11px; text-transform:uppercase; letter-spacing:.6px; color:var(--label); margin-bottom:6px; }
    .popup .track { height:10px; background:var(--bar-bg); border-radius:999px; overflow:hidden; margin-bottom:6px; }
    .popup .track.sm { height:6px; margin-bottom:4px; }
    .popup .bar { height:100%; border-radius:inherit; background:${COLORS.green}; }
    .popup .pct { font-size:20px; line-height:1; font-weight:700; color:var(--text-bright); }
    .popup .reset { text-align:right; }
    .popup .reset small { display:block; color:var(--muted); font-size:10px; }
    .popup .reset strong { display:block; color:${COLORS.blue}; font-size:13px; }
    .popup .details { background:var(--surface); border-radius:8px; padding:10px 12px; }
    .popup .details .label { margin-bottom:8px; }
    .popup .cat { font-size:10px; font-weight:600; text-transform:uppercase; letter-spacing:.5px; color:var(--muted); margin-bottom:5px; }
    .popup .small { font-size:11px; }
    .popup .divider { height:1px; background:var(--surface2); margin:8px 0; }
    .popup .credits { display:flex; gap:4px; align-items:center; }
    .popup .tip { color:${COLORS.blue}; font-weight:700; }
    .popup .update { display:flex; justify-content:flex-end; gap:5px; color:var(--muted); font-size:11px; }
    .popup footer { border-top:1px solid rgba(230,126,0,.12); padding:10px 16px; }
    .popup .button { text-align:center; padding:7px; border:1px solid ${COLORS.orange}; border-radius:8px; color:var(--brand-text); background:var(--badge-bg); font-size:12px; }
  `;
}

function popupHtml(strings, { dark = true, rtl = false } = {}) {
  return `
    <div class="popup" dir="${rtl ? 'rtl' : 'ltr'}">
      <div class="popup-body">
        <header>
          ${logo(32)}
          <div class="head-copy">
            <div class="top">
              <h1>Codex Quota Monitor</h1>
              <span class="icon">${dark ? '◐' : '☼'}</span>
            </div>
            <div class="bottom">
              <span class="badge">${SAMPLE.plan}</span>
              <span class="icon">◎</span>
            </div>
          </div>
        </header>

        <section>
          <div class="label">${strings.session_label}</div>
          <div class="track"><div class="bar" style="width:${SAMPLE.usedPercent}%"></div></div>
          <div class="meta">
            <span class="pct">${SAMPLE.usedPercent}% ${strings.used_suffix}</span>
            <div class="reset">
              <small>${strings.resets_in}</small>
              <strong>${SAMPLE.sessionReset}</strong>
            </div>
          </div>
        </section>

        <section class="details">
          <div class="label">${strings.details_label}</div>
          <div class="cat">${strings.remaining}</div>
          <div class="track sm"><div class="bar" style="width:${SAMPLE.sessionRemaining}%"></div></div>
          <div class="meta small">
            <span>${SAMPLE.sessionRemaining}%</span>
            <span>${strings.resets_in} ${SAMPLE.sessionReset}</span>
          </div>
          <div class="divider"></div>
          <div class="cat">${strings.weekly_label}</div>
          <div class="track sm"><div class="bar" style="width:${SAMPLE.weeklyRemaining}%"></div></div>
          <div class="meta small">
            <span>${SAMPLE.weeklyRemaining}%</span>
            <span>${strings.resets_in} ${SAMPLE.weeklyReset}</span>
          </div>
          <div class="divider"></div>
          <div class="cat credits"><span>${strings.credits_remaining}</span><span class="tip">(?)</span></div>
          <div class="meta small"><span>${SAMPLE.credits}</span></div>
        </section>

        <div class="update">${strings.updated_ago} ${SAMPLE.updatedAgo} ↻</div>
      </div>
      <footer><div class="button">${strings.view_quota_btn}</div></footer>
    </div>
  `;
}

module.exports = {
  COLORS,
  ICON_DATA_URI,
  ROOT,
  SAMPLE,
  SCREENSHOTS,
  STORE_ASSETS,
  brandBackground,
  ensureDirs,
  loadLocale,
  logo,
  popupHtml,
  popupStyles,
  renderPng,
};
