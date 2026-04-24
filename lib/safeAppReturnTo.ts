/**
 * Prevents open redirects: only same-origin app paths, not protocol-relative or absolute URLs.
 */
export function getSafeAppReturnTo(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    if (!decoded.startsWith('/') || decoded.startsWith('//')) return null;
    if (decoded.includes('://')) return null;
    return decoded;
  } catch {
    return null;
  }
}
