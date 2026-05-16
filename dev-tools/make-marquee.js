const path = require('path');
const { STORE_ASSETS, brandBackground, ensureDirs, loadLocale, logo, popupHtml, popupStyles, renderPng } = require('./render-helpers');

ensureDirs();
const en = loadLocale('en');

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  ${brandBackground(`
    body { width:1400px; height:560px; }
    ${popupStyles(true)}
    .layout { position:relative; z-index:1; height:100%; display:flex; align-items:center; justify-content:space-between; gap:60px; padding:0 108px; }
    .copy { max-width:560px; display:flex; flex-direction:column; gap:20px; }
    .brand { display:flex; align-items:center; gap:16px; }
    h1 { font-size:40px; line-height:1.08; }
    h1 span { color:#ffb74d; }
    p { color:#9fb0bc; font-size:17px; line-height:1.55; }
    .pills { display:flex; flex-wrap:wrap; gap:8px; }
    .pill { color:#ffb74d; background:rgba(230,126,0,.12); border:1px solid rgba(230,126,0,.3); border-radius:999px; padding:5px 13px; font-size:12px; }
    .badge { position:absolute; left:108px; bottom:28px; color:#78909c; font-size:12px; }
  `)}
</style></head><body>
  <div class="layout">
    <div class="copy">
      <div class="brand">${logo(60)}<h1>Codex <span>Quota</span> Monitor</h1></div>
      <p>Track current-session and weekly Codex limits directly from the browser toolbar.</p>
      <div class="pills">
        <span class="pill">Current session (5h)</span><span class="pill">Weekly limits</span>
        <span class="pill">Credits</span><span class="pill">Background refresh</span>
        <span class="pill">10 languages</span><span class="pill">Free</span>
      </div>
    </div>
    ${popupHtml(en)}
  </div>
  <div class="badge">Available free on the Chrome Web Store</div>
</body></html>`;

renderPng({ html, width: 1400, height: 560, out: path.join(STORE_ASSETS, 'marquee.png') });
