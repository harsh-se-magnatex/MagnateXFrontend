import { Boxes, Download } from 'lucide-react';
import { licensesFooterMarkdown } from '@/content/legal/documents';
import { licensesNotices } from '@/content/legal/licenses-notices';
import { LegalMarkdownContent } from '../_lib/legal-markdown';
import {
  LegalCallout,
  LegalDocument,
  LegalPage,
  LegalPanel,
} from '../_components/legal-page';

export default function OpenSourceLicensesPage() {
  const { generatedDate, total, summary, sections } = licensesNotices;
  const footer = licensesFooterMarkdown;

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
          third-party package shipped with SocioGenie, together with its
          license, in fulfilment of the attribution requirements of the MIT,
          BSD, Apache 2.0, ISC, and similar permissive licenses.
        </p>
        <p>
          This list is generated automatically from our dependency manifest on
          every deployment, so it always reflects what is actually running in
          production.
        </p>
        <p>
          The complete machine-readable notices file, including full license
          texts, is available for download:
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

      {footer ? <LegalMarkdownContent body={footer} /> : null}
    </LegalPage>
  );
}
