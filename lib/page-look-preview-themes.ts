/**
 * Visual theme tokens for PageLookPreview (side panel next to preset options).
 * Currently unused — preview UI is commented out in PageLookSelector.
 */
import type { PageLookPreset } from '@/lib/page-look-styles';

export type PageLookPreviewTheme = {
  shellBg: string;
  frameClass: string;
  headerBg: string;
  headerText: string;
  heroBg: string;
  heroAccent: string;
  tileStyles: [string, string, string, string, string, string];
  bioClass: string;
  vibeLine: string;
};

export const PAGE_LOOK_PREVIEW_THEMES: Record<
  PageLookPreset['id'],
  PageLookPreviewTheme
> = {
  vibrant: {
    shellBg: 'from-fuchsia-500/20 via-orange-400/15 to-cyan-400/20',
    frameClass: 'border-fuchsia-300/40 shadow-fuchsia-500/20',
    headerBg: 'bg-gradient-to-r from-fuchsia-600 to-orange-500',
    headerText: 'text-white',
    heroBg: 'bg-gradient-to-br from-fuchsia-100 via-orange-50 to-cyan-100',
    heroAccent: 'bg-gradient-to-r from-fuchsia-500 to-orange-400',
    tileStyles: [
      'bg-gradient-to-br from-fuchsia-400 to-pink-500',
      'bg-gradient-to-br from-orange-400 to-amber-300',
      'bg-gradient-to-br from-cyan-400 to-blue-500',
      'bg-gradient-to-br from-violet-400 to-fuchsia-500',
      'bg-gradient-to-br from-rose-400 to-orange-400',
      'bg-gradient-to-br from-sky-400 to-indigo-400',
    ],
    bioClass: 'text-fuchsia-700 font-semibold',
    vibeLine: 'Energetic colors & dynamic feed',
  },
  minimalistic: {
    shellBg: 'from-slate-200/40 via-white to-slate-100/60',
    frameClass: 'border-slate-200 shadow-slate-300/30',
    headerBg: 'bg-white border-b border-slate-100',
    headerText: 'text-slate-800',
    heroBg: 'bg-white',
    heroAccent: 'bg-slate-900',
    tileStyles: [
      'bg-slate-100 border border-slate-200/80',
      'bg-white border border-slate-200/80',
      'bg-slate-50 border border-slate-200/80',
      'bg-white border border-slate-200/80',
      'bg-slate-100 border border-slate-200/80',
      'bg-slate-50 border border-slate-200/80',
    ],
    bioClass: 'text-slate-500 font-normal tracking-wide',
    vibeLine: 'Clean space & quiet hierarchy',
  },
  maximalist: {
    shellBg: 'from-amber-500/25 via-rose-500/20 to-violet-600/25',
    frameClass: 'border-amber-400/50 shadow-amber-500/25',
    headerBg: 'bg-gradient-to-r from-amber-600 via-rose-600 to-violet-700',
    headerText: 'text-amber-50',
    heroBg: 'bg-gradient-to-br from-amber-50 via-rose-50 to-violet-100',
    heroAccent: 'bg-gradient-to-r from-amber-500 via-rose-500 to-violet-600',
    tileStyles: [
      'bg-gradient-to-br from-amber-400 to-rose-500 ring-2 ring-amber-200/60',
      'bg-gradient-to-br from-rose-500 to-violet-600 ring-2 ring-rose-200/60',
      'bg-gradient-to-br from-violet-500 to-indigo-600 ring-2 ring-violet-200/60',
      'bg-gradient-to-br from-orange-400 to-pink-500 ring-2 ring-orange-200/60',
      'bg-gradient-to-br from-fuchsia-500 to-purple-600 ring-2 ring-fuchsia-200/60',
      'bg-gradient-to-br from-red-400 to-amber-500 ring-2 ring-red-200/60',
    ],
    bioClass: 'text-rose-700 font-bold',
    vibeLine: 'Layered richness & bold detail',
  },
  professional: {
    shellBg: 'from-slate-400/15 via-blue-100/30 to-slate-200/40',
    frameClass: 'border-slate-300 shadow-slate-400/25',
    headerBg: 'bg-slate-800',
    headerText: 'text-slate-100',
    heroBg: 'bg-slate-50',
    heroAccent: 'bg-slate-700',
    tileStyles: [
      'bg-slate-200',
      'bg-slate-300',
      'bg-blue-200',
      'bg-slate-200',
      'bg-slate-300',
      'bg-blue-100',
    ],
    bioClass: 'text-slate-600 font-medium',
    vibeLine: 'Polished & credible layout',
  },
  elegant: {
    shellBg: 'from-stone-300/30 via-amber-50/50 to-stone-200/40',
    frameClass: 'border-stone-300/60 shadow-stone-400/20',
    headerBg: 'bg-stone-100 border-b border-stone-200',
    headerText: 'text-stone-700',
    heroBg: 'bg-gradient-to-b from-stone-50 to-amber-50/40',
    heroAccent: 'bg-gradient-to-r from-stone-600 to-amber-700',
    tileStyles: [
      'bg-gradient-to-br from-stone-200 to-amber-100',
      'bg-gradient-to-br from-amber-100 to-stone-100',
      'bg-gradient-to-br from-stone-100 to-rose-100',
      'bg-gradient-to-br from-amber-50 to-stone-200',
      'bg-gradient-to-br from-stone-200 to-amber-50',
      'bg-gradient-to-br from-rose-100 to-stone-100',
    ],
    bioClass: 'text-stone-600 font-light italic',
    vibeLine: 'Soft luxury & refined tone',
  },
  playful: {
    shellBg: 'from-yellow-300/30 via-pink-300/25 to-lime-300/30',
    frameClass: 'border-yellow-300/50 shadow-yellow-400/25',
    headerBg: 'bg-gradient-to-r from-yellow-400 via-pink-400 to-lime-400',
    headerText: 'text-white drop-shadow-sm',
    heroBg: 'bg-gradient-to-br from-yellow-50 via-pink-50 to-lime-50',
    heroAccent: 'bg-gradient-to-r from-yellow-400 to-pink-400',
    tileStyles: [
      'bg-yellow-300 rounded-2xl',
      'bg-pink-300 rounded-2xl',
      'bg-lime-300 rounded-2xl',
      'bg-sky-300 rounded-2xl',
      'bg-orange-300 rounded-2xl',
      'bg-violet-300 rounded-2xl',
    ],
    bioClass: 'text-pink-600 font-semibold',
    vibeLine: 'Fun, bright & approachable',
  },
  bold: {
    shellBg: 'from-black/20 via-red-500/15 to-black/25',
    frameClass: 'border-red-500/40 shadow-red-900/30',
    headerBg: 'bg-black',
    headerText: 'text-white',
    heroBg: 'bg-neutral-950',
    heroAccent: 'bg-red-600',
    tileStyles: [
      'bg-red-600',
      'bg-black border border-red-600/50',
      'bg-red-700',
      'bg-neutral-900 border-2 border-red-500',
      'bg-red-600',
      'bg-black border border-white/10',
    ],
    bioClass: 'text-red-400 font-black uppercase tracking-wider text-[10px]',
    vibeLine: 'High contrast & strong impact',
  },
};

export const CUSTOM_PAGE_LOOK_PREVIEW: PageLookPreviewTheme = {
  shellBg: 'from-indigo-400/20 via-violet-400/15 to-cyan-400/20',
  frameClass: 'border-indigo-300/40 shadow-indigo-500/20',
  headerBg: 'bg-gradient-to-r from-indigo-600 to-violet-600',
  headerText: 'text-white',
  heroBg: 'bg-gradient-to-br from-indigo-50 to-violet-50',
  heroAccent: 'bg-gradient-to-r from-indigo-500 to-violet-500',
  tileStyles: [
    'bg-gradient-to-br from-indigo-400 to-violet-500',
    'bg-gradient-to-br from-violet-400 to-purple-500',
    'bg-gradient-to-br from-cyan-400 to-indigo-400',
    'bg-gradient-to-br from-indigo-300 to-blue-400',
    'bg-gradient-to-br from-purple-400 to-indigo-500',
    'bg-gradient-to-br from-blue-400 to-violet-400',
  ],
  bioClass: 'text-indigo-700 font-medium',
  vibeLine: 'Your custom visual direction',
};
