import { parseMarkdownBlocks, renderMarkdownBlocks } from '@/lib/markdown';
import {
  type LegalDocumentId,
  legalDocuments,
} from '@/content/legal/documents';
import { LegalDocument } from '../_components/legal-page';

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

export function LegalMarkdownContent({ body }: { body: string }) {
  const blocks = parseMarkdownBlocks(body);
  return (
    <LegalDocument>
      {renderMarkdownBlocks(blocks, { tableWrapClassName: 'legal-table-wrap' })}
    </LegalDocument>
  );
}
