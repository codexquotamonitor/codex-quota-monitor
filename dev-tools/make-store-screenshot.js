const path = require('path');
const { STORE_ASSETS, brandBackground, ensureDirs, loadLocale, popupHtml, popupStyles, renderPng } = require('./render-helpers');

ensureDirs();
const pt = loadLocale('pt_BR');

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  ${brandBackground(`
    body { width:640px; height:400px; display:flex; align-items:center; justify-content:center; }
    ${popupStyles(true)}
    .scene { position:relative; z-index:1; display:flex; flex-direction:column; align-items:center; gap:14px; }
    .popup { transform:scale(.76); transform-origin:center; margin:-44px 0; }
    .caption { color:#9fb0bc; font-size:12px; }
  `)}
</style></head><body>
  <div class="scene">
    ${popupHtml(pt)}
    <div class="caption">Monitore os limites do Codex direto na barra do navegador</div>
  </div>
</body></html>`;

renderPng({ html, width: 640, height: 400, deviceScaleFactor: 2, out: path.join(STORE_ASSETS, 'store-screenshot.png') });
