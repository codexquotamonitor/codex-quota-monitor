function t(key) {
  return chrome.i18n.getMessage(key) || key;
}

document.documentElement.lang = chrome.i18n.getUILanguage?.() || 'pt-BR';
document.title = t('ext_name');

document.querySelectorAll('[data-i18n]').forEach((el) => {
  el.textContent = t(el.dataset.i18n);
});

document.querySelectorAll('[data-i18n-html]').forEach((el) => {
  el.innerHTML = t(el.dataset.i18nHtml);
});
