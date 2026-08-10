#!/usr/bin/env node
/**
 * SocioGenie — open-source license notice generator
 *
 * Walks node_modules, collects license metadata for every production
 * dependency, and writes:
 *
 *   public/legal/third-party-notices.md   (downloadable notices file)
 *   src/data/licenses.json                (data the /legal/licenses page renders)
 *
 * Run it in CI on every deploy so the page can never go stale:
 *
 *   "scripts": {
 *     "build": "node scripts/generate-licenses.mjs && next build"
 *   }
 *
 * No dependencies. Node 18+.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const NODE_MODULES = join(ROOT, 'node_modules');

const NOTICES_OUT = join(ROOT, 'public', 'legal', 'third-party-notices.md');
const JSON_OUT = join(ROOT, 'src', 'data', 'licenses.json');

// Licenses that require the full text to be reproduced, not just named.
const RECIPROCAL = [/^GPL/i, /^LGPL/i, /^AGPL/i, /^MPL/i, /^EPL/i, /^CDDL/i];

// Dual-licensed packages where we elect a specific license.
const ELECTIONS = {
  'node-forge': { elected: 'BSD-3-Clause', note: 'Dual-licensed (BSD-3-Clause OR GPL-2.0). MAGNATEX LLP elects BSD-3-Clause.' },
};

function readJSON(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

/** Recursively find every package.json inside node_modules, including scoped and nested. */
function findPackages(dir, found = new Map()) {
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir)) {
    if (entry === '.bin' || entry === '.cache') continue;
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;

    if (entry.startsWith('@')) {
      // Scoped: recurse one level to reach the actual packages.
      for (const scoped of readdirSync(full)) {
        const scopedPath = join(full, scoped);
        if (statSync(scopedPath).isDirectory()) collect(scopedPath, found);
      }
    } else {
      collect(full, found);
    }
  }
  return found;
}

function collect(pkgDir, found) {
  const pkg = readJSON(join(pkgDir, 'package.json'));
  if (pkg?.name && pkg?.version) {
    const key = `${pkg.name}@${pkg.version}`;
    if (!found.has(key)) {
      found.set(key, {
        name: pkg.name,
        version: pkg.version,
        license: normaliseLicense(pkg),
        repository: normaliseRepo(pkg.repository),
        licenseText: readLicenseText(pkgDir),
        dir: pkgDir,
      });
    }
  }
  // Nested node_modules (npm dedupe leftovers, pnpm layouts)
  const nested = join(pkgDir, 'node_modules');
  if (existsSync(nested)) findPackages(nested, found);
}

function normaliseLicense(pkg) {
  if (typeof pkg.license === 'string') return pkg.license;
  if (pkg.license?.type) return pkg.license.type;
  if (Array.isArray(pkg.licenses)) return pkg.licenses.map((l) => l.type || l).join(' OR ');
  return 'UNKNOWN';
}

function normaliseRepo(repo) {
  if (!repo) return null;
  const url = typeof repo === 'string' ? repo : repo.url;
  if (!url) return null;
  return url
    .replace(/^git\+/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/^ssh:\/\/git@/, 'https://')
    .replace(/\.git$/, '');
}

function readLicenseText(pkgDir) {
  const candidates = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'LICENCE.md', 'COPYING', 'COPYING.md'];
  for (const name of candidates) {
    const p = join(pkgDir, name);
    if (existsSync(p)) {
      try { return readFileSync(p, 'utf8').trim(); } catch { /* ignore */ }
    }
  }
  return null;
}

function isReciprocal(license) {
  return RECIPROCAL.some((re) => re.test(license));
}

// ---------------------------------------------------------------------------

const packages = [...findPackages(NODE_MODULES).values()]
  .filter((p) => p.name !== readJSON(join(ROOT, 'package.json'))?.name)
  .sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));

// Group by license
const byLicense = new Map();
for (const p of packages) {
  const license = ELECTIONS[p.name]?.elected ?? p.license;
  if (!byLicense.has(license)) byLicense.set(license, []);
  byLicense.get(license).push(p);
}

const groups = [...byLicense.entries()]
  .map(([license, pkgs]) => ({ license, count: pkgs.length, packages: pkgs }))
  .sort((a, b) => b.count - a.count);

const unknown = packages.filter((p) => p.license === 'UNKNOWN');
const reciprocal = packages.filter((p) => isReciprocal(ELECTIONS[p.name]?.elected ?? p.license));

// --- Write the JSON the page renders -------------------------------------

const generatedAt = new Date().toISOString().slice(0, 10);

const jsonPayload = {
  generatedAt,
  totalPackages: packages.length,
  summary: groups.map((g) => ({ license: g.license, count: g.count })),
  groups: groups.map((g) => ({
    license: g.license,
    count: g.count,
    packages: g.packages.map((p) => ({
      name: p.name,
      version: p.version,
      repository: p.repository,
    })),
  })),
  notes: Object.entries(ELECTIONS).map(([name, v]) => ({ package: name, note: v.note })),
};

mkdirSync(dirname(JSON_OUT), { recursive: true });
writeFileSync(JSON_OUT, JSON.stringify(jsonPayload, null, 2));

// --- Write the full notices file -----------------------------------------

let notices = `# Third-Party Notices — SocioGenie

Generated ${generatedAt} · ${packages.length} packages

SocioGenie is built by MAGNATEX LLP on open-source software. This file reproduces
the license notices required by the terms of those licenses.

---

## Summary

| License | Packages |
| --- | --- |
${groups.map((g) => `| ${g.license} | ${g.count} |`).join('\n')}

---

`;

for (const group of groups) {
  notices += `## ${group.license} (${group.count})\n\n`;
  for (const p of group.packages) {
    notices += `### ${p.name}@${p.version}\n\n`;
    if (p.repository) notices += `${p.repository}\n\n`;
    if (ELECTIONS[p.name]) notices += `> ${ELECTIONS[p.name].note}\n\n`;
    if (p.licenseText) {
      notices += '```\n' + p.licenseText + '\n```\n\n';
    } else {
      notices += `_License: ${p.license}. Full text not bundled with the package._\n\n`;
    }
  }
  notices += '---\n\n';
}

mkdirSync(dirname(NOTICES_OUT), { recursive: true });
writeFileSync(NOTICES_OUT, notices);

// --- Report ---------------------------------------------------------------

console.log(`✓ ${packages.length} packages across ${groups.length} license types`);
console.log(`✓ ${NOTICES_OUT}`);
console.log(`✓ ${JSON_OUT}`);

if (unknown.length) {
  console.warn(`\n⚠  ${unknown.length} package(s) with no declared license — review before shipping:`);
  unknown.forEach((p) => console.warn(`   ${p.name}@${p.version}`));
}

if (reciprocal.length) {
  console.warn(`\n⚠  ${reciprocal.length} package(s) under a reciprocal/copyleft license — confirm your usage complies:`);
  reciprocal.forEach((p) => console.warn(`   ${p.name}@${p.version} — ${p.license}`));
}

// Fail the build on an undeclared license so it can never ship silently.
if (process.env.CI && unknown.length) {
  process.exitCode = 1;
}
