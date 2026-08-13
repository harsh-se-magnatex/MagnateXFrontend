'use client';

import { PageLoadingState } from '@/components/shared/PageLoadingState';
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
import {
  showCaughtErrorToast,
  showErrorToast,
} from '@/lib/show-error-toast';
import { cn } from '@/lib/utils';
import { normalizeMemoryLayerUploadImage } from '@/lib/normalize-memory-layer-image';
import {
  deleteMemoryLayerBrandPhoto,
  getMemoryLayer,
  putMemoryLayer,
  BRAND_PHOTO_DESCRIPTION_MAX,
  putMemoryLayerBrandPhotoDescription,
  uploadMemoryLayerBrandPhotos,
  uploadMemoryLayerSourcePdf,
  type MemoryLayerAnswerPayload,
  toggleMemoryLayerPreference,
  generateMemoryLayerQuestions,
} from '@/src/service/api/userService';
import {
  Brain,
  ChevronLeft,
  FileText,
  ImageIcon,
  ImagePlus,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Sparkles,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

type BrandPhoto = {
  url: string;
  path: string;
  createdAt?: string | null;
  description?: string;
  descriptionSource?: 'ai' | 'user';
  imageType?: string;
  sourceDocumentId?: string;
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
  /** True while this specific file is being uploaded. */
  uploading?: boolean;
  /** Set when this file failed so it stays visible for retry. */
  failed?: boolean;
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

export default function TemplateDnaMemoryLayerPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputId = useId();
  const pdfInputId = useId();
  const [loading, setLoading] = useState(true);
  const [savingAnswers, setSavingAnswers] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pendingPdf, setPendingPdf] = useState<File | null>(null);
  const [savingDescriptionPath, setSavingDescriptionPath] = useState<
    string | null
  >(null);
  const [generating, setGenerating] = useState(false);
  const [memory, setMemory] = useState<MemoryPayload | null>(null);
  const [draft, setDraft] = useState<Record<string, DraftRow>>({});
  const [customTags, setCustomTags] = useState<Record<string, string>>({});
  /** Custom multiselect lines added in-session (not yet on the question.options). */
  const [extraOptions, setExtraOptions] = useState<Record<string, string[]>>(
    {}
  );
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [photoDescriptionDrafts, setPhotoDescriptionDrafts] = useState<
    Record<string, string>
  >({});
  const memoryRef = useRef(memory);
  memoryRef.current = memory;
  /** Sync lock — React state alone is too late to block rapid mobile taps. */
  const uploadPhotosInFlightRef = useRef(false);
  const [activeTab, setActiveTab] = useState<'questionnaire' | 'images'>(
    'questionnaire'
  );
  const isExtracting = uploadingPdf || uploadingPhotos;
  const [memoryLayerEnabled, setMemoryLayerEnabled] = useState<
    boolean | undefined
  >(undefined);
  const [memoryLayerStrict, setMemoryLayerStrict] = useState<
    boolean | undefined
  >(undefined);
  const [savingMemoryLayerPref, setSavingMemoryLayerPref] = useState(false);
  const questions = memory?.questions ?? [];

  const memoryLayerPrefReady =
    !loading &&
    memoryLayerEnabled !== undefined &&
    memoryLayerStrict !== undefined;

  const brandPhotoCount = memory?.brandPhotos?.length ?? 0;
  const showStrictPhotoWarning =
    Boolean(memoryLayerEnabled) &&
    Boolean(memoryLayerStrict) &&
    brandPhotoCount < 10;

  const handleMemoryLayerToggle = async (enabled: boolean) => {
    const previous = memoryLayerEnabled;
    setMemoryLayerEnabled(enabled);
    setSavingMemoryLayerPref(true);
    try {
      const res = await toggleMemoryLayerPreference({ enabled });
      if (!isOk(res as { success?: boolean })) {
        throw new Error('Could not update Business Data preference');
      }
    } catch (e) {
      setMemoryLayerEnabled(previous);
      showErrorToast('Update failed. Please Try Again Later.');
    } finally {
      setSavingMemoryLayerPref(false);
    }
  };

  const handleMemoryLayerStrictChange = async (strict: boolean) => {
    const previous = memoryLayerStrict;
    setMemoryLayerStrict(strict);
    setSavingMemoryLayerPref(true);
    try {
      const res = await toggleMemoryLayerPreference({ strict });
      if (!isOk(res as { success?: boolean })) {
        throw new Error('Could not update Business Data preference');
      }
    } catch (e) {
      setMemoryLayerStrict(previous);
      showErrorToast('Update failed. Please Try Again Later.');
    } finally {
      setSavingMemoryLayerPref(false);
    }
  };

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await getMemoryLayer();
      if (!isOk(res as { success?: boolean })) {
        throw new Error('Failed to load Business Data');
      }
      const raw = (res as { data?: { memoryLayer?: unknown } }).data
        ?.memoryLayer;
      setMemory(parseMemory(raw));
      setMemoryLayerEnabled(res.data.memoryLayerEnabled);
      setMemoryLayerStrict(res.data.memoryLayerStrict !== false);
    } catch (e) {
      if (!opts?.silent) {
        showErrorToast('Load failed. Please Try Again Later.');
      }
    } finally {
      if (!opts?.silent) setLoading(false);
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
      setExtraOptions({});
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
    // Drop extras that were already merged into regenerated question options.
    setExtraOptions({});
  }, [memory?.answers, memory?.questions]);

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
      const text = r.skipped === false && 'text' in r ? (r.text ?? '') : '';
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

  const questionsWithExtras = useCallback((): Question[] => {
    return questions.map((q) => {
      if (q.type !== 'multiselect') return q;
      const extras = extraOptions[q.id] ?? [];
      if (extras.length === 0) return q;
      const opts = [...(q.options ?? [])];
      for (const tag of extras) {
        if (!opts.some((o) => o.toLowerCase() === tag.toLowerCase())) {
          opts.push(tag);
        }
      }
      return { ...q, options: opts };
    });
  }, [questions, extraOptions]);

  const persistAnswers = useCallback(
    async (opts?: { complete?: boolean }) => {
      if (!questions.length) return false;
      const answers = buildAnswers();
      const pr = pq ? rowFor(pq) : null;
      const selectedProducts =
        pr && !pr.skipped && 'multi' in pr ? pr.multi : undefined;
      const status =
        opts?.complete || memory?.status === 'complete'
          ? 'complete'
          : 'in_progress';

      const putRes = await putMemoryLayer({
        status,
        answers,
        questions: questionsWithExtras(),
        ...(selectedProducts?.length ? { selectedProducts } : {}),
      });
      if (!isOk(putRes as { success?: boolean })) {
        throw new Error('Save failed');
      }
      const ml = parseMemory(
        (putRes as { data?: { memoryLayer?: unknown } }).data?.memoryLayer
      );
      if (ml) {
        setMemory(ml);
        setExtraOptions({});
      } else {
        await load();
      }
      return true;
    },
    [
      questions.length,
      buildAnswers,
      pq,
      rowFor,
      memory?.status,
      questionsWithExtras,
      load,
    ]
  );

  const handleSaveAnswers = async () => {
    if (!questions.length) return;
    try {
      setSavingAnswers(true);
      await persistAnswers({ complete: true });
      toast.success('Answers saved');
    } catch (e) {
      showErrorToast('Save failed. Please Try Again Later.');
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
      showCaughtErrorToast(e, 'Save failed');
    } finally {
      setSavingDescriptionPath(null);
    }
  };

  const handleUploadPhotos = async () => {
    if (uploadPhotosInFlightRef.current) return;
    if (pendingImages.length === 0) {
      toast.message('Choose images first');
      return;
    }

    uploadPhotosInFlightRef.current = true;
    setUploadingPhotos(true);

    // Keep previews in the UI; upload one-by-one and remove each on success.
    const snapshot = [...pendingImages];
    let uploadedCount = 0;
    let describedCount = 0;
    let describeError: string | undefined;
    const failedNames: string[] = [];

    try {
      for (const item of snapshot) {
        setPendingImages((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? { ...p, uploading: true, failed: false }
              : p
          )
        );

        try {
          const up = await uploadMemoryLayerBrandPhotos(
            [item.file],
            [item.description]
          );
          if (!isOk(up as { success?: boolean })) {
            throw new Error('Photo upload failed');
          }
          const data = (up as {
            data?: {
              memoryLayer?: unknown;
              uploaded?: number;
              described?: number;
              describeError?: string;
              failed?: { index: number; name: string; reason: string }[];
            };
          }).data;

          if (Array.isArray(data?.failed) && data.failed.length > 0) {
            throw new Error(data.failed[0]?.reason || 'Photo upload failed');
          }

          uploadedCount +=
            typeof data?.uploaded === 'number' ? data.uploaded : 1;
          if (typeof data?.described === 'number') {
            describedCount += data.described;
          }
          if (data?.describeError && !describeError) {
            describeError = data.describeError;
          }
          if (data?.memoryLayer) setMemory(parseMemory(data.memoryLayer));

          setPendingImages((prev) => {
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
          failedNames.push(item.file.name || 'image');
          setPendingImages((prev) =>
            prev.map((p) =>
              p.id === item.id
                ? { ...p, uploading: false, failed: true }
                : p
            )
          );
          console.warn('[memory-layer] photo upload failed:', itemErr);
        }
      }

      if (failedNames.length > 0) {
        const names = failedNames.slice(0, 3).join(', ');
        toast.message(
          uploadedCount > 0
            ? `Uploaded ${uploadedCount}; ${failedNames.length} failed${names ? ` (${names})` : ''}`
            : `Upload failed${names ? `: ${names}` : ''}`
        );
      } else if (describeError) {
        toast.message(
          'Photos uploaded — AI descriptions unavailable. You can add them manually.'
        );
      } else if (describedCount > 0) {
        toast.success(
          describedCount === 1
            ? 'Photo uploaded with AI description'
            : `Photos uploaded with ${describedCount} AI descriptions`
        );
      } else if (uploadedCount > 0) {
        toast.success(
          uploadedCount === 1
            ? 'Photo uploaded'
            : `Photos uploaded (${uploadedCount})`
        );
      }
    } finally {
      uploadPhotosInFlightRef.current = false;
      setUploadingPhotos(false);
      setPendingImages((prev) =>
        prev.map((p) => ({ ...p, uploading: false }))
      );
    }
  };

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
      if (!isOk(res as { success?: boolean })) {
        throw new Error('PDF upload failed');
      }
      const data = (res as {
        data?: { memoryLayer?: unknown; sourceDocumentId?: string };
      }).data;
      if (data?.memoryLayer) setMemory(parseMemory(data.memoryLayer));
      setPendingPdf(null);
      toast.success('PDF uploaded');
    } catch (e) {
      showCaughtErrorToast(e, 'PDF upload failed');
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleGenerate = async ({ force = false }: { force?: boolean } = {}) => {
    try {
      setGenerating(true);
      const res = await generateMemoryLayerQuestions({ force });
      if (!isOk(res as { success?: boolean })) {
        throw new Error('Generation failed');
      }
      const ml = parseMemory(
        (res as { data?: { memoryLayer?: unknown } }).data?.memoryLayer
      );
      setMemory(ml);
      toast.success(force ? 'Fresh questions ready' : 'Questions ready');
    } catch (e) {
      showErrorToast('Generation failed. Please Try Again Later.');
    } finally {
      setGenerating(false);
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
      showErrorToast('Remove failed. Please Try Again Later.');
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
    void (async () => {
      const brandPhotos = memoryRef.current?.brandPhotos ?? [];
      const incoming = Array.from(list);
      const staged: PendingImage[] = [];

      for (const f of incoming) {
        if (!isImageFile(f)) {
          showErrorToast(`${f.name} is not an image`);
          continue;
        }
        try {
          const normalized = await normalizeMemoryLayerUploadImage(f);
          staged.push({
            id: makePendingId(normalized),
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

      setPendingImages((prev) => {
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
  };

  const toggleMulti = (q: Question, option: string) => {
    const r = rowFor(q);
    if (r.skipped) return;
    const cur = 'multi' in r ? [...r.multi] : [];
    const i = cur.findIndex(
      (x) => x.toLowerCase() === option.toLowerCase()
    );
    if (i === -1) cur.push(option);
    else cur.splice(i, 1);
    setRow(q.id, { skipped: false, multi: cur });
  };

  const addCustomTag = (q: Question) => {
    const tag = (customTags[q.id] ?? '').trim();
    if (!tag) return;
    const r = rowFor(q);
    if (r.skipped) return;

    const inOptions = (q.options ?? []).some(
      (o) => o.toLowerCase() === tag.toLowerCase()
    );
    const nextExtras = { ...extraOptions };
    if (!inOptions) {
      const cur = nextExtras[q.id] ?? [];
      if (!cur.some((o) => o.toLowerCase() === tag.toLowerCase())) {
        nextExtras[q.id] = [...cur, tag];
      }
    }
    setExtraOptions(nextExtras);

    const cur = 'multi' in r ? [...r.multi] : [];
    if (!cur.some((x) => x.toLowerCase() === tag.toLowerCase())) {
      cur.push(tag);
    }
    setRow(q.id, { skipped: false, multi: cur });
    setCustomTags((prev) => ({ ...prev, [q.id]: '' }));

    // Persist immediately so refresh keeps the new chip.
    void (async () => {
      try {
        const mergedQuestions = questions.map((item) => {
          if (item.id !== q.id || item.type !== 'multiselect') return item;
          const opts = [
            ...(item.options ?? []),
            ...(nextExtras[q.id] ?? []),
          ];
          const unique: string[] = [];
          for (const o of opts) {
            if (!unique.some((u) => u.toLowerCase() === o.toLowerCase())) {
              unique.push(o);
            }
          }
          return { ...item, options: unique };
        });
        const answers = questions.map((item) => {
          if (item.id === q.id) {
            return {
              questionId: item.id,
              skipped: false as const,
              value: cur,
            };
          }
          const row = rowFor(item);
          if (row.skipped) return { questionId: item.id, skipped: true as const };
          if (item.type === 'multiselect' && 'multi' in row) {
            return {
              questionId: item.id,
              skipped: false as const,
              value: row.multi,
            };
          }
          const text =
            row.skipped === false && 'text' in row ? (row.text ?? '') : '';
          return {
            questionId: item.id,
            skipped: false as const,
            value: text,
          };
        });
        const pr = mergedQuestions.find(
          (item) =>
            item.type === 'multiselect' && item.multiselectRole === 'products'
        );
        const selectedProducts =
          pr && pr.id === q.id
            ? cur
            : pr
              ? (() => {
                  const row = rowFor(pr);
                  return !row.skipped && 'multi' in row ? row.multi : undefined;
                })()
              : undefined;
        const putRes = await putMemoryLayer({
          status:
            memory?.status === 'complete' ? 'complete' : 'in_progress',
          answers,
          questions: mergedQuestions,
          ...(selectedProducts?.length ? { selectedProducts } : {}),
        });
        if (!isOk(putRes as { success?: boolean })) {
          throw new Error('Save failed');
        }
        const ml = parseMemory(
          (putRes as { data?: { memoryLayer?: unknown } }).data?.memoryLayer
        );
        if (ml) {
          setMemory(ml);
          setExtraOptions({});
        }
      } catch {
        showErrorToast('Could not save custom line. Please Try Again Later.');
      }
    })();
  };

  const brandPhotos = memory?.brandPhotos ?? [];
  const maxNewSlots = Math.max(
    0,
    30 - brandPhotos.length - pendingImages.length
  );

  const inputBase =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20';

  if (authLoading) return <PageLoadingState />;
  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto pb-20 animate-in fade-in duration-500">
      <div className="mb-8">
        <Link
          href="/template-dna"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Business DNA
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-tr from-violet-600 to-indigo-500 text-white shadow-sm">
            <Brain className="h-5 w-5" />
          </div>
          Business Data
        </h1>
        <p className="mt-3 text-base text-slate-500 max-w-2xl leading-relaxed">
          Product and content signals used when generating posts.
        </p>
      </div>
      {loading ? (
        <PageLoadingState className="min-h-0 py-24" />
      ) : (
        <div className="space-y-10">
          <div
            className="flex gap-1 p-1 rounded-2xl bg-muted border border-border mb-6"
            role="tablist"
            aria-label="Business Data sections"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'questionnaire'}
              onClick={() => setActiveTab('questionnaire')}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors',
                activeTab === 'questionnaire'
                  ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground'
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
                  ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <ImageIcon className="w-4 h-4 shrink-0" />
              Images
            </button>
          </div>

          {/* —— Answers —— */}
          {activeTab === 'questionnaire' ? (
            questions.length ? (
              <section
                className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm"
                role="tabpanel"
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
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={generating || savingAnswers}
                      onClick={() => void handleGenerate({ force: true })}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
                    >
                      {generating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Regenerate questions
                    </button>
                    <button
                      type="button"
                      disabled={savingAnswers || generating}
                      onClick={() => void handleSaveAnswers()}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {savingAnswers ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : null}
                      Save answers
                    </button>
                  </div>
                </div>

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
                              {(() => {
                                const selected =
                                  !r.skipped && 'multi' in r ? r.multi : [];
                                const baseOptions = [
                                  ...(q.options ?? []),
                                  ...(extraOptions[q.id] ?? []),
                                ];
                                const optionList = [
                                  ...baseOptions,
                                  ...selected.filter(
                                    (s) =>
                                      !baseOptions.some(
                                        (o) =>
                                          o.toLowerCase() === s.toLowerCase()
                                      )
                                  ),
                                ];
                                return optionList.map((opt) => {
                                  const sel = selected.some(
                                    (s) =>
                                      s.toLowerCase() === opt.toLowerCase()
                                  );
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => toggleMulti(q, opt)}
                                      className={cn(
                                        'px-3 py-1.5 rounded-lg text-sm border transition-colors',
                                        sel
                                          ? 'bg-blue-100 border-blue-300 text-blue-900'
                                          : 'hover:bg-blue-50 hover:border-blue-300 hover:text-blue-900 border-slate-200 text-slate-700'
                                      )}
                                    >
                                      {opt}
                                    </button>
                                  );
                                });
                              })()}
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
                                disabled={!(customTags[q.id] ?? '').trim()}
                                className="px-3 py-2 rounded-lg bg-slate-100 text-sm font-medium text-slate-800 disabled:opacity-40"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        ) : q.type === 'textarea' || q.type === 'text' ? (
                          <div className="space-y-3">
                            {(() => {
                              const answerSuggestions = (q.suggestions ?? [])
                                .map((s) => String(s ?? '').trim())
                                .filter(Boolean)
                                .slice(0, 2);
                              const currentText =
                                r.skipped === false && 'text' in r
                                  ? (r.text ?? '')
                                  : '';
                              return (
                                <>
                                  <div className="space-y-2">
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                      Suggestions — click to fill
                                    </p>
                                    {answerSuggestions.length > 0 ? (
                                      <div className="flex flex-col gap-2">
                                        {answerSuggestions.map((s) => {
                                          const active =
                                            currentText.trim().toLowerCase() ===
                                            s.toLowerCase();
                                          return (
                                            <button
                                              key={`${q.id}-suggest-${s}`}
                                              type="button"
                                              onClick={() =>
                                                setRow(q.id, {
                                                  skipped: false,
                                                  text: s,
                                                })
                                              }
                                              className={cn(
                                                'inline-flex w-full items-start rounded-xl border px-3 py-2.5 text-left text-sm leading-snug transition-colors',
                                                active
                                                  ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                                                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/60'
                                              )}
                                            >
                                              <span className="break-words">
                                                {s}
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
                                        No suggestions yet — regenerate
                                        questions or type your own answer.
                                      </p>
                                    )}
                                  </div>
                                  {q.type === 'textarea' ? (
                                    <textarea
                                      rows={4}
                                      value={currentText}
                                      onChange={(e) =>
                                        setRow(q.id, {
                                          skipped: false,
                                          text: e.target.value,
                                        })
                                      }
                                      placeholder={
                                        answerSuggestions.length > 0
                                          ? 'Write your answer or click a suggestion above…'
                                          : 'Write your answer…'
                                      }
                                      className={cn(
                                        inputBase,
                                        'resize-y min-h-[100px]'
                                      )}
                                    />
                                  ) : (
                                    <input
                                      type="text"
                                      value={currentText}
                                      onChange={(e) =>
                                        setRow(q.id, {
                                          skipped: false,
                                          text: e.target.value,
                                        })
                                      }
                                      placeholder={
                                        answerSuggestions.length > 0
                                          ? 'Type your answer or click a suggestion above…'
                                          : 'Type your answer…'
                                      }
                                      className={inputBase}
                                    />
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        ) : null}
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
            ) : (
              <section
              className="glass-card rounded-3xl p-8 border border-slate-200 shadow-sm"
              role="tabpanel"
            >
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Your brand questionnaire isn&apos;t set up yet
              </h3>
              <p className="text-slate-600 mb-6">
                Make sure your business profile is filled in — we&apos;ll use it
                to craft a personalized set of questions you can revisit and
                update anytime.
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
                Build my questionnaire
              </button>
            </section>
            )
          ) : null}
          {/* —— Photos —— */}
          <section
            className={cn(
              'glass-card rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm',
              activeTab !== 'images' && 'hidden'
            )}
            role="tabpanel"
            hidden={activeTab !== 'images'}
          >
            {activeTab === "images" && (
              <section
                className={cn(
                  'mb-10 rounded-3xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-sm ring-1 ring-border/60 transition-opacity',
                  !memoryLayerPrefReady && 'opacity-75'
                )}
                aria-busy={savingMemoryLayerPref || !memoryLayerPrefReady}
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-4 min-w-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500/15 to-indigo-500/20 text-indigo-600 shadow-inner ring-1 ring-indigo-100/60">
                      <Sparkles className="h-6 w-6" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold tracking-tight text-slate-900">
                        Send brand images
                      </h2>
                      <p className="mt-1.5 text-sm text-slate-600 leading-relaxed max-w-xl">
                        Upload product photos only. When this is on, those
                        product images are shared with generation so Auto-mode
                        video can run product-advert scenes and captions/visuals
                        can match your products. Turn it off anytime to use
                        AI Engine image generation without product photos.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:shrink-0 sm:pl-4">
                    {!memoryLayerPrefReady ? (
                      <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                        Loading…
                      </span>
                    ) : savingMemoryLayerPref ? (
                      <span className="inline-flex items-center gap-2 text-xs font-medium text-indigo-600 whitespace-nowrap">
                        <Loader2
                          className="h-4 w-4 animate-spin shrink-0"
                          aria-hidden
                        />
                        Saving…
                      </span>
                    ) : (
                      <span
                        className={cn(
                          'text-xs font-semibold whitespace-nowrap tabular-nums',
                          memoryLayerEnabled
                            ? 'text-emerald-700'
                            : 'text-slate-400'
                        )}
                      >
                        {memoryLayerEnabled ? 'On' : 'Off'}
                      </span>
                    )}
                    <Switch
                      checked={Boolean(memoryLayerEnabled)}
                      disabled={
                        !memoryLayerPrefReady || savingMemoryLayerPref
                      }
                      onCheckedChange={(c) => void handleMemoryLayerToggle(c)}
                      aria-label={
                        memoryLayerEnabled
                          ? 'Disable sending brand images'
                          : 'Enable sending brand images'
                      }
                    />
                  </div>
                </div>

                {memoryLayerEnabled ? (
                  <div className="mt-5 flex flex-col gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        Brand photo usage
                      </p>
                      <p className="mt-1 text-sm text-slate-600 leading-relaxed max-w-xl">
                        Strict mode always uses a Memory Layer photo. Non-strict
                        randomly mixes Memory Layer runs with generations that
                        skip brand photos.
                      </p>
                    </div>
                    <Select
                      value={memoryLayerStrict ? 'strict' : 'non-strict'}
                      disabled={
                        !memoryLayerPrefReady || savingMemoryLayerPref
                      }
                      onValueChange={(v) =>
                        void handleMemoryLayerStrictChange(v === 'strict')
                      }
                    >
                      <SelectTrigger
                        className="w-full sm:w-[240px]"
                        aria-label="Brand photo usage mode"
                      >
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="strict">
                          Strictly use Memory Layer
                        </SelectItem>
                        <SelectItem value="non-strict">
                          Not strictly use
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {showStrictPhotoWarning ? (
                  <div
                    role="alert"
                    className="mt-5 flex items-start gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3.5 py-3 text-sm shadow-sm ring-1 ring-amber-500/20"
                  >
                    <TriangleAlert
                      className="mt-0.5 size-4 shrink-0 text-amber-300"
                      aria-hidden
                    />
                    <div className="min-w-0 space-y-1">
                      <p className="font-semibold text-amber-200">
                        Few product photos
                      </p>
                      <p className="leading-relaxed text-amber-100/85">
                        You have fewer than 10 product photos. Turn off Strictly
                        use Memory Layer so generation can also run without brand
                        photos and avoid repeating the same images too often.
                      </p>
                    </div>
                  </div>
                ) : null}
              </section>
            )}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6 pb-4 border-b border-slate-100">

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Brand reference photos
                </h2>
                <p className="text-sm text-slate-500 mt-1 max-w-[48ch]">
                  Product photos only — upload a product brochure PDF or
                  individual product images. SocioGenie suggests descriptions
                  when you leave them blank — edit anytime. Up to 30 images
                  total.
                </p>
              </div>
              <button
                type="button"
                disabled={
                  uploadingPhotos ||
                  pendingImages.length === 0 ||
                  isExtracting
                }
                onClick={() => void handleUploadPhotos()}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 disabled:opacity-60 shrink-0"
              >
                {uploadingPhotos ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Uploading…
                  </>
                ) : (
                  'Upload new photos'
                )}
              </button>
            </div>

            {isExtracting && (
              <p className="mb-6 text-xs font-medium text-violet-800 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Processing upload…
              </p>
            )}

            <div className="mb-8 rounded-xl border border-dashed border-slate-300 bg-slate-500/80 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-black mb-2">
                Import from PDF
              </h3>
              <p className="text-sm text-black mb-3 max-w-[52ch]">
                Upload a product brochure or catalog PDF (max 50MB).
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <label
                  htmlFor={pdfInputId}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-50',
                    (isExtracting) &&
                      'opacity-60 pointer-events-none'
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
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Clear
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={
                    !pendingPdf || isExtracting
                  }
                  onClick={() => void handleUploadPdf()}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-violet-700 disabled:opacity-60"
                >
                  Upload PDF
                </button>
              </div>
            </div>

            {brandPhotos.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                  Saved
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
                          className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-black/60 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity hover:bg-red-600"
                          aria-label="Remove photo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <label className="text-xs font-medium text-slate-600">
                            Image description (max {BRAND_PHOTO_DESCRIPTION_MAX}{' '}
                            characters)
                          </label>
                          {p.descriptionSource === 'ai' ? (
                            <span className="text-[10px] font-medium uppercase tracking-wide text-violet-600">
                              Suggested
                            </span>
                          ) : null}
                        </div>
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
                          placeholder="SocioGenie Suggests a description when empty — edit anytime"
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
                className={cn(
                  'inline-flex items-center gap-2 rounded-xl border-2  bg-white px-4 py-3 text-sm font-semibold text-indigo-800 cursor-pointer shadow-sm hover:bg-indigo-50 hover:border-indigo-400',
                  isExtracting && 'opacity-60 pointer-events-none'
                )}
              >
                <ImagePlus className="w-4 h-4 text-indigo-600" />
                Choose images
                <input
                  id={fileInputId}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  disabled={isExtracting}
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
                {maxNewSlots === 1 ? '' : 's'} left. JPEG, PNG, or WebP upload
                best. Large images are resized automatically. Leave descriptions
                blank for suggestions.
              </p>
            </div>

            {pendingImages.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
                  {uploadingPhotos
                    ? `Uploading… (${pendingImages.length} left)`
                    : `Ready to upload (${pendingImages.length})`}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pendingImages.map((p) => (
                    <div
                      key={p.id}
                      className={cn(
                        'rounded-xl border overflow-hidden p-2 space-y-2 ring-1',
                        p.failed
                          ? 'border-red-300 bg-red-50/50 ring-red-100'
                          : 'border-emerald-200 bg-emerald-50/40 ring-emerald-100'
                      )}
                    >
                      <div className="relative aspect-square max-h-[220px] sm:max-h-none rounded-lg overflow-hidden bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.previewUrl}
                          alt={p.file.name}
                          className="w-full h-full object-cover"
                        />
                        {p.uploading ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 text-white">
                            <Loader2
                              className="h-6 w-6 animate-spin"
                              aria-hidden
                            />
                            <span className="text-xs font-medium">Uploading…</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => removePending(p.id)}
                            disabled={uploadingPhotos}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-red-600 disabled:opacity-40"
                            aria-label="Remove from queue"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <p className="absolute bottom-0 left-0 right-0 truncate bg-black/50 text-[10px] text-white px-2 py-1">
                          {p.failed ? `Failed · ${p.file.name}` : p.file.name}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">
                          Image description (optional — SocioGenie fills if blank)
                        </label>
                        <textarea
                          value={p.description}
                          disabled={!!p.uploading || uploadingPhotos}
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
                          placeholder="Optional — leave blank for suggestion"
                          className={cn(
                            inputBase,
                            'text-sm py-2 resize-y min-h-[72px] disabled:opacity-60'
                          )}
                        />
                        <p className="text-[10px] text-slate-400 text-right">
                          {p.description.length}/
                          {BRAND_PHOTO_DESCRIPTION_MAX}
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
                disabled={
                  uploadingPhotos ||
                  pendingImages.length === 0 ||
                  isExtracting
                }
                onClick={() => void handleUploadPhotos()}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-60"
              >
                {uploadingPhotos ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Uploading…
                  </>
                ) : (
                  'Upload new photos'
                )}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
