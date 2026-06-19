// EDIT_PHOTO_DISABLED — module preserved for Edit_Photo_V1; not imported on App_Mode.
const GOOGLE_FONT_FAMILIES = [
  'Playfair Display',
  'Inter',
  'Oswald',
  'Cormorant Garamond',
  'JetBrains Mono',
  'Lobster',
  'Fredoka',
  'Cinzel',
  'Pinyon Script',
];

export function collectFontsFromDesign(
  design: { objects: Array<{ type?: string; fontFamily?: string }> } | undefined
): string[] {
  const set = new Set<string>();
  for (const obj of design?.objects ?? []) {
    if (obj.type === 'textbox' && obj.fontFamily) set.add(obj.fontFamily);
  }
  return [...set];
}

export async function loadGoogleFonts(families: string[]): Promise<void> {
  const toLoad = families.filter((f) => GOOGLE_FONT_FAMILIES.includes(f));
  if (!toLoad.length) return;

  const familyParam = toLoad
    .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;700;900`)
    .join('&');

  const href = `https://fonts.googleapis.com/css2?${familyParam}&display=swap`;

  if (typeof document === 'undefined') return;

  const existing = document.querySelector(`link[data-creative-fonts="1"]`);
  if (existing) return;

  await new Promise<void>((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.creativeFonts = '1';
    link.onload = () => resolve();
    link.onerror = () => reject(new Error('Failed to load Google Fonts'));
    document.head.appendChild(link);
  });
}
