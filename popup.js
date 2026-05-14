/* ── Theme ── */
function applyTheme(theme) {
  const btn = document.getElementById('theme-btn');
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    if (btn) btn.title = chrome.i18n.getMessage('theme_to_dark') || 'Switch to dark mode';
  } else {
    document.documentElement.removeAttribute('data-theme');
    if (btn) btn.title = chrome.i18n.getMessage('theme_to_light') || 'Switch to light mode';
  }
}

chrome.storage.local.get('theme', ({ theme }) => {
  if (theme) {
    applyTheme(theme);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }
});

document.getElementById('theme-btn').addEventListener('click', () => {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const next = isLight ? 'dark' : 'light';
  applyTheme(next);
  chrome.storage.local.set({ theme: next });
});

/* ── i18n helper ── */
const t = (key) => chrome.i18n.getMessage(key) || key;
const tm = (key, substitutions) => chrome.i18n.getMessage(key, substitutions) || key;

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });

  const hint = document.getElementById('no-data-hint');
  if (hint) hint.innerHTML = t('no_data_hint').replace(
    'Codex',
    '<a id="open-codex" href="#">Codex</a>'
  );
}

/* ── Time formatting ── */
function fmtReset(isoOrMs) {
  if (!isoOrMs) return '—';
  const ts = typeof isoOrMs === 'number'
    ? (isoOrMs > 1e12 ? isoOrMs : isoOrMs * 1000)
    : Date.parse(isoOrMs);
  if (!ts || isNaN(ts)) return String(isoOrMs);
  const diff = ts - Date.now();
  if (diff <= 0) return t('now');
  const totalMin = Math.floor(diff / 60_000);
  const d = Math.floor(totalMin / 1_440);
  const h = Math.floor((totalMin % 1_440) / 60);
  const m = totalMin % 60;
  const D = t('time_days'), H = t('time_hours'), M = t('time_mins');
  if (d > 0) return `${d}${D} ${h}${H} ${m}${M}`;
  if (h > 0) return `${h}${H} ${m}${M}`;
  return `${m}${M}`;
}

function fmtAgo(ts) {
  if (!ts) return '';
  const prefix = t('updated_ago');
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return `${prefix} ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${prefix} ${m}min`;
  const h = Math.floor(m / 60);
  return `${prefix} ${h}h ${m % 60}min`;
}

function titleCasePlan(plan) {
  if (!plan) return '—';
  return String(plan).charAt(0).toUpperCase() + String(plan).slice(1).toLowerCase();
}

function windowLabelKey(seconds) {
  if (seconds === 604800) return 'weekly_label';
  if (seconds === 18000) return 'session_label';
  return 'usage_label';
}

let lastTs = null;
let lastError = null;

function tickLastUpdate() {
  document.getElementById('last-update').textContent = fmtAgo(lastTs);
}

setInterval(tickLastUpdate, 1000);

function setBar(barEl, pct, invert = false) {
  const value = Math.min(100, Math.max(0, pct));
  barEl.style.width = `${value}%`;
  const isSmall = barEl.classList.contains('bar--sm');
  const riskPct = invert ? 100 - value : value;
  barEl.className = 'bar' + (isSmall ? ' bar--sm' : '') +
    (riskPct >= 90 ? ' crit' : riskPct >= 70 ? ' warn' : '');
}

function currentWindow(u) {
  if (u?.primaryWindow) return u.primaryWindow;
  if (u?.usedPercent === undefined) return null;
  return {
    usedPercent: u.usedPercent,
    remainingPercent: u.remainingPercent,
    limitWindowSeconds: u.limitWindowSeconds,
    resetAt: u.resetAt,
    windowLabel: u.windowLabel || windowLabelKey(u.limitWindowSeconds)
  };
}

function renderWindow(row, w) {
  const used = Math.min(100, Math.max(0, w.usedPercent));
  const remaining = w.remainingPercent !== undefined
    ? Math.min(100, Math.max(0, w.remainingPercent))
    : Math.max(0, 100 - used);
  setBar(row.bar, remaining, true);
  row.pct.textContent = `${remaining}%`;
  row.reset.textContent = `${t('resets_in')} ${fmtReset(w.resetAt)}`;
}

function renderError(error) {
  lastError = error ?? null;
  const el = document.getElementById('capture-error');
  if (!el) return;

  el.classList.toggle('hidden', !lastError);
  if (!lastError) {
    el.textContent = '';
    return;
  }

  const status = String(lastError.status ?? 'unknown');
  const source = String(lastError.source ?? 'unknown');
  el.textContent = tm('capture_error', [status, source]);
}

