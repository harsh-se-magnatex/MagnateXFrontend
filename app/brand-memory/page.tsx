'use client';

import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { showCaughtErrorToast, showErrorToast } from '@/lib/show-error-toast';
import { cn } from '@/lib/utils';
import { normalizeMemoryLayerUploadImage } from '@/lib/normalize-memory-layer-image';
import {
  BRAND_PHOTO_DESCRIPTION_MAX,
  generateMemoryLayerQuestions,
  getMemoryLayer,
  putMemoryLayer,
  putMemoryLayerBrandPhotoDescription,
  uploadMemoryLayerBrandPhotos,
  uploadMemoryLayerSourcePdf,
  type MemoryLayerAnswerPayload,
} from '@/src/service/api/userService';
import { useTourState } from '@/src/stores/tourState';

const MAX_MEMORY_LAYER_PDF_BYTES = 50 * 1024 * 1024;

type Question = {
  id: string;
  prompt: string;
  type: 'text' | 'textarea' | 'multiselect';
  options?: string[];
  /** Two AI sample answers for text/textarea (click to fill). */
  suggestions?: string[];
  multiselectRole?: 'products';
};

type MemoryPayload = {
  status?: string;
  questions?: Question[];
  answers?: MemoryLayerAnswerPayload[];
  brandPhotos?: { url: string; path?: string; description?: string }[];
};

type DraftRow =
  | { skipped: true }
  | { skipped: false; text?: string }
  | { skipped: false; multi: string[] };

function isEnvelopeOk(res: { success?: boolean } | undefined): boolean {
  return res?.success === true;
}

function parseMemory(data: unknown): MemoryPayload | null {
  if (!data || typeof data !== 'object') return null;
  return data as MemoryPayload;
}

/** Browsers sometimes report an empty MIME type for valid images (e.g. Linux, some exports). */
function isImageFile(f: File): boolean {
  if (f.type.startsWith('image/')) return true;
  if (f.type !== '') return false;
  const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
  return [
    'jpg',
    'jpeg',
    'png',
    'webp',
    'gif',
    'bmp',
    'heic',
    'heif',
    'avif',
    'svg',
  ].includes(ext);
}

