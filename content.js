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

function asPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function normalizePlan(plan) {
  return typeof plan === 'string' && plan.trim() ? plan.trim() : undefined;
}

function windowLabel(seconds) {
  if (seconds === 604800) return 'weekly_label';
  if (seconds === 18000) return 'session_label';
  return 'usage_label';
}

function normalizeWindow(w) {
  if (!w) return null;

  const usedPercent = asPercent(w.used_percent);
  if (usedPercent === undefined) return null;

  const limitWindowSeconds = Number(w.limit_window_seconds) || null;
  const resetAfterSeconds = Number(w.reset_after_seconds) || null;
  const resetAtSeconds = Number(w.reset_at) || null;
  const resetAt = resetAtSeconds
    ? resetAtSeconds * 1000
    : (resetAfterSeconds ? Date.now() + resetAfterSeconds * 1000 : null);

  return {
    usedPercent,
    remainingPercent: Math.max(0, 100 - usedPercent),
    limitWindowSeconds,
    resetAfterSeconds,
    resetAt,
    windowLabel: windowLabel(limitWindowSeconds)
  };
}

function normalizeUsage(data) {
  const primaryWindow = normalizeWindow(data?.rate_limit?.primary_window);
  if (!primaryWindow) return null;

  const secondaryWindow = normalizeWindow(data?.rate_limit?.secondary_window);
  const creditsBalance = data?.credits?.balance;

  return {
    primaryWindow,
    secondaryWindow,
    usedPercent: primaryWindow.usedPercent,
    remainingPercent: primaryWindow.remainingPercent,
    limitWindowSeconds: primaryWindow.limitWindowSeconds,
    resetAfterSeconds: primaryWindow.resetAfterSeconds,
    resetAt: primaryWindow.resetAt,
    windowLabel: primaryWindow.windowLabel,
    plan: normalizePlan(data?.plan_type),
    allowed: data?.rate_limit?.allowed !== false,
    limitReached: Boolean(data?.rate_limit?.limit_reached),
    hasCredits: Boolean(data?.credits?.has_credits),
    creditsUnlimited: Boolean(data?.credits?.unlimited),
    overageLimitReached: Boolean(data?.credits?.overage_limit_reached),
    creditsBalance: Number.isFinite(Number(creditsBalance)) ? Number(creditsBalance) : null,
    spendLimitReached: Boolean(data?.spend_control?.reached),
    source: 'content',
    ts: Date.now()
  };
}

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
    const codexUsage = normalizeUsage(data);
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
