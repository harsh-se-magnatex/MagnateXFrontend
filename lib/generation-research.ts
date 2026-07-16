export type GenerationResearch = {
  provider?: string | null;
  model?: string | null;
  context?: string | null;
  sources?: string[];
  contentType?: string | null;
  contentTypeLabel?: string | null;
  contentAngle?: string | null;
};

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

export function formatContentTypeKeyLabel(key: string): string {
  return key
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function parseGenerationResearchFromProof(
  proof: unknown
): GenerationResearch | null {
  if (!proof || typeof proof !== 'object') return null;
  const proofRecord = proof as Record<string, unknown>;
  const snapshot = asObject(proofRecord.contentAngleSnapshot);

  const research = asObject(proofRecord.research);
  const context = research ? asTrimmedString(research.context) : null;
  const provider = research ? asTrimmedString(research.provider) : null;
  const model = research ? asTrimmedString(research.model) : null;
  const sources =
    research && Array.isArray(research.sources)
      ? research.sources
          .filter((source): source is string => typeof source === 'string')
          .map((source) => source.trim())
          .filter(Boolean)
      : [];

  const contentType =
    asTrimmedString(proofRecord.contentType) ??
    (snapshot ? asTrimmedString(snapshot.contentType) : null);
  const contentTypeLabel =
    asTrimmedString(proofRecord.contentFormatLabel) ??
    (contentType ? formatContentTypeKeyLabel(contentType) : null);
  const contentAngle =
    asTrimmedString(proofRecord.contentDescription) ??
    (snapshot ? asTrimmedString(snapshot.description) : null);

  const result: GenerationResearch = {
    provider,
    model,
    context,
    sources,
    contentType,
    contentTypeLabel,
    contentAngle,
  };

  if (!hasViewableResearch(result)) return null;
  return result;
}

export function mergeGenerationResearch(
  research: GenerationResearch | null | undefined,
  extras?: {
    contentType?: string | null;
    contentTypeLabel?: string | null;
    contentAngle?: string | null;
  }
): GenerationResearch | null {
  const merged: GenerationResearch = {
    ...(research ?? {}),
    contentType: extras?.contentType ?? research?.contentType ?? null,
    contentTypeLabel:
      extras?.contentTypeLabel ??
      research?.contentTypeLabel ??
      (extras?.contentType || research?.contentType
        ? formatContentTypeKeyLabel(
            (extras?.contentType ?? research?.contentType) as string
          )
        : null),
    contentAngle: extras?.contentAngle ?? research?.contentAngle ?? null,
  };

  if (!hasViewableResearch(merged)) return null;
  return merged;
}

export function hasViewableResearch(
  research: GenerationResearch | null | undefined
): boolean {
  if (!research) return false;
  return Boolean(
    research.contentType?.trim() ||
      research.contentTypeLabel?.trim() ||
      research.contentAngle?.trim() ||
      research.context?.trim() ||
      (research.sources && research.sources.length > 0)
  );
}

/** Strip inline `[Source: domain]` tags for cleaner reading in the UI. */
export function formatResearchContextForDisplay(context: string): string {
  return context
    .replace(/\s*\[Source:\s*[^\]]+\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function researchProviderLabel(
  research: GenerationResearch
): string | null {
  const provider = research.provider?.trim();
  if (!provider || provider === 'none') return null;
  const model = research.model?.trim();
  if (model && model !== 'none') {
    return `${provider} · ${model}`;
  }
  return provider;
}

const DOMAIN_PATTERN =
  /\b([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+)\b/i;

function isValidDomain(domain: string): boolean {
  const normalized = domain.trim().toLowerCase().replace(/^www\./, '');
  if (!normalized || normalized.includes(' ') || normalized.includes('"')) {
    return false;
  }
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(
    normalized
  );
}

/** Pull a hostname out of URLs, bare domains, or descriptive source labels. */
export function extractResearchSourceDomain(source: string): string | null {
  const trimmed = source.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const hostname = new URL(trimmed).hostname.replace(/^www\./i, '');
      return isValidDomain(hostname) ? hostname.toLowerCase() : null;
    } catch {
      return null;
    }
  }

  const withoutPath = trimmed.split('/')[0]?.replace(/^www\./i, '') ?? '';
  if (isValidDomain(withoutPath)) {
    return withoutPath.toLowerCase();
  }

  const embedded = trimmed.match(DOMAIN_PATTERN);
  if (embedded?.[1] && isValidDomain(embedded[1])) {
    return embedded[1].toLowerCase();
  }

  return null;
}

export type ParsedResearchSource = {
  label: string;
  domain: string | null;
  href: string | null;
};

export function parseResearchSource(source: string): ParsedResearchSource {
  const label = source.trim();
  const domain = extractResearchSourceDomain(label);
  return {
    label,
    domain,
    href: domain ? `https://${domain}` : null,
  };
}

/** @deprecated Prefer `parseResearchSource` so invalid labels are not linked. */
export function researchSourceHref(domain: string): string {
  const parsed = parseResearchSource(domain);
  return parsed.href ?? '#';
}
