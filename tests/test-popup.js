/**
 * Suite: Popup rendering
 * Tests popup states for Codex usage data.
 */

const { openPopup } = require('./helpers');

const FULL_DATA = {
  codexUsage: {
    primaryWindow: {
      usedPercent: 6,
      remainingPercent: 94,
      limitWindowSeconds: 18000,
      resetAt: Date.now() + 3_600_000,
      windowLabel: 'session_label'
    },
    secondaryWindow: {
      usedPercent: 1,
      remainingPercent: 99,
      limitWindowSeconds: 604800,
      resetAt: Date.now() + 597200 * 1000,
      windowLabel: 'weekly_label'
    },
    usedPercent: 47,
    remainingPercent: 53,
    limitWindowSeconds: 18000,
    resetAt: Date.now() + 3_600_000,
    windowLabel: 'session_label',
    plan: 'go',
    allowed: true,
    limitReached: false,
    creditsBalance: 0,
    ts: Date.now()
  }
};

const WARN_DATA = {
  codexUsage: {
    usedPercent: 75,
    remainingPercent: 25,
    limitWindowSeconds: 604800,
    resetAt: Date.now() + 3_600_000,
    plan: 'go',
    ts: Date.now()
  }
};

const CRIT_DATA = {
  codexUsage: {
    usedPercent: 92,
    remainingPercent: 8,
    limitWindowSeconds: 604800,
    resetAt: Date.now() + 3_600_000,
    plan: 'go',
    ts: Date.now()
  }
};

const BLOCKED_DATA = {
  codexUsage: {
    usedPercent: 100,
    remainingPercent: 0,
    limitWindowSeconds: 604800,
    resetAt: Date.now() + 3_600_000,
    plan: 'go',
    allowed: false,
    limitReached: true,
    ts: Date.now()
  }
};

module.exports = async function(describe) {

  await describe('Empty state (no data)', async (assert) => {
    const { browser, page } = await openPopup({});
    try {
      const emptyVisible = await page.$eval('#empty-section',
        el => !el.classList.contains('hidden'));
      assert(emptyVisible, 'Empty section is visible');

      const dataHidden = await page.$eval('#data-section',
        el => el.classList.contains('hidden'));
      assert(dataHidden, 'Data section is hidden');
    } finally { await browser.close(); }
  });

  await describe('Full data (weekly usage + remaining)', async (assert) => {
    const { browser, page } = await openPopup(FULL_DATA);
    try {
      const dataVisible = await page.$eval('#data-section',
        el => !el.classList.contains('hidden'));
      assert(dataVisible, 'Data section is visible');

      const pct = await page.$eval('#pct-text', el => el.textContent);
      assert(pct === '6% used', `Usage pct shows 6% used (got "${pct}")`);

      const plan = await page.$eval('#plan', el => el.textContent);
      assert(plan === 'Go', `Plan badge shows "Go" (got "${plan}")`);

      const weeklyVisible = await page.$eval('#weekly-row',
        el => !el.classList.contains('hidden'));
      assert(weeklyVisible, 'Details row is visible');

      const remainingPct = await page.$eval('#weekly-pct-text', el => el.textContent);
      assert(remainingPct === '94%', `Remaining pct shows 94% (got "${remainingPct}")`);

      const secondaryVisible = await page.$eval('#secondary-category',
        el => !el.classList.contains('hidden'));
      assert(secondaryVisible, 'Secondary window is visible');

      const secondaryPct = await page.$eval('#secondary-pct-text', el => el.textContent);
      assert(secondaryPct === '99%', `Secondary remaining pct shows 99% (got "${secondaryPct}")`);

      const creditsVisible = await page.$eval('#credits-category',
        el => !el.classList.contains('hidden'));
      assert(creditsVisible, 'Credits row is visible');
    } finally { await browser.close(); }
  });

  await describe('Progress bar color — warn (75%)', async (assert) => {
    const { browser, page } = await openPopup(WARN_DATA);
    try {
      const hasWarn = await page.$eval('#bar',
        el => el.classList.contains('warn'));
      assert(hasWarn, 'Bar has "warn" class at 75%');

      const hasCrit = await page.$eval('#bar',
        el => el.classList.contains('crit'));
      assert(!hasCrit, 'Bar does NOT have "crit" class at 75%');
    } finally { await browser.close(); }
  });

  await describe('Progress bar color — crit (92%)', async (assert) => {
    const { browser, page } = await openPopup(CRIT_DATA);
    try {
      const hasCrit = await page.$eval('#bar',
        el => el.classList.contains('crit'));
      assert(hasCrit, 'Bar has "crit" class at 92%');
    } finally { await browser.close(); }
  });

  await describe('Limit reached state', async (assert) => {
    const { browser, page } = await openPopup(BLOCKED_DATA);
    try {
      const visible = await page.$eval('#limit-state',
        el => !el.classList.contains('hidden'));
      assert(visible, 'Limit reached banner is visible');
    } finally { await browser.close(); }
  });

  await describe('i18n strings', async (assert) => {
    const { browser, page } = await openPopup(FULL_DATA);
    try {
      const weeklyLabel = await page.$eval('#usage-label', el => el.textContent);
      assert(weeklyLabel === '5-hour limit',
        `window label translated (got "${weeklyLabel}")`);

      const detailsLabel = await page.$eval(
        '[data-i18n="details_label"]', el => el.textContent);
      assert(detailsLabel === 'Limit details',
        `details_label translated (got "${detailsLabel}")`);

      const remainingLabel = await page.$eval(
        '[data-i18n="remaining"]', el => el.textContent);
      assert(remainingLabel === 'remaining',
        `remaining translated (got "${remainingLabel}")`);
    } finally { await browser.close(); }
  });

};
