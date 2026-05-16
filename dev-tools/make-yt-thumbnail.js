const path = require('path');
const { STORE_ASSETS, brandBackground, ensureDirs, loadLocale, logo, popupHtml, popupStyles, renderPng } = require('./render-helpers');

ensureDirs();
const en = loadLocale('en');

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  ${brandBackground(`
    body { width:1280px; height:720px; }
    ${popupStyles(true)}
    .layout { position:relative; z-index:1; height:100%; display:flex; align-items:center; justify-content:space-between; gap:52px; padding:0 80px; }
    .copy { display:flex; flex-direction:column; gap:20px; }
    .eyebrow { display:flex; align-items:center; gap:10px; color:#ffb74d; font-size:15px; font-weight:600; }
    h1 { font-size:62px; line-height:1.05; letter-spacing:-1px; max-width:620px; }
    h1 span { color:#ffb74d; }
    p { color:#9fb0bc; font-size:18px; line-height:1.45; }
    .pill { width:max-content; color:#ffb74d; background:rgba(230,126,0,.12); border:1px solid rgba(230,126,0,.3); border-radius:999px; padding:8px 18px; font-size:14px; font-weight:600; }
  `)}
</style></head><body>
  <div class="layout">
    <div class="copy">
      <div class="eyebrow">${logo(44)} Codex Quota Monitor</div>
      <h1>Keep an eye on your <span>Codex quota.</span></h1>
      <p>Current session, weekly limits and credits in the browser toolbar.</p>
      <div class="pill">Free Chrome Extension</div>
    </div>
    ${popupHtml(en)}
  </div>
</body></html>`;

renderPng({ html, width: 1280, height: 720, deviceScaleFactor: 2, out: path.join(STORE_ASSETS, 'yt-thumbnail.png') });
