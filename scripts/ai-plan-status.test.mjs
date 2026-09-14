import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadTypescript(relativePath, imports = {}) {
  const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    require: (name) => {
      assert.ok(name in imports, `Unexpected import: ${name}`);
      return imports[name];
    },
  });
  return exports;
}

const target = {
  date: '2026-09-08',
  platform: 'facebook',
  kind: 'quick-create',
};
const locks = loadTypescript('../lib/content-plan-force-run.ts');

test('trial preview exposes locked examples and the missed included activity', async () => {
  const raw = {
    accessPhase: 'trial', aiPlan: { status: 'calendar_ready', selectedPlatforms: ['facebook'], lockedAt: {} },
    plan: { platformLimit: 1 }, connectionState: {}, cycle: { id: 'trial-1' }, content: [],
    cells: [
      { id: 'trial-cell', date: '2026-09-03', platform: 'facebook', kind: 'ai-engine', status: 'missed', executionEntitlement: 'trial_activity' },
      { id: 'example-cell', date: '2026-09-04', platform: 'facebook', kind: 'campaign', status: 'planned', executionEntitlement: 'example' },
    ],
  };
  const api = loadTypescript('../src/service/api/ai-plan.service.ts', { '@/lib/axios': { get: async () => ({ data: { data: raw } }) } });
  const response = await api.getAIPlanApi();
  assert.equal(response.accessPhase, 'trial');
  assert.equal(response.days[1].byPlatform.facebook.upcoming[0].status, 'Locked example');
  assert.match(response.days[0].byPlatform.facebook.upcoming[0].note, /missed/);
});

test('paid preparation keeps the old preview visible and allows a seed retry', async () => {
  const raw = { accessPhase: 'paid', calendarPreparing: true,
    aiPlan: { status: 'awaiting_selection', selectedPlatforms: ['facebook'], lockedAt: {} },
    plan: { platformLimit: 1 }, connectionState: {}, cycle: { id: 'trial-1' }, cells: [], content: [] };
  const api = loadTypescript('../src/service/api/ai-plan.service.ts', { '@/lib/axios': { get: async () => ({ data: { data: raw } }) } });
  const response = await api.getAIPlanApi();
  assert.equal(response.calendarSeeded, true);
  assert.equal(response.calendarPreparing, true);
  assert.equal(response.canGenerateCalendar, true);
});

for (const [lifecycle, expectedStatus, completed] of [
  ['generating', 'queued', false],
  ['draft', 'draft', true],
  ['review_pending', 'pending-approval', true],
  ['scheduled', 'scheduled', true],
  ['publishing', 'publishing', true],
  ['published', 'published', true],
  ['failed', 'failed', true],
  ['rejected', 'rejected', true],
  ['removed', 'removed', true],
]) {
  test(`${lifecycle} content has the correct calendar status and Force Run completion`, async () => {
    const raw = {
      aiPlan: { status: 'calendar_ready', selectedPlatforms: ['facebook'], lockedAt: {} },
      plan: { platformLimit: 1 },
      connectionState: { facebook: { connected: true } },
      cells: [{ id: 'cell-1', ...target, status: 'enqueued' }],
      content: [{
        id: 'post-1', platform: 'facebook', lifecycle,
        source: 'ai_plan', aiPlan: { cellId: 'cell-1' },
      }],
    };
    const api = loadTypescript('../src/service/api/ai-plan.service.ts', {
      '@/lib/axios': { get: async () => ({ data: { data: raw } }) },
    });
    const response = await api.getAIPlanApi();
    const slot = response.days[0].byPlatform.facebook;
    assert.equal(slot.generated.length, 1);
    assert.equal(slot.generated[0].status, expectedStatus);
    // The content record takes precedence over a stale enqueued calendar cell.
    assert.equal(slot.upcoming.length, 0);
    assert.equal(locks.isForceRunTargetComplete(response.days, target), completed);
  });
}
