'use client';

import { Fragment, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] };

function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const rawLine = lines[index] ?? '';
    const line = rawLine.trim();

    if (!line) {
      index += 1;
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3;
      blocks.push({ type: 'heading', level, text: headingMatch[2].trim() });
      index += 1;
      continue;
    }

    if (/^[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length) {
        const current = (lines[index] ?? '').trim();
        const itemMatch = current.match(/^[-*•]\s+(.+)$/);
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
        /^(#{1,3})\s+/.test(next) ||
        /^[-*•]\s+/.test(next) ||
        /^\d+\.\s+/.test(next)
      ) {
        break;
      }
      paragraphLines.push(next);
      index += 1;
    }
    blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') });
  }

  return blocks;
}

function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let partIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <Fragment key={`${keyPrefix}-text-${partIndex++}`}>
          {text.slice(lastIndex, match.index)}
        </Fragment>
      );
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        <strong
          key={`${keyPrefix}-strong-${partIndex++}`}
          className="font-semibold"
        >
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(
        <em key={`${keyPrefix}-em-${partIndex++}`} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code
          key={`${keyPrefix}-code-${partIndex++}`}
          className="rounded bg-element px-1 py-0.5 font-mono text-[0.85em]"
        >
          {token.slice(1, -1)}
        </code>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(
      <Fragment key={`${keyPrefix}-text-${partIndex++}`}>
        {text.slice(lastIndex)}
      </Fragment>
    );
  }

  return nodes.length > 0 ? nodes : [text];
}

function MarkdownBlockView({
  block,
  index,
}: {
  block: MarkdownBlock;
  index: number;
}) {
  switch (block.type) {
    case 'heading': {
      const className =
        block.level === 1
          ? 'text-base font-semibold text-default'
          : block.level === 2
            ? 'text-sm font-semibold text-default'
            : 'text-sm font-medium text-default';
      const content = renderInlineMarkdown(block.text, `heading-${index}`);
      if (block.level === 1) {
        return <h3 className={className}>{content}</h3>;
      }
      if (block.level === 2) {
        return <h4 className={className}>{content}</h4>;
      }
      return <h5 className={className}>{content}</h5>;
    }
    case 'paragraph':
      return (
        <p className="leading-relaxed text-default [overflow-wrap:anywhere]">
          {renderInlineMarkdown(block.text, `paragraph-${index}`)}
        </p>
      );
    case 'ul':
      return (
        <ul className="list-disc space-y-2 pl-5 marker:text-secondary">
          {block.items.map((item, itemIndex) => (
            <li
              key={`${index}-ul-${itemIndex}`}
              className="leading-relaxed text-default [overflow-wrap:anywhere]"
            >
              {renderInlineMarkdown(item, `ul-${index}-${itemIndex}`)}
            </li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol className="list-decimal space-y-2 pl-5 marker:text-secondary">
          {block.items.map((item, itemIndex) => (
            <li
              key={`${index}-ol-${itemIndex}`}
              className="leading-relaxed text-default [overflow-wrap:anywhere]"
            >
              {renderInlineMarkdown(item, `ol-${index}-${itemIndex}`)}
            </li>
          ))}
        </ol>
      );
    default:
      return null;
  }
}

export function ResearchMarkdownContent({
  markdown,
  className,
}: {
  markdown: string;
  className?: string;
}) {
  const blocks = parseMarkdownBlocks(markdown);
  if (blocks.length === 0) return null;

  return (
    <div className={cn('space-y-3 text-sm', className)}>
      {blocks.map((block, index) => (
        <MarkdownBlockView key={`block-${index}`} block={block} index={index} />
      ))}
    </div>
  );
}