function render(u) {
  const primary = currentWindow(u);
  const hasData = Boolean(primary);
  document.getElementById('data-section').classList.toggle('hidden', !hasData);
  document.getElementById('empty-section').classList.toggle('hidden', hasData);
  if (hasData) renderError(null);
  if (!hasData) return;

  document.getElementById('plan').textContent = titleCasePlan(u.plan);

  const windowKey = primary.windowLabel || windowLabelKey(primary.limitWindowSeconds);
  document.getElementById('usage-label').textContent = t(windowKey);

  const used = Math.min(100, Math.max(0, primary.usedPercent));
  const remaining = primary.remainingPercent !== undefined
    ? Math.min(100, Math.max(0, primary.remainingPercent))
    : Math.max(0, 100 - used);

  setBar(document.getElementById('bar'), used);
  document.getElementById('pct-text').textContent = `${used}% ${t('used_suffix')}`;
  document.getElementById('reset-text').textContent = fmtReset(primary.resetAt);

  document.getElementById('weekly-row').classList.remove('hidden');
  setBar(document.getElementById('bar-weekly'), remaining, true);
  document.getElementById('weekly-pct-text').textContent = `${remaining}%`;
  document.getElementById('weekly-reset-text').textContent =
    `${t('resets_in')} ${fmtReset(primary.resetAt)}`;

  const secondary = u.secondaryWindow;
  const secondaryCat = document.getElementById('secondary-category');
  if (secondary?.usedPercent !== undefined) {
    secondaryCat.classList.remove('hidden');
    document.getElementById('secondary-label').textContent =
      t(secondary.windowLabel || windowLabelKey(secondary.limitWindowSeconds));
    renderWindow({
      bar: document.getElementById('bar-secondary'),
      pct: document.getElementById('secondary-pct-text'),
      reset: document.getElementById('secondary-reset-text')
    }, secondary);
  } else {
    secondaryCat.classList.add('hidden');
  }

  const creditsCat = document.getElementById('credits-category');
  const showCredits = u.creditsUnlimited ||
    (u.creditsBalance !== null && u.creditsBalance !== undefined) ||
    u.hasCredits;
  creditsCat.classList.toggle('hidden', !showCredits);
  if (showCredits) {
    document.getElementById('credits-text').textContent =
      u.creditsUnlimited ? t('unlimited') : String(u.creditsBalance ?? 0);
    document.getElementById('credits-note').textContent =
      u.overageLimitReached ? t('limit_reached') : '';
  }

  const state = document.getElementById('limit-state');
  const blocked = u.limitReached || u.overageLimitReached || u.spendLimitReached || u.allowed === false;
  state.classList.toggle('hidden', !blocked);
  if (blocked) state.textContent = t('limit_reached');

  lastTs = u.ts ?? null;
  tickLastUpdate();
}

/* ── Init ── */
applyI18n();
chrome.storage.local.get(['codexUsage', 'codexUsageError'], ({ codexUsage, codexUsageError }) => {
  render(codexUsage ?? null);
  if (!codexUsage) renderError(codexUsageError ?? null);

  if (!codexUsage?.usedPercent) {
    chrome.runtime.sendMessage({ type: 'FETCH_NOW' });

    const poll = setInterval(() => {
      chrome.storage.local.get(['codexUsage', 'codexUsageError'], ({ codexUsage: u, codexUsageError: err }) => {
        if (u?.usedPercent !== undefined) {
          render(u);
          clearInterval(poll);
        } else {
          renderError(err ?? null);
        }
      });
    }, 3000);
  }
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.codexUsage) render(changes.codexUsage.newValue ?? null);
  if (changes.codexUsageError && !changes.codexUsage?.newValue) {
    renderError(changes.codexUsageError.newValue ?? null);
  }
});

/* ── Buttons ── */
const CODEX_USAGE_URL = 'https://chatgpt.com/codex/cloud/settings/analytics';

document.getElementById('refresh-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: CODEX_USAGE_URL });
});

document.addEventListener('click', (e) => {
  if (e.target.id === 'open-codex') {
    e.preventDefault();
    chrome.tabs.create({ url: CODEX_USAGE_URL });
  }
});

document.getElementById('site-btn').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: CODEX_USAGE_URL });
});

const syncBtn = document.getElementById('sync-btn');
syncBtn.addEventListener('click', () => {
  syncBtn.classList.add('spinning');
  chrome.runtime.sendMessage({ type: 'FETCH_NOW' });
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.codexUsage) syncBtn.classList.remove('spinning');
});
