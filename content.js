/**
 * Content helper for Codex pages.
 *
 * Tries to read the usage endpoint from the page context, where ChatGPT
 * authentication cookies are naturally available. The service worker also
 * attempts the same fetch as a fallback.
 */

const USAGE_PATH = '/backend-api/wham/usage';
const REFRESH_DELAY_MS = 1500;
const POLL_MS = 5 * 60 * 1000;

let refreshTimer = null;
let inFlight = false;
const { normalizeUsage } = CodexUsage;

function getAccessToken() {
  try {
    const el = document.getElementById('client-bootstrap');
    if (!el?.textContent) return null;
    const bootstrap = JSON.parse(el.textContent);
    return bootstrap?.session?.accessToken || null;
  } catch {
    return null;
  }
}

async function fetchAndStoreUsage() {
  if (inFlight) return { ok: false, status: 'busy', source: 'content' };
  inFlight = true;

  try {
    const accessToken = getAccessToken();
    if (accessToken) {
      chrome.runtime.sendMessage({ type: 'CACHE_ACCESS_TOKEN', accessToken });
    }

    const headers = {
      accept: 'application/json',
      'oai-language': navigator.language || 'en-US'
    };
    if (accessToken) headers.authorization = `Bearer ${accessToken}`;

    const res = await fetch(USAGE_PATH, {
      credentials: 'include',
      headers
    });

    if (!res.ok) {
      chrome.storage.local.set({
        codexUsageError: {
          status: res.status,
          source: accessToken ? 'content-token' : 'content-cookie',
          ts: Date.now()
        }
      });
      chrome.runtime.sendMessage({ type: 'FETCH_NOW' });
      return { ok: false, status: res.status, source: accessToken ? 'content-token' : 'content-cookie' };
    }

    const data = await res.json();
    const codexUsage = normalizeUsage(data, { source: 'content' });
    if (!codexUsage) {
      chrome.storage.local.set({
        codexUsageError: {
          status: 'invalid-response',
          source: 'content',
          ts: Date.now()
        }
      });
      return { ok: false, status: 'invalid-response', source: 'content' };
    }

    chrome.storage.local.set({ codexUsage, codexUsageError: null });
    return { ok: true, source: 'content' };
  } catch {
    chrome.storage.local.set({
      codexUsageError: {
        status: 'exception',
        source: 'content',
        ts: Date.now()
      }
    });
    chrome.runtime.sendMessage({ type: 'FETCH_NOW' });
    return { ok: false, status: 'exception', source: 'content' };
  } finally {
    inFlight = false;
  }
}

function requestRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(fetchAndStoreUsage, REFRESH_DELAY_MS);
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

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== 'CAPTURE_USAGE_NOW') return false;

  fetchAndStoreUsage().then(sendResponse);
  return true;
});
