'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { CheckCircle2, ImagePlus, Loader2, RefreshCw } from 'lucide-react';
import { showErrorToast } from '@/lib/show-error-toast';
import { TemplateDnaReferenceSetup } from './TemplateDnaReferenceSetup';
import {
  createDnaLibraryBatch,
  editDnaLibraryEntry,
  getDnaLibrary,
  getDnaLibraryPreview,
  retryDnaLibraryEntry,
  updateDnaLibrary,
  templateDnaErrorMessage,
  type TemplateDnaLibrary as Library,
  type TemplateDnaLibraryEntry
} from '@/src/service/api/template-dna.service';

function DnaCard({
  entry,
  active,
  busy,
  onEdit,
  onRetry
}: {
  entry: TemplateDnaLibraryEntry;
  active: boolean;
  busy: boolean;
  onEdit: (
    entry: TemplateDnaLibraryEntry,
    change: { displayName?: string; enabled?: boolean }
  ) => void;
  onRetry: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [name, setName] = useState(entry.displayName);
  const [previewError, setPreviewError] = useState(false);
  useEffect(() => {
    let disposed = false;
    let objectUrl: string | undefined;
    void getDnaLibraryPreview(entry.dnaId)
      .then((blob) => {
        if (!disposed) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      })
      .catch(() => {
        if (!disposed) setPreviewError(true);
      });
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [entry.dnaId]);
  const ready = entry.status === 'ready';
  return (
    <article className="overflow-hidden rounded-xl border border-default bg-card">
      <div className="flex aspect-square items-center justify-center bg-element">
        {url ? (
          <Image
            src={url}
            unoptimized
            width={480}
            height={480}
            alt={`Source reference for ${entry.displayName}`}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-xs text-secondary">
            {previewError ? 'Preview unavailable' : 'Loading reference…'}
          </span>
        )}
      </div>
      <div className="space-y-3 p-4">
        <label className="block text-xs font-medium text-secondary">
          Design name
          <input
            aria-label={`Name for ${entry.displayName}`}
            value={name}
            maxLength={80}
            disabled={busy || !active || !ready}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-default bg-element px-2 py-2 text-sm text-default"
          />
        </label>
        {name.trim() && name.trim() !== entry.displayName && (
          <button
            disabled={busy || !active || !ready}
            onClick={() => onEdit(entry, { displayName: name.trim() })}
            className="text-xs font-semibold text-primary-purple"
          >
            Save name
          </button>
        )}
        <p className="flex items-center gap-1 text-xs text-secondary">
          {entry.status === 'extracting' ? (
            <Loader2 className="size-3 animate-spin" />
          ) : ready ? (
            <CheckCircle2 className="size-3 text-emerald-600" />
          ) : null}
          {entry.status.replaceAll('_', ' ')} ·{' '}
          {active ? `Revision ${entry.revision}` : 'Pending library'}
        </p>
        {entry.preview && (
          <dl className="space-y-1 text-xs">
            {Object.entries(entry.preview.fields).map(([key, value]) => (
              <div key={key}>
                <dt className="inline text-secondary">
                  {key === 'fontColor'
                    ? 'Font color'
                    : key === 'fontSize'
                      ? 'Font size'
                      : key === 'font'
                        ? 'Font'
                        : 'Style'}
                  :{' '}
                </dt>
                <dd className="inline break-words text-default">{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {entry.selectionMetadata && (
          <p className="text-xs text-secondary">
            {entry.selectionMetadata.layoutFamily.replaceAll('_', ' ')}
          </p>
        )}
        {entry.lastError && (
          <p role="alert" className="text-xs text-red-600">
            {entry.lastError}
          </p>
        )}
        {entry.status === 'failed' && (
          <button
            disabled={busy}
            onClick={onRetry}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-purple"
          >
            <RefreshCw className="size-3" />
            Retry this reference
          </button>
        )}
        {active && ready && (
          <div className="flex flex-wrap gap-3">
            <button
              disabled={busy}
              onClick={() => onEdit(entry, { enabled: !entry.enabled })}
              className="text-xs font-semibold text-default"
            >
              {entry.enabled ? 'Disable' : 'Enable'}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export function TemplateDnaLibrary() {
  const [library, setLibrary] = useState<Library | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    let disposed = false;
    void getDnaLibrary()
      .then((value) => {
        if (!disposed) setLibrary(value);
      })
      .catch(() => {
        if (!disposed) setLoadError(true);
      });
    return () => {
      disposed = true;
    };
  }, []);
  useEffect(() => {
    if (!library?.entries.some((e) => e.status === 'extracting')) return;
    let disposed = false;
    const timer = window.setInterval(() => {
      void getDnaLibrary()
        .then((value) => {
          if (!disposed) setLibrary(value);
        })
        .catch(() => undefined);
    }, 3000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [library?.entries]);
  async function run(action: () => Promise<Library>) {
    setBusy(true);
    try {
      setLibrary(await action());
    } catch (error) {
      showErrorToast(
        templateDnaErrorMessage(error, 'Could not update the DNA library.')
      );
      // A timed-out batch request may already have persisted its entries.
      void getDnaLibrary()
        .then(setLibrary)
        .catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }
  if (!library)
    return (
      <p className="text-sm text-secondary">
        {loadError
          ? 'Could not load the design library. Refresh to try again.'
          : 'Loading design library…'}
      </p>
    );
  if (!library.available) return <TemplateDnaReferenceSetup />;
  const active = library.entries.filter((e) =>
    library.manifest.activeDnaIds.includes(e.dnaId)
  );
  const pending = library.entries.filter(
    (e) => e.libraryGenerationId === library.manifest.pendingGenerationId
  );
  return (
    <section className="space-y-5 rounded-2xl border border-default bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-default">
            Your design library
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-secondary">
            Each reference becomes its own design. AI chooses the best design
            for each post and interprets any images you provide. A replacement
            library becomes active when every reference is ready.
          </p>
        </div>
        {active.length > 0 && (
          <button
            disabled={busy}
            onClick={() =>
              void run(() =>
                updateDnaLibrary({ enabled: !library.manifest.enabled })
              )
            }
            className="rounded-lg border border-default px-3 py-2 text-xs font-semibold text-default"
          >
            {library.manifest.enabled ? 'Pause library' : 'Use library'}
          </button>
        )}
      </div>
      {active.length > 0 && (
        <div>
          <p className="mb-3 text-xs text-secondary">
            {active.length} active designs ·{' '}
            {library.manifest.enabled ? 'In use' : 'Paused'}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((entry) => (
              <DnaCard
                key={`${entry.dnaId}:${entry.revision}`}
                entry={entry}
                active
                busy={busy}
                onEdit={(e, change) =>
                  void run(() => editDnaLibraryEntry(e, change))
                }
                onRetry={() =>
                  void run(() => retryDnaLibraryEntry(entry.dnaId))
                }
              />
            ))}
          </div>
        </div>
      )}
      {library.pendingBatch && (
        <div aria-live="polite">
          <h3 className="mb-2 text-sm font-semibold text-default">
            Preparing library · {library.pendingBatch.readyCount} of{' '}
            {library.pendingBatch.expectedCount} ready
          </h3>
          <p className="mb-3 text-xs text-secondary">
            {library.pendingBatch.failedCount
              ? `${library.pendingBatch.failedCount} failed. Retry those references below.`
              : 'References are analyzed independently.'}
            {active.length ? ' Your active library remains available.' : ''}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((entry) => (
              <DnaCard
                key={`${entry.dnaId}:${entry.revision}`}
                entry={entry}
                active={false}
                busy={busy}
                onEdit={() => undefined}
                onRetry={() =>
                  void run(() => retryDnaLibraryEntry(entry.dnaId))
                }
              />
            ))}
          </div>
        </div>
      )}
      <div className="space-y-3 border-t border-default pt-4">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-primary-purple/40 px-3 py-2 text-xs font-semibold text-primary-purple">
          <ImagePlus className="size-4" />
          Select 1–8 reference posts
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            className="sr-only"
            onChange={(event) => {
              const selected = Array.from(event.target.files ?? []);
              event.target.value = '';
              if (
                selected.length > 8 ||
                selected.some(
                  (f) =>
                    f.size > 10 * 1024 * 1024 ||
                    !['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
                )
              ) {
                showErrorToast(
                  'Use up to 8 JPEG, PNG or WebP images, no larger than 10 MB each.'
                );
                return;
              }
              setFiles(selected);
            }}
          />
        </label>
        {files.length > 0 && (
          <p className="text-xs text-secondary">
            {files.map((f) => f.name).join(', ')}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            disabled={busy || !files.length}
            onClick={() =>
              void run(async () => {
                const result = await createDnaLibraryBatch(files);
                setFiles([]);
                return result;
              })
            }
            className="rounded-xl btn-brand-fill px-3 py-2 text-xs font-semibold disabled:opacity-40"
          >
            {busy
              ? 'Saving…'
              : active.length
                ? 'Create replacement library'
                : 'Create design library'}
          </button>
          {!active.length && !library.pendingBatch && (
            <button
              disabled={busy}
              onClick={() => void run(() => createDnaLibraryBatch())}
              className="rounded-xl border border-default px-3 py-2 text-xs font-semibold text-default"
            >
              Extract from saved references
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
