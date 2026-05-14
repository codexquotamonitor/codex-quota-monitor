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
    ts: Date.now()
  };
}

async function fetchUsage() {
  try {
    const res = await fetch(USAGE_URL, { credentials: 'include' });
    if (!res.ok) return;

    const data = await res.json();
    const codexUsage = normalizeUsage(data);
    if (!codexUsage) return;

    chrome.storage.local.set({ codexUsage });
  } catch {
    // Offline, logged out, or endpoint unavailable.
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

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'FETCH_NOW') fetchUsage();
});
