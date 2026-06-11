'use client';

import type { BoostSettings } from '@/src/service/api/analyticService';

/**
 * Renders the platform-aware list of audience / objective / placement
 * fields the user copies into their native Boost dialog. The visible
 * markup intentionally mirrors {@link formatBoostSettingsForClipboard}
 * so what the user sees matches exactly what lands on the clipboard.
 */

function joinList(values: string[]): string {
  return values.length ? values.join(', ') : '—';
}

function genderLabel(gender: 'all' | 'male' | 'female'): string {
  if (gender === 'male') return 'Men';
  if (gender === 'female') return 'Women';
  return 'All';
}

type Row = { label: string; value: string };

function rowsForSettings(settings: BoostSettings): Row[] {
  if (settings.kind === 'meta') {
    return [
      { label: 'Objective', value: settings.objective },
      { label: 'Locations', value: joinList(settings.locations) },
      {
        label: 'Age',
        value: `${settings.ageRange.min}–${settings.ageRange.max}`,
      },
      { label: 'Gender', value: genderLabel(settings.gender) },
      { label: 'Interests', value: joinList(settings.interests) },
      { label: 'Placement', value: settings.placement },
      {
        label: 'Audience expansion',
        value: settings.audienceExpansion ? 'On' : 'Off',
      },
    ];
  }
  return [
    { label: 'Objective', value: settings.objective },
    { label: 'Locations', value: joinList(settings.locations) },
    { label: 'Industries', value: joinList(settings.industries) },
    { label: 'Job functions', value: joinList(settings.jobFunctions) },
    { label: 'Seniorities', value: joinList(settings.seniorities) },
    { label: 'Company size', value: joinList(settings.companySize) },
    {
      label: 'Audience expansion',
      value: settings.audienceExpansion ? 'On' : 'Off',
    },
  ];
}

export function BoostSettingsList({ settings }: { settings: BoostSettings }) {
  const rows = rowsForSettings(settings);
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1.5 text-xs leading-relaxed">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="font-medium text-zinc-700">{row.label}</dt>
          <dd className="text-zinc-900">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Plain-text version of the settings, ready to copy into a native Boost
 * dialog. Kept in this file so the visible list and the clipboard payload
 * can never drift apart.
 */
export function formatBoostSettingsForClipboard(
  settings: BoostSettings,
  budget: { dailyAmount: number; totalAmount: number; durationDays: number },
  currency: string
): string {
  const lines: string[] = [];
  lines.push(`Daily budget: ${currency} ${budget.dailyAmount}`);
  lines.push(`Total budget: ${currency} ${budget.totalAmount}`);
  lines.push(
    `Duration: ${budget.durationDays} day${budget.durationDays === 1 ? '' : 's'}`
  );
  for (const row of rowsForSettings(settings)) {
    lines.push(`${row.label}: ${row.value}`);
  }
  return lines.join('\n');
}
