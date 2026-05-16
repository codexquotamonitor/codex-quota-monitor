const path = require('path');
const { STORE_ASSETS, brandBackground, ensureDirs, logo, renderPng } = require('./render-helpers');

ensureDirs();

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  ${brandBackground(`
    body { width:440px; height:280px; }
    .wrap { position:relative; z-index:1; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; padding:28px; text-align:center; }
    .brand { display:flex; align-items:center; gap:12px; }
    h1 { font-size:22px; line-height:1.1; }
    h1 span { color:#ffb74d; }
    p { max-width:330px; color:#9fb0bc; font-size:13px; line-height:1.5; }
    .pills { display:flex; flex-wrap:wrap; justify-content:center; gap:6px; }
    .pill { color:#ffb74d; background:rgba(230,126,0,.12); border:1px solid rgba(230,126,0,.32); border-radius:999px; padding:4px 10px; font-size:11px; }
  `)}
</style></head><body>
  <div class="wrap">
    <div class="brand">${logo(46)}<h1>Codex <span>Quota</span> Monitor</h1></div>
    <p>Track your Codex usage limits directly in the browser toolbar.</p>
    <div class="pills">
      <span class="pill">Current session</span><span class="pill">Weekly limits</span>
      <span class="pill">Credits</span><span class="pill">10 languages</span><span class="pill">Free</span>
    </div>
  </div>
</body></html>`;

renderPng({ html, width: 440, height: 280, out: path.join(STORE_ASSETS, 'small-promo.png') });
