/**
 * Suite: Shared usage model
 * Tests the normalization and freshness helpers in usage.js directly.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadUsageModel() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'usage.js'), 'utf8');
  const context = { Date };
  context.globalThis = context;
  vm.runInNewContext(source, context);
  return context.CodexUsage;
}

module.exports = async function(describe) {
  const usageModel = loadUsageModel();

  await describe('Shared usage normalization', async (assert) => {
    const now = 1_000_000;
    const usage = usageModel.normalizeUsage({
      plan_type: 'plus',
      rate_limit: {
        allowed: true,
        limit_reached: false,
        primary_window: {
          used_percent: 9,
          limit_window_seconds: 18000,
          reset_after_seconds: 120
        },
        secondary_window: {
          used_percent: 1,
          limit_window_seconds: 604800,
          reset_after_seconds: 240
        }
      },
      credits: {
        balance: '0'
      }
    }, { now, source: 'test' });

    assert(usage.primaryWindow.remainingPercent === 91,
      'Primary window remaining percent is normalized');
    assert(usage.secondaryWindow.windowLabel === 'weekly_label',
      'Secondary window receives the weekly label');
    assert(usage.creditsBalance === 0,
      'Credits balance is normalized to a number');
    assert(usage.source === 'test',
      'Usage source is preserved');
  });

  await describe('Shared usage freshness', async (assert) => {
    const now = 10_000_000;
    const fresh = {
      usedPercent: 12,
      remainingPercent: 88,
      limitWindowSeconds: 18000,
      resetAt: now + 60_000,
      ts: now - 60_000
    };
    const oldSnapshot = {
      ...fresh,
      ts: now - usageModel.STALE_AFTER_MS - 1
    };
    const expiredWindow = {
      ...fresh,
      resetAt: now - 1
    };

    assert(!usageModel.isUsageStale(fresh, now),
      'Fresh usage is not marked stale');
    assert(usageModel.isUsageStale(oldSnapshot, now),
      'Old usage snapshot is marked stale');
    assert(usageModel.isUsageStale(expiredWindow, now),
      'Expired usage window is marked stale');
  });
};
