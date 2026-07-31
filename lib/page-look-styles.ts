export type PageLookPreset = {
  id: string;
  label: string;
  description: string;
};

export const PAGE_LOOK_PRESETS: readonly PageLookPreset[] = [
  {
    id: 'vibrant',
    label: 'Vibrant',
    description: 'Bold colors, high energy, dynamic compositions',
  },
  {
    id: 'minimalistic',
    label: 'Minimalistic',
    description: 'Clean layouts, generous whitespace, restrained palette',
  },
  {
    id: 'maximalist',
    label: 'Maximalist',
    description: 'Rich layers, ornate detail, sensory abundance',
  },
  {
    id: 'professional',
    label: 'Professional',
    description: 'Polished, credible, structured corporate feel',
  },
  {
    id: 'elegant',
    label: 'Elegant',
    description: 'Refined luxury, soft light, understated sophistication',
  },
  {
    id: 'playful',
    label: 'Playful',
    description: 'Whimsical, fun, bright, approachable energy',
  },
  {
    id: 'bold',
    label: 'Bold',
    description: 'High contrast, dramatic angles, confident impact',
  },
] as const;

export function isPresetPageLook(value: string): boolean {
  const lower = value.trim().toLowerCase();
  return PAGE_LOOK_PRESETS.some(
    (p) => p.id === lower || p.label.toLowerCase() === lower
  );
}
