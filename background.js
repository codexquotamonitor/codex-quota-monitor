/**
 * Service worker for Codex Usage Monitor.
 *
 * Reads Codex usage from ChatGPT's authenticated web endpoint and stores only
 * quota metadata locally. Personal identifiers returned by the endpoint are
 * intentionally ignored.
 */

const ALARM = 'codex-usage-poll';
const POLL_MINUTES = 10;
const USAGE_URL = 'https://chatgpt.com/backend-api/wham/usage';
const CODEX_USAGE_URL = 'https://chatgpt.com/codex/cloud/settings/analytics';
const ACCESS_TOKEN_KEY = 'codexAccessToken';

let cachedAccessToken = null;

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
    ts: Date.now()
  };
}

function storeUsageError(status, source, quiet = false) {
  if (quiet) return;
  chrome.storage.local.set({
    codexUsageError: {
      status,
      source,
      ts: Date.now()
    }
  });
}

function cacheAccessToken(token) {
  if (!token) return;
  cachedAccessToken = token;
  chrome.storage.session?.set?.({ [ACCESS_TOKEN_KEY]: token });
}

async function getAccessToken() {
  if (cachedAccessToken) return cachedAccessToken;

  try {
    const data = await chrome.storage.session?.get?.(ACCESS_TOKEN_KEY);
    cachedAccessToken = data?.[ACCESS_TOKEN_KEY] || null;
    return cachedAccessToken;
  } catch {
    return null;
  }
}

async function fetchUsage(options = {}) {
  const quiet = Boolean(options.quiet);
  try {
    const accessToken = await getAccessToken();
    const headers = {
      accept: 'application/json',
      'oai-language': chrome.i18n.getUILanguage?.() || 'en-US'
    };
    if (accessToken) headers.authorization = `Bearer ${accessToken}`;

    const res = await fetch(USAGE_URL, { credentials: 'include', headers });
    if (!res.ok) {
      const source = accessToken ? 'background-token' : 'background-cookie';
      storeUsageError(res.status, source, quiet);
      return { ok: false, status: res.status, source };
    }

    const data = await res.json();
    const codexUsage = normalizeUsage(data);
    if (!codexUsage) {
      storeUsageError('invalid-response', 'background', quiet);
      return { ok: false, status: 'invalid-response', source: 'background' };
    }

    chrome.storage.local.set({ codexUsage, codexUsageError: null });
    return { ok: true, source: 'background' };
  } catch {
    storeUsageError('exception', 'background', quiet);
    return { ok: false, status: 'exception', source: 'background' };
  }
}

chrome.alarms.create(ALARM, { periodInMinutes: POLL_MINUTES });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) fetchUsage();
});

function restoreAndRefresh() {
  chrome.storage.local.get('codexUsage', ({ codexUsage }) => {
    updateBadge(codexUsage);
    fetchUsage();
  });
}

chrome.runtime.onStartup.addListener(restoreAndRefresh);
chrome.runtime.onInstalled.addListener((details) => {
  restoreAndRefresh();
  if (details.reason === 'install') {
    chrome.tabs.create({ url: CODEX_USAGE_URL });
  }
});

function buildTitle(u) {
  if (!u || u.usedPercent === undefined) return 'Codex Usage Monitor';
  const label = chrome.i18n.getMessage(u.windowLabel || 'usage_label') || 'Usage';
  const remaining = chrome.i18n.getMessage('remaining') || 'remaining';
  return `${label}: ${u.usedPercent}% · ${remaining}: ${u.remainingPercent}%`;
}

function updateBadge(u) {
  if (!u || u.usedPercent === undefined) {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'Codex Usage Monitor' });
    return;
  }

  const pct = u.usedPercent;
  chrome.action.setBadgeText({ text: `${pct}%` });
  chrome.action.setBadgeBackgroundColor({
    color: pct >= 90 ? '#e53e3e' : pct >= 70 ? '#dd6b20' : '#2f855a'
  });
  chrome.action.setTitle({ title: buildTitle(u) });
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.codexUsage) updateBadge(changes.codexUsage.newValue);
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'CACHE_ACCESS_TOKEN') {
    cacheAccessToken(msg.accessToken);
    sendResponse({ ok: true });
    return false;
  }

  if (msg?.type !== 'FETCH_NOW') return false;

  fetchUsage({ quiet: msg.quiet }).then(sendResponse);
  return true;
});
