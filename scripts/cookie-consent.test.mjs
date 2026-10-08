import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../components/ConsentAwareAnalytics.tsx', import.meta.url), 'utf8');
const bootstrap = source.match(/\{`([\s\S]+?)`\}/)[1].replace('${CLARITY_PROJECT_ID}', 'test-project');
const consentSource = readFileSync(new URL('../lib/cookie-consent.ts', import.meta.url), 'utf8');

function browser(record, gpc = false) {
  const values = new Map(record ? [['sg-cookie-consent', JSON.stringify(record)]] : []);
  const listeners = new Map();
  const scripts = [];
  const cookies = [];
  let reloads = 0;
  const context = {
    exports: {},
    navigator: { globalPrivacyControl: gpc },
    localStorage: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
    Event: class { constructor(type) { this.type = type; } },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    document: {
      createElement: () => ({}),
      getElementsByTagName: () => [{ parentNode: { insertBefore: (script) => scripts.push(script) } }],
      set cookie(value) { cookies.push(value); },
    },
    window: {
      location: { hostname: 'www.sociogenie.ai', reload: () => reloads++ },
      addEventListener: (name, callback) => listeners.set(name, callback),
      removeEventListener: (name) => listeners.delete(name),
      dispatchEvent: (event) => listeners.get(event.type)?.(event),
    },
  };
  vm.createContext(context);
  vm.runInContext(ts.transpileModule(consentSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  return { context, scripts, cookies, listeners, reloads: () => reloads };
}

test('Clarity loads only with current analytics consent and maps marketing independently', () => {
  for (const record of [null, { version: 1, analytics: true, marketing: true }, { version: 2, analytics: false, marketing: true }]) {
    const env = browser(record);
    vm.runInContext(bootstrap, env.context);
    assert.equal(env.scripts.length, 0);
  }
  for (const marketing of [false, true]) {
    const env = browser({ version: 2, analytics: true, marketing });
    vm.runInContext(bootstrap, env.context);
    assert.equal(env.scripts.length, 1);
    assert.equal(env.context.window.clarity.q[0][0], 'consentv2');
    assert.equal(env.context.window.clarity.q[0][1].analytics_Storage, 'granted');
    assert.equal(env.context.window.clarity.q[0][1].ad_Storage, marketing ? 'granted' : 'denied');
  }
});

test('old choices require fresh consent; GPC overrides stored and new choices', () => {
  assert.equal(browser({ version: 1, analytics: true, marketing: true }).context.exports.readStoredConsent(), null);
  const env = browser({ version: 2, analytics: true, marketing: true }, true);
  assert.equal(env.context.exports.readStoredConsent().analytics, false);
  assert.equal(env.context.exports.readStoredConsent().marketing, false);
  env.context.exports.persistConsent(true, true);
  assert.equal(env.context.exports.readStoredConsent().analytics, false);
  vm.runInContext(bootstrap, env.context);
  assert.equal(env.scripts.length, 0);
});

test('withdrawal denies both Clarity signals, clears identifiers, and unloads tracker', () => {
  const env = browser({ version: 2, analytics: true, marketing: true });
  const calls = [];
  env.context.window.clarity = (...args) => calls.push(args);
  env.context.require = (name) => {
    if (name === 'react') return { useState: () => [false, () => {}], useEffect: (effect) => effect(), useCallback: (fn) => fn };
    if (name === '@/lib/cookie-consent') return env.context.exports;
    return {};
  };
  vm.runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, env.context);
  env.context.exports.ConsentAwareAnalytics();
  env.context.exports.persistConsent(false, false);
  assert.equal(calls[0][0], 'consentv2');
  assert.equal(calls[0][1].analytics_Storage, 'denied');
  assert.equal(calls[0][1].ad_Storage, 'denied');
  assert.ok(env.cookies.some((value) => value.startsWith('_clck=;')));
  assert.ok(env.cookies.some((value) => value.includes('domain=sociogenie.ai')));
  assert.equal(env.reloads(), 1);
});
