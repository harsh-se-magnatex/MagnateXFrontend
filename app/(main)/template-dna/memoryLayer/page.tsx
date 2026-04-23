'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/src/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  deleteMemoryLayerBrandPhoto,
  generateMemoryLayerQuestions,
  getMemoryLayer,
  putMemoryLayer,
  BRAND_PHOTO_DESCRIPTION_MAX,
  putMemoryLayerBrandPhotoDescription,
  uploadMemoryLayerBrandPhotos,
  type MemoryLayerAnswerPayload,
} from '@/src/service/api/userService';
import {
  Brain,
  ChevronLeft,
  ImageIcon,
  ImagePlus,
  Loader2,
  MessageSquareText,
  Trash2,
  X,
} from 'lucide-react';

type Question = {
  id: string;
  prompt: string;
  type: 'text' | 'textarea' | 'multiselect';
  options?: string[];
  multiselectRole?: 'products';
};

type BrandPhoto = {
  url: string;
  path: string;
  createdAt?: string | null;
  description?: string;
};

type MemoryPayload = {
  status?: string;
  questions?: Question[];
  answers?: MemoryLayerAnswerPayload[];
  selectedProducts?: string[];
  brandPhotos?: BrandPhoto[];
};

type DraftRow =
  | { skipped: true }
  | { skipped: false; text?: string }
  | { skipped: false; multi: string[] };

/** Local pick with blob URL for visible preview */
type PendingImage = {
  id: string;
  file: File;
  previewUrl: string;
  description: string;
};

function isOk(res: { success?: boolean } | undefined): boolean {
  return res?.success === true;
}

function parseMemory(data: unknown): MemoryPayload | null {
  if (!data || typeof data !== 'object') return null;
  return data as MemoryPayload;
}

function makePendingId(f: File): string {
  return `${f.name}-${f.size}-${f.lastModified}-${Math.random().toString(36).slice(2)}`;
}

/** Browsers sometimes report an empty MIME type for valid images (e.g. Linux, some exports). */
function isImageFile(f: File): boolean {
  if (f.type.startsWith('image/')) return true;
  if (f.type !== '') return false;
  const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
  return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'heic', 'heif', 'svg'].includes(
    ext
  );
}

export default function TemplateDnaMemoryLayerPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputId = useId();
  const [loading, setLoading] = useState(true);
  const [savingAnswers, setSavingAnswers] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [savingDescriptionPath, setSavingDescriptionPath] = useState<
    string | null
  >(null);
  const [generating, setGenerating] = useState(false);
  const [memory, setMemory] = useState<MemoryPayload | null>(null);
  const [draft, setDraft] = useState<Record<string, DraftRow>>({});
  const [customTags, setCustomTags] = useState<Record<string, string>>({});
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [photoDescriptionDrafts, setPhotoDescriptionDrafts] = useState<
    Record<string, string>
  >({});
  const memoryRef = useRef(memory);
  memoryRef.current = memory;
  const [activeTab, setActiveTab] = useState<'questionnaire' | 'images'>(
    'questionnaire'
  );

  const questions = memory?.questions ?? [];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMemoryLayer();
      if (!isOk(res as { success?: boolean })) {
        throw new Error('Failed to load memory layer');
      }
      const raw = (res as { data?: { memoryLayer?: unknown } }).data
        ?.memoryLayer;
      setMemory(parseMemory(raw));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/sign-in');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  useEffect(() => {
    const photos = memory?.brandPhotos;
    if (!photos?.length) {
      setPhotoDescriptionDrafts({});
      return;
    }
    setPhotoDescriptionDrafts(
      Object.fromEntries(photos.map((p) => [p.path, p.description ?? '']))
    );
  }, [memory?.brandPhotos]);

  /** Hydrate draft from server answers when memory or questions change */
  useEffect(() => {
    if (!memory?.questions?.length) {
      setDraft({});
      return;
    }
    const answers = memory.answers ?? [];
    const next: Record<string, DraftRow> = {};
    for (const q of memory.questions) {
      const a = answers.find((x) => x.questionId === q.id);
      if (a?.skipped) {
        next[q.id] = { skipped: true };
      } else if (q.type === 'multiselect') {
        const v = a?.value;
        next[q.id] = {
          skipped: false,
          multi: Array.isArray(v) ? v.map(String) : [],
        };
      } else {
        const v = a?.value;
        next[q.id] = {
          skipped: false,
          text: v == null ? '' : String(v),
        };
      }
    }
    setDraft(next);
  }, [memory]);

  /** Revoke blob URLs when clearing pending (after upload) */
  const revokePendingUrls = useCallback((items: PendingImage[]) => {
    for (const p of items) {
      try {
        URL.revokeObjectURL(p.previewUrl);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const rowFor = useCallback(
    (q: Question): DraftRow => {
      const existing = draft[q.id];
      if (existing) return existing;
      if (q.type === 'multiselect') return { skipped: false, multi: [] };
      return { skipped: false, text: '' };
    },
    [draft]
  );

  const setRow = useCallback((qid: string, row: DraftRow) => {
    setDraft((prev) => ({ ...prev, [qid]: row }));
  }, []);

  const buildAnswers = useCallback((): MemoryLayerAnswerPayload[] => {
    return questions.map((q) => {
      const r = rowFor(q);
      if (r.skipped) return { questionId: q.id, skipped: true };
      if (q.type === 'multiselect' && 'multi' in r) {
        return { questionId: q.id, skipped: false, value: r.multi };
      }
      const text = r.skipped === false && 'text' in r ? r.text ?? '' : '';
      return { questionId: q.id, skipped: false, value: text };
    });
  }, [questions, rowFor]);

  const pq = useMemo(
    () =>
      questions.find(
        (q) => q.type === 'multiselect' && q.multiselectRole === 'products'
      ),
    [questions]
  );

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const res = await generateMemoryLayerQuestions({ force: false });
      if (!isOk(res as { success?: boolean })) {
        throw new Error('Generation failed');
      }
      const ml = parseMemory(
        (res as { data?: { memoryLayer?: unknown } }).data?.memoryLayer
      );
      setMemory(ml);
      toast.success('Questions ready');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  // const handleRegenerate = async () => {
  //   try {
  //     setRegenerating(true);
  //     const res = await generateMemoryLayerQuestions({ force: true });
  //     ...
  //   } finally {
  //     setRegenerating(false);
  //   }
  // };

  const handleSaveAnswers = async () => {
    if (!questions.length) return;
    try {
      setSavingAnswers(true);
      const answers = buildAnswers();
      const pr = pq ? rowFor(pq) : null;
      const selectedProducts =
        pr && !pr.skipped && 'multi' in pr ? pr.multi : undefined;

      const putRes = await putMemoryLayer({
        status: 'complete',
        answers,
        ...(selectedProducts?.length ? { selectedProducts } : {}),
      });
      if (!isOk(putRes as { success?: boolean })) {
        throw new Error('Save failed');
      }
      await load();
      toast.success('Answers saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingAnswers(false);
    }
  };

  const flushPhotoDescription = async (path: string) => {
    const draft = (photoDescriptionDrafts[path] ?? '').trim();
    const server =
      memory?.brandPhotos?.find((p) => p.path === path)?.description?.trim() ??
      '';
    if (draft === server) return;
    try {
      setSavingDescriptionPath(path);
      const res = await putMemoryLayerBrandPhotoDescription(path, draft);
      if (!isOk(res as { success?: boolean })) {
        throw new Error('Failed to save note');
      }
      const raw = (res as { data?: { memoryLayer?: unknown } }).data
        ?.memoryLayer;
      if (raw) setMemory(parseMemory(raw));
      toast.success('Image description saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingDescriptionPath(null);
    }
  };

  const handleUploadPhotos = async () => {
    if (pendingImages.length === 0) {
      toast.message('Choose images first');
      return;
    }
    const files = pendingImages.map((p) => p.file);
    const descriptions = pendingImages.map((p) => p.description);
    try {
      setUploadingPhotos(true);
      const up = await uploadMemoryLayerBrandPhotos(files, descriptions);
      if (!isOk(up as { success?: boolean })) {
        throw new Error('Photo upload failed');
      }
      revokePendingUrls(pendingImages);
      setPendingImages([]);
      await load();
      toast.success('Photos uploaded');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleRemovePhoto = async (path: string) => {
    try {
      const res = await deleteMemoryLayerBrandPhoto(path);
      if (!isOk(res as { success?: boolean })) {
        throw new Error('Remove failed');
      }
      const ml = parseMemory(
        (res as { data?: { memoryLayer?: unknown } }).data?.memoryLayer
      );
      if (ml) setMemory(ml);
      toast.success('Photo removed');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Remove failed');
    }
  };

  const removePending = (id: string) => {
    setPendingImages((prev) => {
      const hit = prev.find((p) => p.id === id);
      if (hit) URL.revokeObjectURL(hit.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const addFilesFromPicker = (list: FileList | null) => {
    if (!list?.length) return;
    const brandPhotos = memoryRef.current?.brandPhotos ?? [];
    setPendingImages((prev) => {
      const maxTotal = 30 - brandPhotos.length;
      const room = Math.max(0, maxTotal - prev.length);
      if (room === 0) {
        toast.message('30 image limit reached');
        return prev;
      }
      const next = [...prev];
      for (let i = 0; i < list.length; i++) {
        if (next.length >= maxTotal) {
          toast.message('30 image limit reached');
          break;
        }
        const f = list.item(i);
        if (!f) continue;
        if (!isImageFile(f)) {
          toast.error(`${f.name} is not an image`);
          continue;
        }
        next.push({
          id: makePendingId(f),
          file: f,
          previewUrl: URL.createObjectURL(f),
          description: '',
        });
      }
      return next;
    });
  };

  const toggleMulti = (q: Question, option: string) => {
    const r = rowFor(q);
    if (r.skipped) return;
    const cur = 'multi' in r ? [...r.multi] : [];
    const i = cur.indexOf(option);
    if (i === -1) cur.push(option);
    else cur.splice(i, 1);
    setRow(q.id, { skipped: false, multi: cur });
  };

  const addCustomTag = (q: Question) => {
    const tag = (customTags[q.id] ?? '').trim();
    if (!tag) return;
    const r = rowFor(q);
    if (r.skipped) return;
    const cur = 'multi' in r ? [...r.multi] : [];
    if (!cur.includes(tag)) cur.push(tag);
    setRow(q.id, { skipped: false, multi: cur });
    setCustomTags((prev) => ({ ...prev, [q.id]: '' }));
  };

  const brandPhotos = memory?.brandPhotos ?? [];
  const maxNewSlots = Math.max(
    0,
    30 - brandPhotos.length - pendingImages.length
  );

  const inputBase =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

  if (authLoading || !user) return null;

  return (
    <div className="max-w-3xl mx-auto pb-20 animate-in fade-in duration-500">
      <div className="mb-8">
        <Link
          href="/template-dna"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Template DNA
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-tr from-violet-600 to-indigo-500 text-white shadow-sm">
            <Brain className="h-5 w-5" />
          </div>
          Memory layer
        </h1>
        <p className="mt-3 text-base text-slate-500 max-w-2xl leading-relaxed">
          Product and content signals used when generating posts. Use the tabs
          to switch between the questionnaire and brand images.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="space-y-10">
          {!questions.length ? (
            <section className="glass-card rounded-3xl p-8 border border-slate-200 shadow-sm">
              <p className="text-slate-600 mb-6">
                No questionnaire yet. Generate personalized questions from your
                business profile, then answer them here anytime.
              </p>
              <button
                type="button"
                disabled={generating}
                onClick={() => void handleGenerate()}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 disabled:opacity-60"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                Generate questions
              </button>
            </section>
          ) : (
            <>
              <div
                className="flex gap-1 p-1 rounded-2xl bg-slate-100/90 border border-slate-200/80 mb-6"
                role="tablist"
                aria-label="Memory layer sections"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'questionnaire'}
                  onClick={() => setActiveTab('questionnaire')}
                  className={cn(
                    'flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors',
                    activeTab === 'questionnaire'
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <MessageSquareText className="w-4 h-4 shrink-0" />
                  Questionnaire
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'images'}
                  onClick={() => setActiveTab('images')}
                  className={cn(
                    'flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors',
                    activeTab === 'images'
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <ImageIcon className="w-4 h-4 shrink-0" />
                  Images
                </button>
              </div>

              {/* —— Answers —— */}
              <section
                className={cn(
                  'glass-card rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm',
                  activeTab !== 'questionnaire' && 'hidden'
                )}
                role="tabpanel"
                hidden={activeTab !== 'questionnaire'}
              >
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Questionnaire
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Status:{' '}
                      <span className="font-medium text-slate-800">
                        {memory?.status ?? '—'}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={savingAnswers}
                    onClick={() => void handleSaveAnswers()}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 disabled:opacity-60 shrink-0"
                  >
                    {savingAnswers ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    Save answers
                  </button>
                </div>

                {/* Regenerate questions — disabled per product request
                <div className="flex justify-end mb-4">
                  <button ...>Regenerate questions</button>
                </div>
                */}

                <div className="space-y-8">
                  {questions.map((q) => {
                    const r = rowFor(q);
                    return (
                      <div
                        key={q.id}
                        className="pb-8 border-b border-slate-100 last:border-0 last:pb-0"
                      >
                        <div className="flex justify-between gap-4 mb-3">
                          <label className="text-sm font-semibold text-slate-800">
                            {q.prompt}
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              if (r.skipped) {
                                if (q.type === 'multiselect') {
                                  setRow(q.id, { skipped: false, multi: [] });
                                } else {
                                  setRow(q.id, { skipped: false, text: '' });
                                }
                              } else {
                                setRow(q.id, { skipped: true });
                              }
                            }}
                            className="text-xs text-slate-500 hover:text-slate-800 shrink-0"
                          >
                            {r.skipped ? 'Include' : 'Skip'}
                          </button>
                        </div>

                        {r.skipped ? (
                          <p className="text-sm text-slate-400 italic">
                            Skipped
                          </p>
                        ) : q.type === 'multiselect' && q.options?.length ? (
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              {q.options.map((opt) => {
                                const sel =
                                  'multi' in r ? r.multi.includes(opt) : false;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => toggleMulti(q, opt)}
                                    className={cn(
                                      'px-3 py-1.5 rounded-lg text-sm border transition-colors',
                                      sel
                                        ? 'bg-indigo-100 border-indigo-300 text-indigo-900'
                                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                    )}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={customTags[q.id] ?? ''}
                                onChange={(e) =>
                                  setCustomTags((prev) => ({
                                    ...prev,
                                    [q.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addCustomTag(q);
                                  }
                                }}
                                placeholder="Add custom line"
                                className={cn(inputBase, 'flex-1 text-sm')}
                              />
                              <button
                                type="button"
                                onClick={() => addCustomTag(q)}
                                className="px-3 py-2 rounded-lg bg-slate-100 text-sm font-medium text-slate-800"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        ) : q.type === 'textarea' ? (
                          <textarea
                            rows={4}
                            value={
                              r.skipped === false && 'text' in r
                                ? r.text ?? ''
                                : ''
                            }
                            onChange={(e) =>
                              setRow(q.id, {
                                skipped: false,
                                text: e.target.value,
                              })
                            }
                            className={cn(inputBase, 'resize-y min-h-[100px]')}
                          />
                        ) : (
                          <input
                            type="text"
                            value={
                              r.skipped === false && 'text' in r
                                ? r.text ?? ''
                                : ''
                            }
                            onChange={(e) =>
                              setRow(q.id, {
                                skipped: false,
                                text: e.target.value,
                              })
                            }
                            className={inputBase}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={savingAnswers}
                    onClick={() => void handleSaveAnswers()}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {savingAnswers ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    Save answers
                  </button>
                </div>
              </section>

              {/* —— Photos —— */}
              <section
                className={cn(
                  'glass-card rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm',
                  activeTab !== 'images' && 'hidden'
                )}
                role="tabpanel"
                hidden={activeTab !== 'images'}
              >
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Brand reference photos
                    </h2>
                    <p className="text-sm text-slate-500 mt-1 max-w-[42ch]">
                      Saved images are stored for your account. New picks show
                      previews below before you upload. Up to 30 images total.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={uploadingPhotos || pendingImages.length === 0}
                    onClick={() => void handleUploadPhotos()}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 disabled:opacity-60 shrink-0"
                  >
                    {uploadingPhotos ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    Upload new photos
                  </button>
                </div>

                {brandPhotos.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                      Saved on server
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {brandPhotos.map((p) => (
                        <div
                          key={p.path}
                          className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50/80 p-2 space-y-2"
                        >
                          <div className="relative group rounded-lg overflow-hidden aspect-square bg-slate-100 max-h-[220px] sm:max-h-none">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => void handleRemovePhoto(p.path)}
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              aria-label="Remove photo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">
                              Image description (optional, max{' '}
                              {BRAND_PHOTO_DESCRIPTION_MAX} characters)
                            </label>
                            <textarea
                              value={photoDescriptionDrafts[p.path] ?? ''}
                              disabled={savingDescriptionPath === p.path}
                              onChange={(e) =>
                                setPhotoDescriptionDrafts((prev) => ({
                                  ...prev,
                                  [p.path]: e.target.value.slice(
                                    0,
                                    BRAND_PHOTO_DESCRIPTION_MAX
                                  ),
                                }))
                              }
                              onBlur={() => void flushPhotoDescription(p.path)}
                              maxLength={BRAND_PHOTO_DESCRIPTION_MAX}
                              rows={3}
                              placeholder="Describe this product image (you type this; max 500 characters)"
                              className={cn(
                                inputBase,
                                'text-sm py-2 resize-y min-h-[72px]',
                                savingDescriptionPath === p.path && 'opacity-60'
                              )}
                            />
                            <p className="text-[10px] text-slate-400 text-right">
                              {(photoDescriptionDrafts[p.path] ?? '').length}/
                              {BRAND_PHOTO_DESCRIPTION_MAX}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                    Add from your device
                  </h3>
                  <label
                    htmlFor={fileInputId}
                    className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-100"
                  >
                    <ImagePlus className="w-4 h-4" />
                    Choose images
                    <input
                      id={fileInputId}
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(e) => {
                        const files = e.target.files;
                        addFilesFromPicker(files);
                        // Defer reset so the picker finishes; avoids edge cases where previews never stick.
                        queueMicrotask(() => {
                          e.target.value = '';
                        });
                      }}
                    />
                  </label>
                  <p className="text-xs text-slate-400 mt-2">
                    {maxNewSlots} slot
                    {maxNewSlots === 1 ? '' : 's'} left. JPEG, PNG, or WebP
                    upload best; other types may be rejected on upload.
                  </p>
                </div>

                {pendingImages.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                      Ready to upload ({pendingImages.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {pendingImages.map((p) => (
                        <div
                          key={p.id}
                          className="rounded-xl border border-emerald-200 overflow-hidden bg-emerald-50/40 p-2 space-y-2 ring-1 ring-emerald-100"
                        >
                          <div className="relative aspect-square max-h-[220px] sm:max-h-none rounded-lg overflow-hidden bg-slate-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.previewUrl}
                              alt={p.file.name}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removePending(p.id)}
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-red-600"
                              aria-label="Remove from queue"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <p className="absolute bottom-0 left-0 right-0 truncate bg-black/50 text-[10px] text-white px-2 py-1">
                              {p.file.name}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">
                              Image description (optional, max{' '}
                              {BRAND_PHOTO_DESCRIPTION_MAX} characters)
                            </label>
                            <textarea
                              value={p.description}
                              onChange={(e) =>
                                setPendingImages((prev) =>
                                  prev.map((row) =>
                                    row.id === p.id
                                      ? {
                                          ...row,
                                          description: e.target.value.slice(
                                            0,
                                            BRAND_PHOTO_DESCRIPTION_MAX
                                          ),
                                        }
                                      : row
                                  )
                                )
                              }
                              maxLength={BRAND_PHOTO_DESCRIPTION_MAX}
                              rows={3}
                              placeholder="Describe this image before upload"
                              className={cn(
                                inputBase,
                                'text-sm py-2 resize-y min-h-[72px]'
                              )}
                            />
                            <p className="text-[10px] text-slate-400 text-right">
                              {p.description.length}/{BRAND_PHOTO_DESCRIPTION_MAX}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-8 flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={uploadingPhotos || pendingImages.length === 0}
                    onClick={() => void handleUploadPhotos()}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {uploadingPhotos ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    Upload new photos
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}
