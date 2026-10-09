const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../lib/workspace-nav.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const nav = {};
new Function('exports', compiled)(nav);

test('retired event-post URLs resolve to Create Post, including saved links', () => {
  for (const route of ['/occasion-posts', '/event-posts', '/event-studio', '/festive-post']) {
    assert.equal(nav.resolveWorkspacePath(route), '/create-post');
    assert.equal(nav.resolveWorkspacePath(`${route}?event=diwali#preview`), '/create-post');
  }
});

test('workspace navigation retains active creation tools and omits event posts', () => {
  assert.deepEqual(nav.WORKSPACE_NAV.slice(0, 7).map(item => item.name), [
    'Create Post', 'Marketing Scenes', 'Product Posts', 'Videos',
    'Campaigns', 'Carousel Posts', 'Schedule a Post',
  ]);
  assert.equal(nav.resolveWorkspacePath('/create-campaign'), '/campaigns');
  assert.equal(nav.workspacePageTitle('/create-post'), 'Create Post');
  assert.equal(nav.WORKSPACE_NAV.some(item => /occasion|festive|event/i.test(item.name)), false);
});
