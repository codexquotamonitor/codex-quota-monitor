const path = require('path');
const { STORE_ASSETS, brandBackground, ensureDirs, loadLocale, logo, popupHtml, popupStyles, renderPng } = require('./render-helpers');

ensureDirs();
const en = loadLocale('en');

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  ${brandBackground(`
    body { width:2048px; height:1152px; }
    ${popupStyles(true)}
    .safe { position:relative; z-index:1; width:1546px; height:422px; margin:365px auto 0; display:flex; align-items:center; justify-content:center; gap:72px; }
    .copy { width:650px; display:flex; flex-direction:column; gap:22px; }
    .brand { display:flex; align-items:center; gap:20px; }
    h1 { font-size:46px; line-height:1.08; }
    h1 span { color:#ffb74d; }
    p { color:#9fb0bc; font-size:18px; line-height:1.55; }
    .pills { display:flex; flex-wrap:wrap; gap:9px; }
    .pill { color:#ffb74d; background:rgba(230,126,0,.12); border:1px solid rgba(230,126,0,.3); border-radius:999px; padding:6px 14px; font-size:13px; }
    .badge { position:absolute; left:251px; bottom:48px; color:#78909c; font-size:13px; }
  `)}
</style></head><body>
  <div class="safe">
    <div class="copy">
      <div class="brand">${logo(68)}<h1>Codex <span>Quota</span> Monitor</h1></div>
      <p>Track current-session and weekly Codex limits directly in the browser toolbar.</p>
      <div class="pills">
        <span class="pill">Current session</span><span class="pill">Weekly limits</span>
        <span class="pill">Credits</span><span class="pill">Background refresh</span>
        <span class="pill">10 languages</span><span class="pill">Free</span><span class="pill">Open source</span>
      </div>
    </div>
    ${popupHtml(en)}
  </div>
  <div class="badge">Available free on the Chrome Web Store</div>
</body></html>`;

renderPng({ html, width: 2048, height: 1152, out: path.join(STORE_ASSETS, 'yt-banner.png') });
