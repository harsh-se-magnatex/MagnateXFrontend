'use client';

import { useState, useSyncExternalStore } from 'react';
import { Box, Handshake, Monitor, LockKeyhole, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { readStoredConsent } from '@/lib/cookie-consent';
import { businessLabels, type BusinessType } from './types';

const choices = [
  {
    type: 'digital_product',
    icon: Monitor,
    description: 'Software, SaaS, apps, or downloadable products.',
  },
  {
    type: 'physical_product',
    icon: Box,
    description: 'Tangible goods that your customers buy and use.',
  },
  {
    type: 'service',
    icon: Handshake,
    description: 'Expertise, client work, consultations, or appointments.',
  },
] as const;

function subscribeToConsent(notify: () => void) {
  window.addEventListener('cookieConsentUpdated', notify);
  window.addEventListener('storage', notify);
  return () => {
    window.removeEventListener('cookieConsentUpdated', notify);
    window.removeEventListener('storage', notify);
  };
}
const hasConsent = () => readStoredConsent() !== null;
const noServerConsent = () => false;

export function BusinessSelectionDialog({
  onSelect,
}: {
  onSelect: (type: BusinessType) => Promise<void>;
}) {
  const [selected, setSelected] = useState<BusinessType | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Let the existing cookie gate finish before opening another focus-trapping dialog.
  const consentReady = useSyncExternalStore(
    subscribeToConsent,
    hasConsent,
    noServerConsent
  );

  async function save() {
    if (!selected || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSelect(selected);
    } catch {
      setError(
        'We could not save your choice. Please try again. If it was saved in another tab, refresh this page.'
      );
    } finally {
      setSaving(false);
    }
  }

  if (!consentReady) return null;

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-xl max-h-[90dvh] overflow-y-auto p-6 sm:p-8"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
            Your business
          </p>
          <DialogTitle className="text-2xl font-semibold">
            What does your business offer?
          </DialogTitle>
          <DialogDescription>
            Choose your primary business type so we can tailor your workspace
            and content.
          </DialogDescription>
        </DialogHeader>
        <fieldset disabled={saving} className="space-y-3">
          <legend className="sr-only">Business type</legend>
          {choices.map(({ type, icon: Icon, description }) => (
            <label
              key={type}
              className={cn(
                'flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-primary-purple',
                selected === type
                  ? 'border-primary-purple bg-primary-purple/10'
                  : 'border-default hover:bg-subtle',
                saving && 'opacity-70'
              )}
            >
              <input
                type="radio"
                name="business-type"
                value={type}
                checked={selected === type}
                onChange={() => setSelected(type)}
                className="size-4 accent-[var(--primary-purple)]"
              />
              <Icon
                aria-hidden="true"
                className="size-6 shrink-0 text-secondary"
              />
              <span>
                <span className="block font-semibold text-default">
                  {businessLabels[type]}
                </span>
                <span className="mt-1 block text-sm text-secondary">
                  {description}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        <p className="flex items-start gap-2 rounded-xl bg-subtle p-3 text-sm text-secondary">
          <LockKeyhole aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          This choice is permanent and cannot be changed after you continue.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          disabled={!selected || saving}
          onClick={save}
          className="w-full"
        >
          {saving && (
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          )}
          {saving ? 'Saving your choice…' : 'Save and continue'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
