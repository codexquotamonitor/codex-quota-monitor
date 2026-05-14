/**
 * Minimal test runner — sem dependências externas.
 * Uso: node tests/runner.js
 */

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓  ${message}`);
  } else {
    failed++;
    failures.push(message);
    console.log(`  ✗  ${message}`);
  }
}

async function describe(suiteName, fn) {
  console.log(`\n▸ ${suiteName}`);
  await fn(assert);
}

async function run(suites) {
  console.log('\n═══════════════════════════════════════');
  console.log('  Codex Usage Monitor — Test Suite');
  console.log('═══════════════════════════════════════');

  for (const suite of suites) await suite(describe);

  console.log('\n───────────────────────────────────────');
  console.log(`  ${passed} passed  |  ${failed} failed`);
  console.log('───────────────────────────────────────\n');

  if (failures.length) {
    console.log('Failed tests:');
    failures.forEach(f => console.log(`  ✗  ${f}`));
    console.log();
    process.exit(1);
  }
}

module.exports = { run };