export default function BrandMemoryPage() {
  const router = useRouter();
  const pdfInputId = useId();
  const goHomeWithPlatformTour = useCallback(() => {
    useTourState.getState().queuePlatformTour();
    router.replace('/home');
  }, [router]);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [phase, setPhase] = useState<'qa' | 'photos'>('qa');
  const [qIndex, setQIndex] = useState(0);
  const [draft, setDraft] = useState<Record<string, DraftRow>>({});
  const [customTag, setCustomTag] = useState('');
  const [brandPhotosMeta, setBrandPhotosMeta] = useState<
    { url: string; path?: string; description?: string }[]
  >([]);
  const [serverDescDrafts, setServerDescDrafts] = useState<
    Record<string, string>
  >({});
  const [pendingStaged, setPendingStaged] = useState<
    {
      id: string;
      file: File;
      previewUrl: string;
      description: string;
      uploading?: boolean;
      failed?: boolean;
    }[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pendingPdf, setPendingPdf] = useState<File | null>(null);
  const pendingRef = useRef(pendingStaged);
  pendingRef.current = pendingStaged;
  const brandPhotosMetaRef = useRef(brandPhotosMeta);
  brandPhotosMetaRef.current = brandPhotosMeta;
  /** Sync lock — React state alone is too late to block rapid mobile taps. */
  const finishInFlightRef = useRef(false);
  const isExtracting = uploadingPdf;

  useEffect(() => {
    return () => {
      for (const p of pendingRef.current) {
        try {
          URL.revokeObjectURL(p.previewUrl);
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMemoryLayer();
      if (!isEnvelopeOk(res as { success?: boolean })) {
        throw new Error('Failed to load Business Data');
      }
      const raw = (res as { data?: { memoryLayer?: unknown } }).data
        ?.memoryLayer;
      const ml = parseMemory(raw);
      if (ml?.status === 'complete' || ml?.status === 'skipped') {
        useTourState.getState().queuePlatformTour();
        router.replace('/home');
        return;
      }
      if (!ml?.questions?.length) {
        const gen = await generateMemoryLayerQuestions();
        if (!isEnvelopeOk(gen as { success?: boolean })) {
          throw new Error('Failed to generate questions');
        }
        const gPayload = parseMemory(
          (gen as { data?: { memoryLayer?: unknown } }).data?.memoryLayer
        );
        setQuestions(gPayload?.questions ?? []);
        setBrandPhotosMeta(
          Array.isArray(gPayload?.brandPhotos) ? gPayload.brandPhotos : []
        );
      } else {
        setQuestions(ml.questions);
        setBrandPhotosMeta(ml.brandPhotos ?? []);
      }
    } catch (e) {
      showErrorToast('Something went wrong. Please Try Again Later.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const m: Record<string, string> = {};
    for (const p of brandPhotosMeta) {
      if (p.path) m[p.path] = p.description ?? '';
    }
    setServerDescDrafts(m);
  }, [brandPhotosMeta]);

  const current = questions[qIndex];

  useEffect(() => {
    setCustomTag('');
  }, [qIndex, current?.id]);

  const slotsAfterPending = 30 - brandPhotosMeta.length - pendingStaged.length;
  const remainingPhotoSlots = Math.max(0, slotsAfterPending);

  const rowFor = useCallback(
    (q: Question): DraftRow => {
      const existing = draft[q.id];
      if (existing) return existing;
      if (q.type === 'multiselect') {
        return { skipped: false, multi: [] };
      }
      return { skipped: false, text: '' };
    },
    [draft]
  );

  const setRow = useCallback((qid: string, row: DraftRow) => {
    setDraft((prev) => ({ ...prev, [qid]: row }));
  }, []);

  const customTagRef = useRef(customTag);
  customTagRef.current = customTag;

  const toggleMulti = useCallback((q: Question, option: string) => {
    setDraft((prev) => {
      const existing = prev[q.id];
      const cur =
        existing && !existing.skipped && 'multi' in existing
          ? [...existing.multi]
          : [];
      const i = cur.indexOf(option);
      if (i === -1) cur.push(option);
      else cur.splice(i, 1);
      return { ...prev, [q.id]: { skipped: false, multi: cur } };
    });
  }, []);

  /** Suggestion chip → put that label in the input (does not toggle selection). */
  const fillInputFromSuggestion = useCallback((option: string) => {
    setCustomTag(option);
  }, []);

  const addCustomProduct = useCallback((q: Question) => {
    const t = customTagRef.current.trim();
    if (!t) return false;

    const parts = t
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length === 0) return false;

    setQuestions((prev) =>
      prev.map((item) => {
        if (item.id !== q.id) return item;
        const opts = [...(item.options ?? [])];
        for (const part of parts) {
          if (!opts.some((o) => o.toLowerCase() === part.toLowerCase())) {
            opts.push(part);
          }
        }
        return { ...item, options: opts };
      })
    );

    setDraft((prev) => {
      const row = prev[q.id];
      const cur = row && !row.skipped && 'multi' in row ? [...row.multi] : [];
      for (const part of parts) {
        if (!cur.some((x) => x.toLowerCase() === part.toLowerCase())) {
          cur.push(part);
        }
      }
      return { ...prev, [q.id]: { skipped: false, multi: cur } };
    });
    setCustomTag('');
    return true;
  }, []);

  const buildAnswers = useCallback((): MemoryLayerAnswerPayload[] => {
    return questions.map((q) => {
      const r = rowFor(q);
      if (r.skipped) return { questionId: q.id, skipped: true };
      if (q.type === 'multiselect' && 'multi' in r) {
        return {
          questionId: q.id,
          skipped: false,
          value: r.multi,
        };
      }
      const text = r.skipped === false && 'text' in r ? (r.text ?? '') : '';
      return { questionId: q.id, skipped: false, value: text };
    });
  }, [questions, rowFor]);

  useEffect(() => {
    if (loading || questions.length === 0) return;
    const { doneTours, requestTour } = useTourState.getState();
    if (!doneTours['brand-memory']) {
      requestTour({ tour: 'brand-memory', startIndex: 0 });
    }
  }, [loading, questions.length]);

  const skipEntire = useCallback(async () => {
    try {
      setSubmitting(true);
      const res = await putMemoryLayer({ status: 'skipped' });
      if (!isEnvelopeOk(res as { success?: boolean })) {
        throw new Error('Failed to skip');
      }
      goHomeWithPlatformTour();
    } catch (e) {
      showErrorToast('Failed to skip. Please Try Again Later.');
    } finally {
      setSubmitting(false);
    }
  }, [goHomeWithPlatformTour]);

  const skipQuestion = useCallback(() => {
    if (!current) return;
    setRow(current.id, { skipped: true });
    if (qIndex < questions.length - 1) setQIndex((i) => i + 1);
    else setPhase('photos');
  }, [current, qIndex, questions.length, setRow]);

  const goNext = useCallback(() => {
    if (!current) return;
    if (qIndex < questions.length - 1) setQIndex((i) => i + 1);
    else setPhase('photos');
  }, [current, qIndex, questions.length]);

  const goBack = useCallback(() => {
    if (phase === 'photos') {
      setPhase('qa');
      setQIndex(questions.length - 1);
      return;
    }
    setQIndex((i) => Math.max(0, i - 1));
  }, [phase, questions.length]);

  const onFilesPicked = useCallback((list: FileList | null) => {
    if (!list?.length) return;
    void (async () => {
      const brandPhotos = brandPhotosMetaRef.current;
      const incoming = Array.from(list);
      const staged: {
        id: string;
        file: File;
        previewUrl: string;
        description: string;
      }[] = [];

      for (const f of incoming) {
        if (!isImageFile(f)) {
          showErrorToast(`${f.name} is not an image`);
          continue;
        }
        try {
          const normalized = await normalizeMemoryLayerUploadImage(f);
          staged.push({
            id: `${normalized.name}-${normalized.size}-${normalized.lastModified}-${Math.random().toString(36).slice(2)}`,
            file: normalized,
            previewUrl: URL.createObjectURL(normalized),
            description: '',
          });
        } catch (err) {
          showCaughtErrorToast(
            err,
            `${f.name} could not be prepared for upload`
          );
        }
      }

      if (staged.length === 0) return;

      setPendingStaged((prev) => {
        const maxTotal = 30 - brandPhotos.length;
        const room = Math.max(0, maxTotal - prev.length);
        if (room === 0) {
          for (const item of staged) {
            URL.revokeObjectURL(item.previewUrl);
          }
          toast.message('30 image limit reached');
          return prev;
        }
        const accepted = staged.slice(0, room);
        for (const item of staged.slice(room)) {
          URL.revokeObjectURL(item.previewUrl);
        }
        if (staged.length > room) {
          toast.message('30 image limit reached');
        }
        return [...prev, ...accepted];
      });
    })();
  }, []);

  const handleUploadPdf = async () => {
    if (!pendingPdf) {
      toast.message('Choose a PDF first');
      return;
    }
    if (pendingPdf.size > MAX_MEMORY_LAYER_PDF_BYTES) {
      showErrorToast('PDF must be 50MB or smaller');
      return;
    }
    try {
      setUploadingPdf(true);
      const res = await uploadMemoryLayerSourcePdf(pendingPdf);
      if (!isEnvelopeOk(res as { success?: boolean })) {
        throw new Error('PDF upload failed');
      }
      const data = (
        res as {
          data?: { memoryLayer?: unknown; sourceDocumentId?: string };
        }
      ).data;
      if (data?.memoryLayer) {
        const ml = parseMemory(data.memoryLayer);
        if (ml?.brandPhotos) setBrandPhotosMeta(ml.brandPhotos);
      }
      setPendingPdf(null);
      toast.success('PDF uploaded');
    } catch (e) {
      showCaughtErrorToast(e, 'PDF upload failed');
    } finally {
      setUploadingPdf(false);
    }
  };

  const removePending = useCallback((id: string) => {
    setPendingStaged((prev) => {
      const hit = prev.find((p) => p.id === id);
      if (hit) {
        try {
          URL.revokeObjectURL(hit.previewUrl);
        } catch {
          /* ignore */
        }
      }
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const flushServerImageDescription = useCallback(
    async (path: string) => {
      const draft = (serverDescDrafts[path] ?? '').trim();
      const server =
        brandPhotosMeta.find((p) => p.path === path)?.description?.trim() ?? '';
      if (draft === server) return;
      try {
        const res = await putMemoryLayerBrandPhotoDescription(path, draft);
        if (!isEnvelopeOk(res as { success?: boolean })) {
          throw new Error('Failed to save');
        }
        const raw = (res as { data?: { memoryLayer?: unknown } }).data
          ?.memoryLayer;
        const ml = parseMemory(raw);
        if (ml?.brandPhotos) setBrandPhotosMeta(ml.brandPhotos);
        toast.success('Image description saved');
      } catch (e) {
        showCaughtErrorToast(e, 'Save failed');
      }
    },
    [brandPhotosMeta, serverDescDrafts]
  );

  const finish = useCallback(async () => {
    if (finishInFlightRef.current) return;
    finishInFlightRef.current = true;
    setSubmitting(true);

    // Keep previews visible; upload one-by-one and remove each on success.
    const snapshot = [...pendingRef.current];
    let photosFailed = false;

    try {
      const answers = buildAnswers();
      const pq = questions.find(
        (q) => q.type === 'multiselect' && q.multiselectRole === 'products'
      );
      const pr = pq ? rowFor(pq) : null;
      const selectedProducts =
        pr && !pr.skipped && 'multi' in pr ? pr.multi : undefined;

      if (snapshot.length > 0) {
        let uploadedCount = 0;
        const failedNames: string[] = [];

        for (const item of snapshot) {
          setPendingStaged((prev) =>
            prev.map((p) =>
              p.id === item.id ? { ...p, uploading: true, failed: false } : p
            )
          );

          try {
            const up = await uploadMemoryLayerBrandPhotos(
              [item.file],
              [item.description]
            );
            if (!isEnvelopeOk(up as { success?: boolean })) {
              throw new Error('Photo upload failed');
            }
            const data = (
              up as {
                data?: {
                  memoryLayer?: unknown;
                  uploaded?: number;
                  failed?: { index: number; name: string; reason: string }[];
                };
              }
            ).data;

            if (Array.isArray(data?.failed) && data.failed.length > 0) {
              throw new Error(data.failed[0]?.reason || 'Photo upload failed');
            }

            uploadedCount +=
              typeof data?.uploaded === 'number' ? data.uploaded : 1;
            if (data?.memoryLayer) {
              const ml = parseMemory(data.memoryLayer);
              if (ml?.brandPhotos) setBrandPhotosMeta(ml.brandPhotos);
            }

            setPendingStaged((prev) => {
              const hit = prev.find((p) => p.id === item.id);
              if (hit) {
                try {
                  URL.revokeObjectURL(hit.previewUrl);
                } catch {
                  /* ignore */
                }
              }
              return prev.filter((p) => p.id !== item.id);
            });
          } catch (itemErr) {
            photosFailed = true;
            failedNames.push(item.file.name || 'image');
            setPendingStaged((prev) =>
              prev.map((p) =>
                p.id === item.id ? { ...p, uploading: false, failed: true } : p
              )
            );
            console.warn('[memory-layer] photo upload failed:', itemErr);
          }
        }

        if (photosFailed) {
          const names = failedNames.slice(0, 3).join(', ');
          toast.message(
            uploadedCount > 0
              ? `Uploaded ${uploadedCount}; ${failedNames.length} failed${names ? ` (${names})` : ''}. Fix or remove failed images to continue.`
              : `Upload failed${names ? `: ${names}` : ''}. Fix or remove failed images to continue.`
          );
          return;
        }
      }

      const res = await putMemoryLayer({
        status: 'complete',
        answers,
        questions,
        ...(selectedProducts?.length ? { selectedProducts } : {}),
      });
      if (!isEnvelopeOk(res as { success?: boolean })) {
        throw new Error('Failed to save');
      }
      toast.success('Saved');
      goHomeWithPlatformTour();
    } catch (e) {
      showCaughtErrorToast(e, 'Failed to finish');
    } finally {
      finishInFlightRef.current = false;
      setSubmitting(false);
      setPendingStaged((prev) => prev.map((p) => ({ ...p, uploading: false })));
    }
  }, [buildAnswers, goHomeWithPlatformTour, questions, rowFor]);

  const skipPhotos = useCallback(async () => {
    if (finishInFlightRef.current) return;
    finishInFlightRef.current = true;
    try {
      setSubmitting(true);
      const answers = buildAnswers();
      const pq = questions.find(
        (q) => q.type === 'multiselect' && q.multiselectRole === 'products'
      );
      const pr = pq ? rowFor(pq) : null;
      const selectedProducts =
        pr && !pr.skipped && 'multi' in pr ? pr.multi : undefined;
      const res = await putMemoryLayer({
        status: 'complete',
        answers,
        questions,
        ...(selectedProducts?.length ? { selectedProducts } : {}),
      });
      if (!isEnvelopeOk(res as { success?: boolean })) {
        throw new Error('Failed to save');
      }
      goHomeWithPlatformTour();
    } catch (e) {
      showErrorToast('Failed to skip photos. Please Try Again Later.');
    } finally {
      finishInFlightRef.current = false;
      setSubmitting(false);
    }
  }, [buildAnswers, goHomeWithPlatformTour, questions, rowFor]);

  const panelClass =
    'max-w-lg w-full max-h-[calc(100dvh-2rem)] flex min-h-0 flex-col overflow-hidden bg-default border border-white/10 rounded-2xl p-6 sm:p-8 text-white shadow-[0_0_40px_rgba(0,209,255,0.15)]';
  const photosScrollClass =
    'min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 -mr-0.5 [scrollbar-gutter:stable]';
  const actionBarClass =
    'mt-4 flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4';

  const renderQuestionBody = () => {
    if (!current) return null;
    const r = rowFor(current);
    if (current.type === 'multiselect') {
      const selected = !r.skipped && 'multi' in r ? r.multi : [];
      const selectedLower = new Set(selected.map((s) => s.toLowerCase()));
      const suggestions = [
        ...(current.options ?? []),
        ...selected.filter(
          (s) =>
            !(current.options ?? []).some(
              (o) => o.toLowerCase() === s.toLowerCase()
            )
        ),
      ];
      const typed = customTag.trim();
      const canAddCustom = typed.length > 0;
      return (
        <div className="flex min-h-0 flex-col gap-4">
          <div className="flex shrink-0 items-stretch gap-2">
            <input
              type="text"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                if (canAddCustom) {
                  addCustomProduct(current);
                  return;
                }
                goNext();
              }}
              placeholder="Click a suggestion or type, then Enter"
              className="h-11 min-w-0 flex-1 rounded-lg border border-white/15 bg-default px-3.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/45"
            />
            <button
              type="button"
              onClick={() => {
                if (canAddCustom) addCustomProduct(current);
                else goNext();
              }}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-linear-to-r from-[#6C5CE7] to-[#00D1FF] px-5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {canAddCustom ? 'Add' : 'Next'}
            </button>
          </div>

          {selected.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-white/45">
                Selected ({selected.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {selected.map((opt) => (
                  <button
                    key={`selected-${opt}`}
                    type="button"
                    onClick={() => toggleMulti(current, opt)}
                    title="Remove"
                    className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#00D1FF]/50 bg-[#6C5CE7]/85 px-3 py-1.5 text-left text-sm text-white transition hover:bg-[#6C5CE7]"
                  >
                    <span className="break-words">{opt}</span>
                    <span className="text-white/70" aria-hidden>
                      ×
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {suggestions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-white/45">
                Suggestions — click to fill the box
              </p>
              <div className="max-h-[min(36vh,12rem)] overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex flex-wrap content-start gap-2">
                  {suggestions.map((opt) => {
                    const alreadyIn = selectedLower.has(opt.toLowerCase());
                    return (
                      <button
                        key={`suggest-${opt}`}
                        type="button"
                        onClick={() => fillInputFromSuggestion(opt)}
                        className={cn(
                          'inline-flex max-w-full items-center rounded-full border px-3 py-1.5 text-left text-sm leading-snug transition-expo',
                          alreadyIn
                            ? 'border-white/10 bg-default text-white/40'
                            : 'border-white/20 bg-default text-white/90 hover:border-[#00D1FF]/50 hover:bg-default'
                        )}
                      >
                        <span className="break-words">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-white/50">
              No suggestions yet — type your own product lines above.
            </p>
          )}

          <p className="text-xs leading-relaxed text-white/45">
            Click a suggestion to put it in the box, then Add / Enter. Empty box
            + Enter continues.
          </p>
        </div>
      );
    }
    const textVal = r.skipped === false && 'text' in r ? (r.text ?? '') : '';
    const answerSuggestions = (current.suggestions ?? [])
      .map((s) => String(s ?? '').trim())
      .filter(Boolean)
      .slice(0, 2);
    const suggestionBlock = (
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-white/45">
          Suggestions — click to fill
        </p>
        {answerSuggestions.length > 0 ? (
          <div className="flex flex-col gap-2">
            {answerSuggestions.map((s) => (
              <button
                key={`ans-suggest-${s}`}
                type="button"
                onClick={() => setRow(current.id, { skipped: false, text: s })}
                className={cn(
                  'inline-flex w-full items-start rounded-full border border-white/20 bg-default px-3 py-2.5 text-left text-sm leading-snug text-white/90 transition-expo hover:border-[#00D1FF]/50 hover:bg-default',
                  textVal.trim().toLowerCase() === s.toLowerCase() &&
                    'border-[#00D1FF]/50 bg-[#6C5CE7]/30'
                )}
              >
                <span className="break-words">{s}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-white/15 bg-default px-3 py-2.5 text-sm text-white/50">
            Suggestions are loading — you can still type your own answer below.
          </p>
        )}
      </div>
    );

    if (current.type === 'textarea') {
      return (
        <div className="flex min-h-0 flex-col gap-4">
          {suggestionBlock}
          <textarea
            rows={4}
            value={textVal}
            onChange={(e) =>
              setRow(current.id, { skipped: false, text: e.target.value })
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                goNext();
              }
            }}
            placeholder={
              answerSuggestions.length > 0
                ? 'Write your answer or tap a suggestion above…'
                : 'Write your answer…'
            }
            className="min-h-[7.5rem] w-full shrink-0 resize-y rounded-lg border border-white/15 bg-default p-3.5 text-sm leading-relaxed text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/50"
          />
        </div>
      );
    }
    return (
      <div className="flex min-h-0 flex-col gap-4">
        {suggestionBlock}
        <input
          type="text"
          value={textVal}
          onChange={(e) =>
            setRow(current.id, { skipped: false, text: e.target.value })
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              goNext();
            }
          }}
          placeholder={
            answerSuggestions.length > 0
              ? 'Type your answer or tap a suggestion above, then Enter'
              : 'Type your answer, then Enter'
          }
          className="h-11 w-full shrink-0 rounded-lg border border-white/15 bg-default px-3.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/50"
        />
      </div>
    );
  };

  if (loading) {
    return <PageLoadingState className="min-h-[60vh] mx-auto" />;
  }

  if (!questions.length) {
    return (
      <div className="min-h-[60vh] flex mx-auto w-full items-center justify-center">
        <div className={panelClass}>
          <p className="text-center text-tertiary">No questions available.</p>
          <button
            type="button"
            className="mt-4 w-full py-2 rounded-full bg-linear-to-r from-[#00D1FF] to-[#6C5CE7] text-white"
            onClick={() => goHomeWithPlatformTour()}
          >
            Continue to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto overscroll-contain backdrop-blur-sm p-4 sm:p-4">
      <div id="tour-bm-card" className={panelClass}>
        <div className="flex shrink-0 justify-between items-start gap-4">
          <h1 className="text-page-title text-default bg-clip-text bg-linear-to-r from-[#6C5CE7] to-[#00D1FF]">
            {phase === 'qa' ? 'Tell us about your brand' : 'Brand photos'}
          </h1>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void skipEntire()}
            className="text-sm text-white hover:text-white/70 shrink-0 cursor-pointer"
          >
            Skip entire setup
          </button>
        </div>

        {phase === 'qa' && current && (
          <>
            <div className={cn(photosScrollClass, 'mt-5 flex flex-col gap-5')}>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-white/45">
                  Question {qIndex + 1} of {questions.length}
                </p>
                <p className="text-base font-medium leading-snug text-white/95">
                  {current.prompt}
                </p>
              </div>
              {renderQuestionBody()}
            </div>
            <div className={actionBarClass}>
              <button
                type="button"
                onClick={goBack}
                disabled={qIndex === 0}
                className={cn(
                  'rounded-full px-4 py-2 text-sm',
                  qIndex === 0
                    ? 'cursor-not-allowed opacity-40'
                    : 'bg-default hover:bg-default'
                )}
              >
                Back
              </button>
              <button
                type="button"
                onClick={skipQuestion}
                className="rounded-full px-4 py-2 text-sm text-white/55 hover:bg-default hover:text-white/85"
              >
                Skip question
              </button>
              <button
                type="button"
                onClick={goNext}
                className="rounded-full bg-linear-to-r from-[#00D1FF] to-[#6C5CE7] px-6 py-2 text-sm text-white"
              >
                {qIndex < questions.length - 1 ? 'Next' : 'Continue to photos'}
              </button>
            </div>
          </>
        )}

        {phase === 'photos' && (
          <>
            <div className={cn(photosScrollClass, 'mt-4 space-y-4')}>
              <p className="text-sm text-secondary">
                Optional: upload a PDF brochure or individual images. SocioGenie
                suggests descriptions when you leave them blank — edit anytime.
                Up to 30 images total
                {brandPhotosMeta.length > 0
                  ? ` (${brandPhotosMeta.length} already saved`
                  : ''}
                {pendingStaged.length > 0
                  ? `${brandPhotosMeta.length > 0 ? ',' : ' ('}${pendingStaged.length} staged`
                  : ''}
                {brandPhotosMeta.length > 0 || pendingStaged.length > 0
                  ? ')'
                  : ''}
                . You can add {remainingPhotoSlots} more image
                {remainingPhotoSlots === 1 ? '' : 's'} in this step (max{' '}
                {BRAND_PHOTO_DESCRIPTION_MAX} characters per description).
              </p>

              {isExtracting && (
                <p className="text-xs font-medium text-[#00D1FF] flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Processing PDF…
                </p>
              )}

              <div className="rounded-xl border border-dashed border-white/30 bg-default p-4">
                <h3 className="text-eyebrow mb-2">Import from PDF</h3>
                <p className="text-sm text-secondary mb-3 max-w-[52ch]">
                  Upload a product brochure or catalog PDF (max 50MB).
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <label
                    htmlFor={pdfInputId}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-xl border border-white/20 bg-default px-4 py-2.5 text-sm font-medium text-quaternary cursor-pointer hover:bg-default',
                      isExtracting && 'opacity-60 pointer-events-none'
                    )}
                  >
                    <FileText className="w-4 h-4" />
                    {pendingPdf ? pendingPdf.name : 'Choose PDF'}
                    <input
                      id={pdfInputId}
                      type="file"
                      accept="application/pdf"
                      className="sr-only"
                      disabled={isExtracting}
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null;
                        if (f && f.size > MAX_MEMORY_LAYER_PDF_BYTES) {
                          showErrorToast('PDF must be 50MB or smaller');
                          e.target.value = '';
                          return;
                        }
                        setPendingPdf(f);
                        queueMicrotask(() => {
                          e.target.value = '';
                        });
                      }}
                    />
                  </label>
                  {pendingPdf ? (
                    <button
                      type="button"
                      onClick={() => setPendingPdf(null)}
                      className="text-xs text-secondary hover:text-tertiary"
                    >
                      Clear
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={!pendingPdf || isExtracting}
                    onClick={() => void handleUploadPdf()}
                    className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-[#6C5CE7] to-[#00D1FF] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:text-quaternary"
                  >
                    {uploadingPdf ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    Upload PDF
                  </button>
                </div>
              </div>
              {brandPhotosMeta.length > 0 && (
                <div>
                  <h3 className="text-subsection text-default mb-2 uppercase">
                    Already saved
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {brandPhotosMeta.map((p) =>
                      p.path ? (
                        <div
                          key={p.path}
                          className="border border-white/10 rounded-lg p-2 bg-default space-y-2"
                        >
                          <div className="aspect-square rounded-md overflow-hidden bg-default max-h-40">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.url}
                              alt=""
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <label className="text-xs text-secondary">
                            Image description
                          </label>
                          <textarea
                            value={serverDescDrafts[p.path] ?? ''}
                            onChange={(e) =>
                              setServerDescDrafts((prev) => ({
                                ...prev,
                                [p.path!]: e.target.value.slice(
                                  0,
                                  BRAND_PHOTO_DESCRIPTION_MAX
                                ),
                              }))
                            }
                            onBlur={() =>
                              void flushServerImageDescription(p.path!)
                            }
                            maxLength={BRAND_PHOTO_DESCRIPTION_MAX}
                            rows={3}
                            placeholder="What should we know about this product image?"
                            className="w-full text-sm bg-default border border-black/20 rounded-md px-2 py-1.5 text-default placeholder:text-quaternary resize-y min-h-[72px]"
                          />
                          <p className="text-[10px] text-secondary text-right">
                            {(serverDescDrafts[p.path] ?? '').length}/
                            {BRAND_PHOTO_DESCRIPTION_MAX}
                          </p>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              )}
              <label
                className={cn(
                  'block border-2 border-dashed border-white/20 rounded-xl p-6 sm:p-8 text-center cursor-pointer hover:bg-default shrink-0',
                  isExtracting && 'opacity-60 pointer-events-none'
                )}
              >
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={isExtracting}
                  onChange={(e) => {
                    onFilesPicked(e.target.files);
                    queueMicrotask(() => {
                      e.target.value = '';
                    });
                  }}
                />
                <span className="flex flex-col items-center gap-1">
                  <span className="text-default">
                    Drop or click to add images
                  </span>
                  <span className="text-xs text-secondary">
                    Large images are resized automatically before upload
                  </span>
                </span>
              </label>
              {pendingStaged.length > 0 && (
                <div>
                  <h3 className="text-subsection text-default mb-2 uppercase">
                    {submitting
                      ? `Uploading… (${pendingStaged.length} left)`
                      : 'Ready to upload'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {pendingStaged.map((row) => (
                      <div
                        key={row.id}
                        className={cn(
                          'list-none border rounded-lg p-2 space-y-2',
                          row.failed
                            ? 'border-danger bg-danger'
                            : 'border-white/10 bg-default'
                        )}
                      >
                        <div className="relative aspect-square rounded-md overflow-hidden bg-default max-h-48">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={row.previewUrl}
                            alt={row.file.name}
                            className="w-full h-full object-contain"
                          />
                          {row.uploading ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 text-white">
                              <Loader2
                                className="h-5 w-5 animate-spin"
                                aria-hidden
                              />
                              <span className="text-xs font-medium">
                                Uploading…
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => removePending(row.id)}
                              disabled={submitting}
                              className="absolute top-2 right-2 text-xs rounded bg-black/50 text-white px-2 py-1 hover:bg-danger disabled:text-quaternary"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <p
                          className="text-xs text-secondary truncate"
                          title={row.file.name}
                        >
                          {row.failed
                            ? `Failed · ${row.file.name}`
                            : row.file.name}
                        </p>
                        <label className="text-xs text-secondary">
                          Image description
                        </label>
                        <textarea
                          value={row.description}
                          disabled={!!row.uploading || submitting}
                          onChange={(e) =>
                            setPendingStaged((prev) =>
                              prev.map((p) =>
                                p.id === row.id
                                  ? {
                                      ...p,
                                      description: e.target.value.slice(
                                        0,
                                        BRAND_PHOTO_DESCRIPTION_MAX
                                      ),
                                    }
                                  : p
                              )
                            )
                          }
                          maxLength={BRAND_PHOTO_DESCRIPTION_MAX}
                          rows={3}
                          placeholder="Optional — helps generation match this product image"
                          className="w-full text-sm bg-default border border-black/20 rounded-md px-2 py-1.5 text-default placeholder:text-quaternary resize-y min-h-[72px] disabled:text-quaternary"
                        />
                        <p className="text-[10px] text-secondary text-right">
                          {row.description.length}/{BRAND_PHOTO_DESCRIPTION_MAX}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className={actionBarClass}>
              <button
                type="button"
                onClick={goBack}
                className="px-4 py-2 rounded-full text-sm bg-default hover:bg-default"
              >
                Back
              </button>
              <button
                type="button"
                disabled={submitting || isExtracting}
                onClick={() => void skipPhotos()}
                className="px-4 py-2 rounded-full text-sm text-secondary"
              >
                Skip photos
              </button>
              <button
                type="button"
                disabled={submitting || isExtracting}
                onClick={() => void finish()}
                className="px-6 py-2 rounded-full text-sm bg-linear-to-r from-[#00D1FF] to-[#6C5CE7] text-white disabled:text-quaternary"
              >
                {submitting ? 'Saving…' : 'Finish'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
