'use client';

import { PageLoadingState } from '@/components/shared/PageLoadingState';
import {
  getSocialTemplateDna,
  regenerateSocialTemplateDna,
  type SocialTemplateDna,
  type SocialTemplateDnaPlaybook,
} from '@/src/service/api/userService';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Fingerprint,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/show-error-toast';

function isOk(res: { success?: boolean }): boolean {
  return res?.success === true;
}

function statusLabel(status: SocialTemplateDna['status'] | undefined): string {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'generating':
      return 'Generating…';
    case 'pending_memory':
      return 'Waiting for Business Data';
    case 'failed':
      return 'Failed';
    default:
      return 'Not generated yet';
  }
}

function PlaybookBlock({
  title,
  playbook,
}: {
  title: string;
  playbook?: SocialTemplateDnaPlaybook;
}) {
  if (!playbook) return null;
  const hasContent =
    (playbook.formats?.length ?? 0) > 0 ||
    (playbook.hooks?.length ?? 0) > 0 ||
    !!playbook.ctaStyle?.trim();
  if (!hasContent) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="text-sm font-semibold text-slate-900 mb-2">{title}</h4>
      {playbook.formats?.length ? (
        <p className="text-xs text-slate-600 mb-1">
          <span className="font-medium text-slate-800">Formats:</span>{' '}
          {playbook.formats.join(', ')}
        </p>
      ) : null}
      {playbook.hooks?.length ? (
        <p className="text-xs text-slate-600 mb-1">
          <span className="font-medium text-slate-800">Hooks:</span>{' '}
          {playbook.hooks.join(', ')}
        </p>
      ) : null}
      {playbook.ctaStyle?.trim() ? (
        <p className="text-xs text-slate-600">
          <span className="font-medium text-slate-800">CTA:</span>{' '}
          {playbook.ctaStyle}
        </p>
      ) : null}
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900 mb-2">{title}</h3>
      <ul className="list-disc pl-5 space-y-1">
        {items.map((item) => (
          <li key={item} className="text-sm text-slate-600">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SocialTemplateDnaPage() {
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [dna, setDna] = useState<SocialTemplateDna | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await getSocialTemplateDna();
      if (!isOk(res as { success?: boolean })) {
        throw new Error('Failed to load');
      }
      const raw = (res as { data?: { socialTemplateDna?: SocialTemplateDna | null } })
        .data?.socialTemplateDna;
      setDna(raw ?? null);
    } catch {
      showErrorToast('Failed to load Social DNA');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (dna?.status !== 'generating') return;
    const t = setInterval(() => {
      void load();
    }, 4000);
    return () => clearInterval(t);
  }, [dna?.status, load]);

  const onRegenerate = async () => {
    try {
      setRegenerating(true);
      const res = await regenerateSocialTemplateDna({ force: true });
      if (!isOk(res as { success?: boolean })) {
        throw new Error('Failed to queue');
      }
      toast.success('Social DNA regeneration queued');
      const raw = (res as { data?: { socialTemplateDna?: SocialTemplateDna | null } })
        .data?.socialTemplateDna;
      if (raw) setDna(raw);
      else await load();
    } catch {
      showErrorToast('Failed to regenerate Social DNA');
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) return <PageLoadingState />;

  const ready = dna?.status === 'ready';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/template-dna"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Brand DNA
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-600 text-white">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Social DNA</h1>
              <p className="text-sm text-slate-500">
                AI strategy for improving your social page — built after Business
                Data is complete.
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void onRegenerate()}
          disabled={regenerating || dna?.status === 'generating'}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
        >
          {regenerating || dna?.status === 'generating' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Regenerate
        </button>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-linear-to-b from-white to-slate-50 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-semibold text-slate-900">Status</span>
          </div>
          <span className="text-xs font-medium rounded-full bg-slate-100 px-3 py-1 text-slate-700">
            {statusLabel(dna?.status)}
          </span>
        </div>

        {dna?.status === 'pending_memory' || !dna ? (
          <p className="text-sm text-slate-600">
            Complete{' '}
            <Link
              href="/template-dna/business-data"
              className="text-indigo-600 font-medium hover:underline"
            >
              Business Data
            </Link>{' '}
            to generate your Social DNA. If you skipped it during onboarding, fill
            it anytime — generation starts automatically.
          </p>
        ) : null}

        {dna?.status === 'failed' ? (
          <p className="text-sm text-red-600">
            {dna.error?.trim() || 'Generation failed. Try regenerate.'}
          </p>
        ) : null}

        {dna?.status === 'generating' ? (
          <p className="text-sm text-slate-600 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Building your social-page strategy from Brand DNA + Business Data…
          </p>
        ) : null}

        {ready ? (
          <div className="space-y-6 mt-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">
                Posting voice
              </h3>
              <p className="text-sm text-slate-600">{dna.postingVoice}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">
                Visual direction
              </h3>
              <p className="text-sm text-slate-600">{dna.visualDirection}</p>
            </div>
            <ListBlock title="Content pillars" items={dna.contentPillars} />
            <ListBlock
              title="Improvement priorities"
              items={dna.improvementPriorities}
            />
            <ListBlock title="Do not" items={dna.doNotDo} />
            <ListBlock title="Caption patterns" items={dna.captionPatterns} />
            {dna.hashtagStrategy ? (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Hashtag strategy
                </h3>
                <p className="text-sm text-slate-600">{dna.hashtagStrategy}</p>
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-3">
              <PlaybookBlock
                title="Instagram"
                playbook={dna.platformPlaybooks?.instagram}
              />
              <PlaybookBlock
                title="Facebook"
                playbook={dna.platformPlaybooks?.facebook}
              />
              <PlaybookBlock
                title="LinkedIn"
                playbook={dna.platformPlaybooks?.linkedin}
              />
            </div>
            {dna.generatedAt ? (
              <p className="text-xs text-slate-400">
                Generated {new Date(dna.generatedAt).toLocaleString()}
              </p>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
