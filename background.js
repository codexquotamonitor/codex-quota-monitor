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
const ACCESS_TOKEN_EXP_KEY = 'codexAccessTokenExpiresAt';
const ACCESS_TOKEN_REFRESH_SKEW_MS = 2 * 60 * 1000;
const AUTH_SESSION_URLS = [
  'https://chatgpt.com/api/auth/session',
  'https://chatgpt.com/backend-api/auth/session'
];

let cachedAccessToken = null;
let cachedAccessTokenExpiresAt = 0;

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

function decodeAccessTokenExpiresAt(token) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return 0;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const data = JSON.parse(atob(padded));
    return Number(data?.exp) ? Number(data.exp) * 1000 : 0;
  } catch {
    return 0;
  }
}

function isTokenUsable(token, expiresAt = 0) {
  if (!token) return false;
  return !expiresAt || expiresAt - Date.now() > ACCESS_TOKEN_REFRESH_SKEW_MS;
}

function cacheAccessToken(token) {
  if (!token) return;
  cachedAccessToken = token;
  cachedAccessTokenExpiresAt = decodeAccessTokenExpiresAt(token);
  chrome.storage.session?.set?.({
    [ACCESS_TOKEN_KEY]: token,
    [ACCESS_TOKEN_EXP_KEY]: cachedAccessTokenExpiresAt
  });
}

function clearAccessToken() {
  cachedAccessToken = null;
  cachedAccessTokenExpiresAt = 0;
  chrome.storage.session?.remove?.([ACCESS_TOKEN_KEY, ACCESS_TOKEN_EXP_KEY]);
}

function extractAccessToken(data) {
  return data?.accessToken ||
    data?.access_token ||
    data?.session?.accessToken ||
    data?.session?.access_token ||
    data?.token ||
    null;
}

async function refreshAccessTokenFromSession() {
  for (const url of AUTH_SESSION_URLS) {
    try {
      const res = await fetch(url, {
        credentials: 'include',
        headers: { accept: 'application/json' }
      });
      if (!res.ok) continue;

      const data = await res.json();
      const token = extractAccessToken(data);
      if (token) {
        cacheAccessToken(token);
        return token;
      }
    } catch {
      // Try the next known session endpoint.
    }
  }

  return null;
}

async function getAccessToken({ allowRefresh = true } = {}) {
  if (isTokenUsable(cachedAccessToken, cachedAccessTokenExpiresAt)) return cachedAccessToken;

  try {
    const data = await chrome.storage.session?.get?.([ACCESS_TOKEN_KEY, ACCESS_TOKEN_EXP_KEY]);
    cachedAccessToken = data?.[ACCESS_TOKEN_KEY] || null;
    cachedAccessTokenExpiresAt = Number(data?.[ACCESS_TOKEN_EXP_KEY]) || decodeAccessTokenExpiresAt(cachedAccessToken || '');
    if (isTokenUsable(cachedAccessToken, cachedAccessTokenExpiresAt)) return cachedAccessToken;
  } catch {
    // Fall through to web session refresh.
  }

  clearAccessToken();
  return allowRefresh ? refreshAccessTokenFromSession() : null;
}

function buildUsageHeaders(accessToken) {
  const headers = {
    accept: 'application/json',
    'oai-language': chrome.i18n.getUILanguage?.() || 'en-US'
  };
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;
  return headers;
}

async function fetchUsage(options = {}) {
  const quiet = Boolean(options.quiet);
  try {
    const accessToken = await getAccessToken();
    let currentAccessToken = accessToken;
    let res = await fetch(USAGE_URL, {
      credentials: 'include',
      headers: buildUsageHeaders(currentAccessToken)
    });

    if ((res.status === 401 || res.status === 403) && currentAccessToken) {
      clearAccessToken();
      currentAccessToken = await getAccessToken();
      if (currentAccessToken) {
        res = await fetch(USAGE_URL, {
          credentials: 'include',
          headers: buildUsageHeaders(currentAccessToken)
        });
      }
    }

    if (!res.ok) {
      const source = currentAccessToken ? 'background-token' : 'background-cookie';
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
  if (alarm.name === ALARM) fetchUsage({ quiet: true });
});

function restoreAndRefresh() {
  chrome.storage.local.get('codexUsage', ({ codexUsage }) => {
    updateBadge(codexUsage);
    fetchUsage({ quiet: true });
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
    color: pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#22c55e'
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
