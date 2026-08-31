import { Fragment, type ReactNode } from 'react';
import {
  type LegalDocumentId,
  legalDocuments,
} from '@/content/legal/documents';
import { LegalDocument } from '../_components/legal-page';

type Block =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

export type LegalMarkdownMeta = {
  title: string;
  subtitle: string | null;
  body: string;
};

export function loadLegalMarkdown(
  documentId: LegalDocumentId
): LegalMarkdownMeta {
  const raw = legalDocuments[documentId];
  if (!raw) {
    throw new Error(`Unknown legal document: ${documentId}`);
  }
  const withoutComments = raw.replace(/<!--[\s\S]*?-->/g, '').trim();
  const lines = withoutComments.replace(/\r\n/g, '\n').split('\n');

  const titleLine = lines.find((line) => line.startsWith('# '));
  const title = titleLine ? titleLine.slice(2).trim() : 'Legal';

  const subtitleLine = lines.find(
    (line) =>
      line.trim() && !line.startsWith('#') && /effective date:/i.test(line)
  );
  const subtitle = subtitleLine?.trim() ?? null;

  const bodyStart = subtitleLine
    ? lines.indexOf(subtitleLine) + 1
    : titleLine
      ? lines.indexOf(titleLine) + 1
      : 0;

  const body = lines.slice(bodyStart).join('\n').trim();
  return { title, subtitle, body };
}

function normalizeHref(href: string): string {
  if (href.startsWith('https://www.sociogenie.ai/')) {
    return href.replace('https://www.sociogenie.ai', '');
  }
  return href;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(\[[^\]]+\]\([^)]+\)|<[^<>@\s]+@[^<>@\s]+>|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let partIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <Fragment key={`${keyPrefix}-t-${partIndex++}`}>
          {text.slice(lastIndex, match.index)}
        </Fragment>
      );
    }

    const token = match[0];
    if (token.startsWith('[') && token.includes('](')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        const normalized = normalizeHref(href);
        const external = /^https?:\/\//.test(normalized);
        nodes.push(
          <a
            key={`${keyPrefix}-a-${partIndex++}`}
            href={normalized}
            {...(external
              ? { target: '_blank', rel: 'noreferrer noopener' }
              : {})}
          >
            {renderInline(label, `${keyPrefix}-l-${partIndex}`)}
          </a>
        );
      }
    } else if (token.startsWith('<') && token.endsWith('>')) {
      const email = token.slice(1, -1);
      nodes.push(
        <a key={`${keyPrefix}-m-${partIndex++}`} href={`mailto:${email}`}>
          {email}
        </a>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong key={`${keyPrefix}-s-${partIndex++}`}>
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(
        <em key={`${keyPrefix}-e-${partIndex++}`}>{token.slice(1, -1)}</em>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code key={`${keyPrefix}-c-${partIndex++}`}>{token.slice(1, -1)}</code>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(
      <Fragment key={`${keyPrefix}-t-${partIndex++}`}>
        {text.slice(lastIndex)}
      </Fragment>
    );
  }

  return nodes;
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  return /^\|?[\s:-]+\|[\s|:-]+\|?$/.test(line.trim());
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = (lines[index] ?? '').trim();

    if (!line || line === '---') {
      index += 1;
      continue;
    }

    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.slice(3).trim() });
      index += 1;
      continue;
    }

    if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', text: line.slice(4).trim() });
      index += 1;
      continue;
    }

    if (line.startsWith('|')) {
      const headers = parseTableRow(line);
      index += 1;
      if (index < lines.length && isTableSeparator(lines[index] ?? '')) {
        index += 1;
      }
      const rows: string[][] = [];
      while (
        index < lines.length &&
        (lines[index] ?? '').trim().startsWith('|')
      ) {
        if (!isTableSeparator(lines[index] ?? '')) {
          rows.push(parseTableRow(lines[index] ?? ''));
        }
        index += 1;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length) {
        const current = (lines[index] ?? '').trim();
        const itemMatch = current.match(/^[-*]\s+(.+)$/);
        if (!itemMatch) break;
        items.push(itemMatch[1].trim());
        index += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length) {
        const current = (lines[index] ?? '').trim();
        const itemMatch = current.match(/^\d+\.\s+(.+)$/);
        if (!itemMatch) break;
        items.push(itemMatch[1].trim());
        index += 1;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    const paragraphLines: string[] = [line];
    index += 1;
    while (index < lines.length) {
      const next = (lines[index] ?? '').trim();
      if (
        !next ||
        next === '---' ||
        next.startsWith('## ') ||
        next.startsWith('### ') ||
        next.startsWith('|') ||
        /^[-*]\s+/.test(next) ||
        /^\d+\.\s+/.test(next)
      ) {
        break;
      }
      paragraphLines.push(next);
      index += 1;
    }
    blocks.push({ type: 'p', text: paragraphLines.join(' ') });
  }

  return blocks;
}

function renderBlocks(blocks: Block[]): ReactNode {
  return blocks.map((block, blockIndex) => {
    const key = `block-${blockIndex}`;

    switch (block.type) {
      case 'h2':
        return <h2 key={key}>{renderInline(block.text, key)}</h2>;
      case 'h3':
        return <h3 key={key}>{renderInline(block.text, key)}</h3>;
      case 'p':
        return <p key={key}>{renderInline(block.text, key)}</p>;
      case 'ul':
        return (
          <ul key={key}>
            {block.items.map((item, itemIndex) => (
              <li key={`${key}-li-${itemIndex}`}>
                {renderInline(item, `${key}-li-${itemIndex}`)}
              </li>
            ))}
          </ul>
        );
      case 'ol':
        return (
          <ol key={key}>
            {block.items.map((item, itemIndex) => (
              <li key={`${key}-li-${itemIndex}`}>
                {renderInline(item, `${key}-li-${itemIndex}`)}
              </li>
            ))}
          </ol>
        );
      case 'table':
        return (
          <div key={key} className="legal-table-wrap">
            <table>
              <thead>
                <tr>
                  {block.headers.map((header, headerIndex) => (
                    <th key={`${key}-th-${headerIndex}`}>
                      {renderInline(header, `${key}-th-${headerIndex}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={`${key}-tr-${rowIndex}`}>
                    {row.map((cell, cellIndex) => (
                      <td key={`${key}-td-${rowIndex}-${cellIndex}`}>
                        {renderInline(
                          cell,
                          `${key}-td-${rowIndex}-${cellIndex}`
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default:
        return null;
    }
  });
}

export function LegalMarkdownContent({ body }: { body: string }) {
  const blocks = parseBlocks(body);
  return <LegalDocument>{renderBlocks(blocks)}</LegalDocument>;
}
