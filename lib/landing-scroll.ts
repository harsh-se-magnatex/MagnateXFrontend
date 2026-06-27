export const FRAME_PHASE = 0.85;

export function pageScroll01(): number {
  const el = document.documentElement;
  const body = document.body;
  const sh = Math.max(el.scrollHeight, body.scrollHeight, el.offsetHeight);
  const vh = window.innerHeight;
  const maxScroll = Math.max(sh - vh, 1);
  const y = window.scrollY;
  return Math.min(Math.max(y / maxScroll, 0), 1);
}

export function getFrameScrubT(): number {
  const p = pageScroll01();
  if (p <= FRAME_PHASE) return p / FRAME_PHASE;
  return 1;
}

/** Opacity for a callout visible between scrollStart and scrollEnd (0–1 page progress). */
export function calloutOpacity(
  progress: number,
  start: number,
  end: number,
  fade = 0.035
): number {
  if (progress < start - fade) return 0;
  if (progress < start) return (progress - (start - fade)) / fade;
  if (progress <= end) return 1;
  if (progress < end + fade) return 1 - (progress - end) / fade;
  return 0;
}
