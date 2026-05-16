const path = require('path');
const { STORE_ASSETS, brandBackground, ensureDirs, loadLocale, logo, popupHtml, popupStyles, renderPng } = require('./render-helpers');

ensureDirs();
const en = loadLocale('en');

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  ${brandBackground(`
    body { width:1500px; height:500px; }
    ${popupStyles(true)}
    .layout { position:relative; z-index:1; height:100%; display:flex; align-items:center; justify-content:space-between; gap:60px; padding:0 120px; }
    .copy { max-width:610px; display:flex; flex-direction:column; gap:18px; }
    .brand { display:flex; align-items:center; gap:16px; }
    h1 { font-size:38px; line-height:1.08; }
    h1 span { color:#ffb74d; }
    p { color:#9fb0bc; font-size:17px; line-height:1.5; }
    .pills { display:flex; flex-wrap:wrap; gap:8px; }
    .pill { color:#ffb74d; background:rgba(230,126,0,.12); border:1px solid rgba(230,126,0,.3); border-radius:999px; padding:5px 12px; font-size:12px; }
  `)}
</style></head><body>
  <div class="layout">
    <div class="copy">
      <div class="brand">${logo(56)}<h1>Codex <span>Quota</span> Monitor</h1></div>
      <p>See Codex limits at a glance without leaving the tab you are working in.</p>
      <div class="pills">
        <span class="pill">Current session</span><span class="pill">Weekly limits</span>
        <span class="pill">Background refresh</span><span class="pill">10 languages</span>
        <span class="pill">Chrome · Brave · Edge · Arc</span><span class="pill">Open source</span>
      </div>
    </div>
    ${popupHtml(en)}
  </div>
</body></html>`;

renderPng({ html, width: 1500, height: 500, out: path.join(STORE_ASSETS, 'x-banner.png') });
