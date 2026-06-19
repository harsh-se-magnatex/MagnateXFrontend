// EDIT_PHOTO_DISABLED — module preserved for Edit_Photo_V1; not imported on App_Mode.
/** Client-side headline extraction (mirrors shared extract-overlay-headline). */
export function extractOverlayHeadlineFromCaption(caption: string): string {
  let raw = String(caption || '').trim();
  if (!raw) return '';

  raw = raw.split(/\|\s*Website:/i)[0] ?? raw;
  raw = raw.replace(/\bContact:\s*[\d\s+()-]+/gi, '').trim();
  raw = raw.replace(/https?:\/\/\S+/gi, '').trim();

  const firstLine = raw.split(/\n/)[0]?.trim() || raw;
  const sentenceMatch = firstLine.match(/^[^.!?]+[.!?]?/);
  let headline = (sentenceMatch?.[0] ?? firstLine).trim();
  headline = headline.replace(/[.!?]+$/, '').trim();

  const words = headline.split(/\s+/).filter(Boolean);
  if (words.length > 10) {
    headline = words.slice(0, 10).join(' ');
  }

  return headline;
}
