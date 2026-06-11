import fs from 'node:fs';
import path from 'node:path';
import { Boxes, Download } from 'lucide-react';
import {
  LegalCallout,
  LegalDocument,
  LegalPage,
  LegalPanel,
} from '../_components/legal-page';

type Entry = {
  name: string;
  repository: string;
};

type Section = {
  license: string;
  count: number;
  entries: Entry[];
};

function parseNotices(): {
  generatedDate: string | null;
  total: number | null;
  summary: { license: string; count: number }[];
  sections: Section[];
} {
  const filePath = path.join(process.cwd(), 'THIRD_PARTY_NOTICES.md');
  if (!fs.existsSync(filePath)) {
    return { generatedDate: null, total: null, summary: [], sections: [] };
  }
  const md = fs.readFileSync(filePath, 'utf8');

  const generatedMatch = md.match(/\*\*Generated:\*\*\s*([0-9-]+)/);
  const totalMatch = md.match(/\*\*Total third-party packages:\*\*\s*(\d+)/);

  const summary: { license: string; count: number }[] = [];
  const summaryBlock = md.split('## License summary')[1]?.split('## Packages by license')[0];
  if (summaryBlock) {
    const rows = summaryBlock
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('|') && !line.includes('---') && !/^\|\s*License\s*\|/i.test(line));
    for (const row of rows) {
      const cells = row.split('|').map((c) => c.trim()).filter(Boolean);
      if (cells.length >= 2) {
        const count = parseInt(cells[1], 10);
        if (!Number.isNaN(count)) {
          summary.push({ license: cells[0], count });
        }
      }
    }
  }

  const sections: Section[] = [];
  const packagesBlock = md.split('## Packages by license')[1]?.split('## Notes')[0] ?? '';
  const sectionChunks = packagesBlock.split(/^###\s+/m).slice(1);
  for (const chunk of sectionChunks) {
    const headerMatch = chunk.match(/^([^\n]+)\n/);
    if (!headerMatch) continue;
    const header = headerMatch[1].trim();
    const headerInfo = header.match(/^(.*?)\s*\((\d+)\)$/);
    const license = headerInfo ? headerInfo[1].trim() : header;
    const count = headerInfo ? parseInt(headerInfo[2], 10) : 0;
    const entries: Entry[] = [];
    const lines = chunk.slice(headerMatch[0].length).split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('- ')) continue;
      const inner = trimmed.slice(2);
      const split = inner.split(/\s+—\s+/);
      const name = split[0].replace(/`/g, '').trim();
      const repository = split.slice(1).join(' — ').trim();
      entries.push({ name, repository });
    }
    sections.push({ license, count, entries });
  }

  return {
    generatedDate: generatedMatch?.[1] ?? null,
    total: totalMatch ? parseInt(totalMatch[1], 10) : null,
    summary,
    sections,
  };
}

export default function OpenSourceLicensesPage() {
  const { generatedDate, total, summary, sections } = parseNotices();

  return (
    <LegalPage
      title="Open-Source Licenses"
      subtitle={
        total !== null
          ? `${total} third-party packages · ${generatedDate ? `Generated ${generatedDate}` : 'Generated automatically'}`
          : generatedDate
            ? `Generated ${generatedDate}`
            : 'Generated automatically'
      }
      badge="Compliance"
      icon={Boxes}
      maxWidth="xl"
    >
      <LegalDocument>
        <p>
          SocioGenie is built by <strong>MAGNATEX LLP</strong> on top of a
          large ecosystem of open-source software. This page lists every
          third-party package shipped with the SocioGenie frontend, together
          with its license, in fulfilment of the attribution requirements of
          MIT, BSD, Apache 2.0, and similar permissive licenses.
        </p>
        <p>
          The complete machine-readable notices file is available for download:
        </p>
        <p>
          <a
            href="/legal/third-party-notices.md"
            className="legal-btn not-prose"
            download
          >
            <Download className="h-4 w-4" />
            Download THIRD_PARTY_NOTICES.md
          </a>
        </p>
      </LegalDocument>

      {summary.length > 0 && (
        <LegalPanel>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>License</th>
                  <th className="text-right">Packages</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr key={row.license}>
                    <td className="font-medium text-slate-900">{row.license}</td>
                    <td className="text-right tabular-nums">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </LegalPanel>
      )}

      <div className="space-y-3">
        {sections.map((section) => (
          <details key={section.license} className="legal-accordion group">
            <summary className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-slate-900">
                    {section.license}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {section.count} package{section.count === 1 ? '' : 's'}
                  </span>
                </div>
                <span className="text-xs text-slate-500 group-open:hidden">
                  Show
                </span>
                <span className="hidden text-xs text-slate-500 group-open:inline">
                  Hide
                </span>
              </summary>
              <ul className="border-t border-slate-100 divide-y divide-slate-100">
                {section.entries.map((entry) => (
                  <li
                    key={entry.name}
                    className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <code className="text-sm font-mono text-slate-900">
                      {entry.name}
                    </code>
                    {entry.repository && (
                      <a
                        href={entry.repository}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="max-w-full truncate text-xs text-indigo-600 hover:text-indigo-700 sm:max-w-[50%]"
                      >
                        {entry.repository}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
          </details>
        ))}
      </div>

      <LegalCallout title="Special notes">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <code className="font-mono">node-forge</code> is dual-licensed
            (BSD-3-Clause OR GPL-2.0). MAGNATEX LLP elects the BSD-3-Clause
            license.
          </li>
          <li>
            <code className="font-mono">@img/sharp-*</code> ships libvips
            bindings under LGPL-3.0-or-later, used through the standard public
            interface as permitted by Section 4 of LGPL-3.0.
          </li>
          <li>
            <code className="font-mono">caniuse-lite</code> is used under
            CC-BY-4.0; attribution: the Browserslist contributors.
          </li>
        </ul>
      </LegalCallout>
    </LegalPage>
  );
}
