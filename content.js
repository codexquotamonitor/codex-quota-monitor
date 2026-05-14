/**
 * Lightweight content helper for Codex pages.
 *
 * The service worker owns the authenticated fetch. This script simply asks for
 * a refresh when a Codex page is opened and after visible page updates.
 */

const REFRESH_DELAY_MS = 1500;
const POLL_MS = 5 * 60 * 1000;

let refreshTimer = null;

function requestRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    chrome.runtime.sendMessage({ type: 'FETCH_NOW' });
  }, REFRESH_DELAY_MS);
}

requestRefresh();
setInterval(requestRefresh, POLL_MS);

const startObserver = () => {
  if (!document.body) {
    setTimeout(startObserver, 100);
    return;
  }

  const observer = new MutationObserver(requestRefresh);
  observer.observe(document.body, { childList: true, subtree: true });
};

startObserver();
