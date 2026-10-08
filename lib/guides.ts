import { guideSources } from '@/content/guides';
import { slugify, stripInline } from '@/lib/markdown';

/**
 * Guides are markdown files in `content/guides/`, bundled to TypeScript by
 * scripts/bundle-legal-content.mjs. Each starts with a front-matter block:
 *
 *   ---
 *   slug: how-to-use-ai-for-social-media-marketing
 *   kind: guide            # or "pillar" (served at /<slug>, not /guides/<slug>)
 *   pillar: ai             # which head-term cluster it belongs to: ai | smm
 *   title: H1 shown on the page
 *   seoTitle: <title> tag, under 60 characters
 *   description: meta description, under 155 characters
 *   answer: the 45–55 word answer block under the H1
 *   updated: 2026-10-08
 *   order: 3
 *   related: slug-a, slug-b
 *   ---
 *
 * A section titled "## Frequently asked questions" is lifted out of the
 * body: each "### question" + paragraph becomes an FAQ item, rendered as an
 * accordion and emitted as FAQPage schema. HTML comments are reviewer notes
 * (e.g. "VERIFY: figure") and never reach the page.
 */

export type GuideKind = 'pillar' | 'guide';
export type PillarId = 'ai' | 'smm';

export type FaqItem = { question: string; answer: string };
export type TocItem = { id: string; text: string };

export type Guide = {
  slug: string;
  kind: GuideKind;
  pillar: PillarId;
  title: string;
  seoTitle: string;
  description: string;
  answer: string;
  updated: string;
  order: number;
  related: string[];
  /** Site path: `/<slug>` for pillars, `/guides/<slug>` otherwise. */
  path: string;
  body: string;
  faq: FaqItem[];
  toc: TocItem[];
  readingMinutes: number;
};

const FAQ_HEADING = /^##\s+Frequently asked questions\s*$/im;

function parseFrontMatter(raw: string): {
  data: Record<string, string>;
  body: string;
} {
  const match = raw.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { data: {}, body: raw };
  const data: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^([A-Za-z]+):\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].replace(/\s+#.*$/, '').trim();
  }
  return { data, body: raw.slice(match[0].length) };
}

function splitFaq(body: string): { body: string; faq: FaqItem[] } {
  const match = body.match(FAQ_HEADING);
  if (!match || match.index === undefined) return { body, faq: [] };

  const before = body.slice(0, match.index);
  const rest = body.slice(match.index + match[0].length);
  // The FAQ section runs to the next "## " heading or the end.
  const next = rest.search(/^##\s+/m);
  const faqText = next === -1 ? rest : rest.slice(0, next);
  const after = next === -1 ? '' : rest.slice(next);

  const faq: FaqItem[] = [];
  for (const chunk of faqText.split(/^###\s+/m).slice(1)) {
    const [questionLine, ...answerLines] = chunk.split('\n');
    const answer = answerLines.join(' ').replace(/\s+/g, ' ').trim();
    if (questionLine.trim() && answer) {
      faq.push({ question: questionLine.trim(), answer });
    }
  }
  return { body: `${before}\n${after}`.trim(), faq };
}

function parseGuide(key: string, raw: string): Guide {
  const withoutComments = raw.replace(/<!--[\s\S]*?-->/g, '');
  const { data, body: fullBody } = parseFrontMatter(withoutComments);
  const { body, faq } = splitFaq(fullBody.trim());

  const slug = data.slug || key;
  const kind: GuideKind = data.kind === 'pillar' ? 'pillar' : 'guide';
  const toc = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => ({
    id: slugify(m[1]),
    text: stripInline(m[1]),
  }));
  const words = `${body} ${faq.map((f) => f.answer).join(' ')}`
    .split(/\s+/)
    .filter(Boolean).length;

  return {
    slug,
    kind,
    pillar: data.pillar === 'smm' ? 'smm' : 'ai',
    title: data.title ?? slug,
    seoTitle: data.seoTitle || data.title || slug,
    description: data.description ?? '',
    answer: data.answer ?? '',
    updated: data.updated ?? '',
    order: Number(data.order ?? 99),
    related: (data.related ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    path: kind === 'pillar' ? `/${slug}` : `/guides/${slug}`,
    body,
    faq,
    toc,
    readingMinutes: Math.max(1, Math.round(words / 220)),
  };
}

const GUIDES: Guide[] = Object.entries(guideSources)
  .map(([key, raw]) => parseGuide(key, raw))
  .sort((a, b) => a.order - b.order);

export function allGuides(): Guide[] {
  return GUIDES;
}

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

/** Cluster articles only — what `/guides/[slug]` serves. */
export function clusterGuides(): Guide[] {
  return GUIDES.filter((g) => g.kind === 'guide');
}

export function pillarGuides(): Guide[] {
  return GUIDES.filter((g) => g.kind === 'pillar');
}

/** Explicit `related` first, then the rest of the same cluster. */
export function relatedGuides(guide: Guide, limit = 3): Guide[] {
  const explicit = guide.related
    .map((slug) => getGuide(slug))
    .filter((g): g is Guide => Boolean(g) && g!.slug !== guide.slug);
  const sameCluster = GUIDES.filter(
    (g) =>
      g.slug !== guide.slug &&
      g.kind === 'guide' &&
      g.pillar === guide.pillar &&
      !explicit.includes(g)
  );
  return [...explicit, ...sameCluster].slice(0, limit);
}

export const SITE_URL = 'https://www.sociogenie.ai';
