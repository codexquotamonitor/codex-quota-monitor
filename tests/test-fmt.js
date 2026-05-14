/**
 * Suite: Utility functions
 * Testa fmtReset diretamente — definida aqui como cópia fiel do popup.js.
 * Isso evita o eval frágil do módulo inteiro e mantém os testes determinísticos.
 */

// ── Cópia fiel de fmtReset de popup.js ──────────────────────────────────────
const t = (key) => ({ time_days: 'd', time_hours: 'h', time_mins: 'm', now: 'now' }[key] || key);

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
// ────────────────────────────────────────────────────────────────────────────

module.exports = async function(describe) {

  await describe('fmtReset — time formatting', async (assert) => {
    // Adiciona 5s de margem para compensar o drift de execução
    const future = (ms) => new Date(Date.now() + ms + 5_000).toISOString();
    const near   = (result, expected) => {
      // Converte "Xd Yh Zm" ou "Yh Zm" ou "Zm" em minutos totais — aceita ±1 min de drift
      const toMin = (s) => {
        const dM = s.match(/(\d+)d/); const hM = s.match(/(\d+)h/); const mM = s.match(/(\d+)m/);
        return (dM ? +dM[1] * 1_440 : 0) + (hM ? +hM[1] * 60 : 0) + (mM ? +mM[1] : 0);
      };
      return Math.abs(toMin(result) - toMin(expected)) <= 1;
    };

    const r1 = fmtReset(future(2 * 3_600_000 + 30 * 60_000));
    assert(near(r1, '2h 30m'), `2h30m ISO → "${r1}" (expected ~2h 30m)`);

    const r2 = fmtReset(future(45 * 60_000));
    assert(near(r2, '45m'), `45m → "${r2}" (expected ~45m)`);

    const r3 = fmtReset(new Date(Date.now() - 1000).toISOString());
    assert(r3 === 'now', `Past timestamp → "${r3}"`);

    const r4 = fmtReset(null);
    assert(r4 === '—', `null → "—"`);

    const r5 = fmtReset(Date.now() + 3_600_000 + 5_000);
    assert(near(r5, '1h 0m'), `Numeric ms → "${r5}" (expected ~1h 0m)`);

    const r6 = fmtReset(future(10 * 3_600_000 + 5 * 60_000));
    assert(near(r6, '10h 5m'), `10h05m → "${r6}" (expected ~10h 5m)`);

    const r7 = fmtReset(new Date(Date.now() + 30_000).toISOString());
    assert(r7 === '0m', `< 1 min → "${r7}"`);

    // Casos com dias (>= 24h)
    const r8 = fmtReset(future(161 * 3_600_000 + 36 * 60_000));
    assert(near(r8, '6d 17h 36m'), `161h36m → "${r8}" (expected ~6d 17h 36m)`);

    const r9 = fmtReset(future(24 * 3_600_000));
    assert(near(r9, '1d 0h 0m'), `exactly 24h → "${r9}" (expected ~1d 0h 0m)`);

    const r10 = fmtReset(future(48 * 3_600_000 + 30 * 60_000));
    assert(near(r10, '2d 0h 30m'), `48h30m → "${r10}" (expected ~2d 0h 30m)`);
  });

};
