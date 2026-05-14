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

function normalizeUsage(data) {
  const primary = data?.rate_limit?.primary_window;
  if (!primary) return null;

  const usedPercent = asPercent(primary.used_percent);
  if (usedPercent === undefined) return null;

  const limitWindowSeconds = Number(primary.limit_window_seconds) || null;
  const resetAfterSeconds = Number(primary.reset_after_seconds) || null;
  const resetAtSeconds = Number(primary.reset_at) || null;
  const resetAt = resetAtSeconds
    ? resetAtSeconds * 1000
    : (resetAfterSeconds ? Date.now() + resetAfterSeconds * 1000 : null);

  return {
    usedPercent,
    remainingPercent: Math.max(0, 100 - usedPercent),
    limitWindowSeconds,
    resetAfterSeconds,
    resetAt,
    windowLabel: windowLabel(limitWindowSeconds),
    plan: normalizePlan(data?.plan_type),
    allowed: data?.rate_limit?.allowed !== false,
    limitReached: Boolean(data?.rate_limit?.limit_reached),
    hasCredits: Boolean(data?.credits?.has_credits),
    creditsUnlimited: Boolean(data?.credits?.unlimited),
    overageLimitReached: Boolean(data?.credits?.overage_limit_reached),
    spendLimitReached: Boolean(data?.spend_control?.reached),
    source: 'content',
    ts: Date.now()
  };
}

async function fetchAndStoreUsage() {
  if (inFlight) return;
  inFlight = true;

  try {
    const res = await fetch(USAGE_PATH, {
      credentials: 'include',
      headers: { accept: 'application/json' }
    });

    if (!res.ok) {
      chrome.runtime.sendMessage({ type: 'FETCH_NOW' });
      return;
    }

    const data = await res.json();
    const codexUsage = normalizeUsage(data);
    if (codexUsage) chrome.storage.local.set({ codexUsage });
  } catch {
    chrome.runtime.sendMessage({ type: 'FETCH_NOW' });
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
