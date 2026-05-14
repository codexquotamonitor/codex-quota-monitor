/**
 * Helpers compartilhados entre os suites de teste.
 * Sobe um Puppeteer com popup.html + mocks das APIs do Chrome.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Lê os arquivos da extensão
const popupHtml = fs.readFileSync(
  path.join(__dirname, '..', 'popup.html'), 'utf8'
);
const popupCss = fs.readFileSync(
  path.join(__dirname, '..', 'popup.css'), 'utf8'
);
const popupJs = fs.readFileSync(
  path.join(__dirname, '..', 'popup.js'), 'utf8'
);

// Carrega as strings de i18n do locale EN
const enMessages = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', '_locales', 'en', 'messages.json'), 'utf8'
));

/**
 * Monta o HTML completo com CSS e JS inline + mock das APIs do Chrome.
 * Injeta `storageData` no mock do chrome.storage.local.
 */
function buildPage(storageData = {}) {
  // Mock do chrome.i18n e chrome.storage
  const chromeMock = `
    window.chrome = {
      i18n: {
        getMessage: (key) => {
          const msgs = ${JSON.stringify(enMessages)};
          return msgs[key]?.message ?? key;
        },
        getUILanguage: () => 'en'
      },
      storage: {
        local: {
          _data: ${JSON.stringify(storageData)},
          get(keys, cb) {
            if (typeof keys === 'string') keys = [keys];
            const result = {};
            keys.forEach(k => { if (this._data[k] !== undefined) result[k] = this._data[k]; });
            if (cb) cb(result); else return Promise.resolve(result);
          },
          set(data, cb) { Object.assign(this._data, data); if (cb) cb(); },
          remove(keys, cb) {
            (Array.isArray(keys) ? keys : [keys]).forEach(k => delete this._data[k]);
            if (cb) cb();
          }
        },
        onChanged: { addListener: () => {} }
      },
      runtime: {
        sendMessage: () => {},
        onMessage: { addListener: () => {} }
      },
      tabs: { create: () => {} }
    };
  `;

  // Inline o CSS e injeta o mock antes do popup.js
  return popupHtml
    .replace('<link rel="stylesheet" href="popup.css"/>', `<style>${popupCss}</style>`)
    .replace('<script src="popup.js"></script>',
      `<script>${chromeMock}</script><script>${popupJs}</script>`);
}

/**
 * Abre uma página Puppeteer com o popup renderizado.
 * Retorna { browser, page } — chamar browser.close() ao terminar.
 */
async function openPopup(storageData = {}) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu',
           '--disable-dev-shm-usage', '--headless=new']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 280, height: 600 });
  await page.setContent(buildPage(storageData), { waitUntil: 'networkidle0' });
  return { browser, page };
}

module.exports = { openPopup };
