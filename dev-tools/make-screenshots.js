const path = require('path');
const { SCREENSHOTS, brandBackground, ensureDirs, loadLocale, popupHtml, popupStyles, renderPng } = require('./render-helpers');

const LOCALES = {
  ar: true,
  bn: false,
  en: false,
  es: false,
  fr: false,
  hi: false,
  id: false,
  pt_BR: false,
  ru: false,
  zh_CN: false,
};

ensureDirs();

function buildHtml(strings, rtl, dark) {
  return `<!doctype html>
  <html dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><style>
    ${brandBackground(`
      body { width:640px; height:400px; display:flex; align-items:center; justify-content:center; }
      ${popupStyles(dark)}
      .popup { transform:scale(.76); transform-origin:center; }
      ${dark ? '' : `
        body {
          background:
            radial-gradient(circle at 16% 14%, rgba(230,126,0,.18), transparent 28%),
            radial-gradient(circle at 84% 82%, rgba(2,132,199,.12), transparent 26%),
            #f7faf9;
        }
        body::before { background-image: radial-gradient(circle, rgba(31,41,55,.12) 1px, transparent 1px); }
      `}
    `)}
  </style></head><body>${popupHtml(strings, { rtl, dark })}</body></html>`;
}

(async () => {
  for (const [locale, rtl] of Object.entries(LOCALES)) {
    const strings = loadLocale(locale);
    for (const [theme, dark] of [['dark', true], ['light', false]]) {
      await renderPng({
        html: buildHtml(strings, rtl, dark),
        width: 640,
        height: 400,
        deviceScaleFactor: 2,
        out: path.join(SCREENSHOTS, `store-${locale}-${theme}.png`),
      });
    }
  }
})();
