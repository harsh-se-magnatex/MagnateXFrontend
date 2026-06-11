// Generates THIRD_PARTY_NOTICES.md from a license-checker JSON report.
// Usage: node scripts/generate-notices.mjs [path-to-license-report.json] [out-file]
import fs from 'node:fs';
import path from 'node:path';

const reportPath = process.argv[2] || 'license-report.json';
const outPath = process.argv[3] || 'THIRD_PARTY_NOTICES.md';

if (!fs.existsSync(reportPath)) {
  console.error(`license report not found at ${reportPath}`);
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const pkgJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const rootName = `${pkgJson.name}@${pkgJson.version}`;

const entries = Object.entries(report)
  .filter(([name]) => name !== rootName)
  .map(([name, meta]) => ({
    name,
    licenses: meta.licenses || 'UNKNOWN',
    repository: meta.repository || meta.url || '',
    publisher: meta.publisher || '',
    licenseFile: meta.licenseFile || '',
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const byLicense = new Map();
for (const e of entries) {
  const key = String(e.licenses);
  if (!byLicense.has(key)) byLicense.set(key, []);
  byLicense.get(key).push(e);
}

const licenseOrder = Array.from(byLicense.keys()).sort(
  (a, b) => byLicense.get(b).length - byLicense.get(a).length,
);

const summaryRows = licenseOrder
  .map((lic) => `| ${escapePipe(lic)} | ${byLicense.get(lic).length} |`)
  .join('\n');

const today = new Date().toISOString().slice(0, 10);

let md = '';
md += `# Third-Party Notices\n\n`;
md += `**Product:** ${pkgJson.name} (SocioGenie frontend)\n`;
md += `**Generated:** ${today}\n`;
md += `**Total third-party packages:** ${entries.length}\n\n`;
md += `This file lists the open-source software components that are bundled with or used by this product, together with their respective licenses. It is provided in compliance with the attribution requirements of those licenses (e.g., MIT, BSD, Apache 2.0).\n\n`;
md += `MAGNATEX LLP (the publisher of SocioGenie) is grateful to the maintainers of these projects.\n\n`;
md += `## License summary\n\n`;
md += `| License | # of packages |\n|---|---|\n${summaryRows}\n\n`;

md += `## Packages by license\n\n`;
for (const lic of licenseOrder) {
  md += `### ${lic} (${byLicense.get(lic).length})\n\n`;
  for (const e of byLicense.get(lic)) {
    const repo = e.repository ? ` — ${e.repository}` : '';
    md += `- \`${e.name}\`${repo}\n`;
  }
  md += `\n`;
}

md += `## Notes\n\n`;
md += `- **\`node-forge\`** is dual-licensed (BSD-3-Clause OR GPL-2.0). MAGNATEX LLP elects the BSD-3-Clause license for its use of this package.\n`;
md += `- **\`@img/sharp-*\`** ships libvips bindings under LGPL-3.0-or-later. As permitted by Section 4 of LGPL-3.0, we use the library through its standard public interface; LGPL-3.0 source for sharp is at https://github.com/lovell/sharp.\n`;
md += `- **\`caniuse-lite\`** is licensed under CC-BY-4.0; attribution: \"caniuse-lite by the Browserslist contributors, used under CC-BY-4.0\".\n`;
md += `- This file is regenerated whenever production dependencies change. To regenerate run \`npx license-checker --production --json --out license-report.json && node scripts/generate-notices.mjs\`.\n`;

fs.writeFileSync(outPath, md);
console.log(`Wrote ${outPath} with ${entries.length} packages`);

function escapePipe(s) {
  return String(s).replace(/\|/g, '\\|');
}
