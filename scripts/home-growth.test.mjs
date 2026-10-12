import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../lib/home-growth.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const growth = {};
new Function('exports', compiled)(growth);

function trend(previous, current) {
  return Array.from({ length: 14 }, (_, i) => ({
    date: `2026-10-${String(i + 1).padStart(2, '0')}`,
    value: i < 7 ? previous : current,
  }));
}
const overview = (points) => growth.averageGrowthOverviewPct(
  { reachTrend: points }, null, null, ['facebook'],
);

test('caps 200% and larger growth at 100%', () => {
  assert.equal(overview(trend(10, 30)), 100);
  assert.equal(overview(trend(1, 1000)), 100);
});

test('floors declines at zero and retains ordinary rounded growth', () => {
  assert.equal(overview(trend(20, 10)), 0);
  assert.equal(overview(trend(10, 0)), 0);
  assert.equal(overview(trend(10, 10)), 0);
  assert.equal(overview(trend(3, 4)), 33.3);
});

test('new connections and zero baselines show unavailable growth', () => {
  assert.equal(overview([]), null);
  assert.equal(overview(trend(10, 20).slice(-5)), null);
  assert.equal(overview(trend(0, 20)), null);
});

test('gaps, duplicate dates, and malformed values cannot manufacture growth', () => {
  const gap = trend(10, 20);
  gap[13].date = '2026-10-16';
  assert.equal(overview(gap), null);
  const duplicate = trend(10, 20);
  duplicate[13].date = duplicate[12].date;
  assert.equal(overview(duplicate), null);
  for (const value of [NaN, Infinity, -1, null, '10']) {
    const invalid = trend(10, 20);
    invalid[0].value = value;
    assert.equal(overview(invalid), null);
  }
});

test('disconnecting excludes saved analytics; reconnecting uses that account history', () => {
  const facebook = { reachTrend: trend(10, 30) };
  const instagram = { reachTrend: trend(10, 15) };
  assert.equal(growth.averageGrowthOverviewPct(facebook, instagram, null, ['instagram']), 50);
  assert.equal(growth.averageGrowthOverviewPct(facebook, instagram, null, []), null);
  assert.equal(growth.averageGrowthOverviewPct(facebook, instagram, null, ['facebook']), 100);
});

test('averages comparable connected platforms and supports fallback metrics', () => {
  assert.equal(growth.averageGrowthOverviewPct(
    { reachTrend: trend(10, 15) },
    { interactionsTrend: trend(10, 12) },
    { pageViewsTrend: trend(10, 10) },
    ['facebook', 'instagram', 'linkedin'],
  ), 23.3);
  assert.equal(overview(trend(10, 15).reverse()), 50);
});
