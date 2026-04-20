'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  generateMemoryLayerQuestions,
  getMemoryLayer,
  putMemoryLayer,
  uploadMemoryLayerBrandPhotos,
  type MemoryLayerAnswerPayload,
} from '@/src/service/api/userService';

type Question = {
  id: string;
  prompt: string;
  type: 'text' | 'textarea' | 'multiselect';
  options?: string[];
  multiselectRole?: 'products';
};

type MemoryPayload = {
  status?: string;
  questions?: Question[];
  answers?: MemoryLayerAnswerPayload[];
  brandPhotos?: { url: string }[];
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

export default function BrandMemoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [phase, setPhase] = useState<'qa' | 'photos'>('qa');
  const [qIndex, setQIndex] = useState(0);
  const [draft, setDraft] = useState<Record<string, DraftRow>>({});
  const [customTag, setCustomTag] = useState('');
  const [brandPhotosMeta, setBrandPhotosMeta] = useState<
    { url: string }[]
  >([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMemoryLayer();
      if (!isEnvelopeOk(res as { success?: boolean })) {
        throw new Error('Failed to load brand memory');
      }
      const raw = (
        res as { data?: { memoryLayer?: unknown } }
      ).data?.memoryLayer;
      const ml = parseMemory(raw);
      if (
        ml?.status === 'complete' ||
        ml?.status === 'skipped'
      ) {
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
      toast.error(
        e instanceof Error ? e.message : 'Something went wrong'
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = questions[qIndex];

  useEffect(() => {
    setCustomTag('');
  }, [qIndex, current?.id]);

  const slotsAfterPending = 30 - brandPhotosMeta.length - pendingFiles.length;
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

  const toggleMulti = useCallback(
    (q: Question, option: string) => {
      const r = rowFor(q);
      if (r.skipped) return;
      const cur = 'multi' in r ? [...r.multi] : [];
      const i = cur.indexOf(option);
      if (i === -1) cur.push(option);
      else cur.splice(i, 1);
      setRow(q.id, { skipped: false, multi: cur });
    },
    [rowFor, setRow]
  );

  const addCustomProduct = useCallback(
    (q: Question) => {
      const t = customTag.trim();
      if (!t) return;
      const r = rowFor(q);
      if (r.skipped) return;
      const cur = 'multi' in r ? [...r.multi] : [];
      if (!cur.includes(t)) cur.push(t);
      setRow(q.id, { skipped: false, multi: cur });
      setCustomTag('');
    },
    [customTag, rowFor, setRow]
  );

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
      const text = r.skipped === false && 'text' in r ? r.text ?? '' : '';
      return { questionId: q.id, skipped: false, value: text };
    });
  }, [questions, rowFor]);

  const skipEntire = useCallback(async () => {
    try {
      setSubmitting(true);
      const res = await putMemoryLayer({ status: 'skipped' });
      if (!isEnvelopeOk(res as { success?: boolean })) {
        throw new Error('Failed to skip');
      }
      router.replace('/home');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to skip');
    } finally {
      setSubmitting(false);
    }
  }, [router]);

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

  const onFilesPicked = useCallback(
    (list: FileList | null) => {
      if (!list?.length) return;
      const maxPending = 30 - brandPhotosMeta.length;
      setPendingFiles((prev) => {
        const next = [...prev];
        for (let i = 0; i < list.length; i++) {
          if (next.length >= maxPending) {
            toast.message(
              `Maximum ${maxPending} new file(s) for this step (30 images total including existing)`
            );
            break;
          }
          const f = list.item(i);
          if (!f) continue;
          if (!f.type.startsWith('image/')) {
            toast.error(`${f.name} is not an image`);
            continue;
          }
          next.push(f);
        }
        return next;
      });
    },
    [brandPhotosMeta.length]
  );

  const finish = useCallback(async () => {
    try {
      setSubmitting(true);
      const answers = buildAnswers();
      const pq = questions.find(
        (q) => q.type === 'multiselect' && q.multiselectRole === 'products'
      );
      const pr = pq ? rowFor(pq) : null;
      const selectedProducts =
        pr && !pr.skipped && 'multi' in pr ? pr.multi : undefined;

      if (pendingFiles.length > 0) {
        const up = await uploadMemoryLayerBrandPhotos(pendingFiles);
        if (!isEnvelopeOk(up as { success?: boolean })) {
          throw new Error('Photo upload failed');
        }
      }

      const res = await putMemoryLayer({
        status: 'complete',
        answers,
        ...(selectedProducts?.length ? { selectedProducts } : {}),
      });
      if (!isEnvelopeOk(res as { success?: boolean })) {
        throw new Error('Failed to save');
      }
      toast.success('Saved');
      router.replace('/home');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to finish');
    } finally {
      setSubmitting(false);
    }
  }, [buildAnswers, pendingFiles, questions, router, rowFor]);

  const skipPhotos = useCallback(async () => {
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
        ...(selectedProducts?.length ? { selectedProducts } : {}),
      });
      if (!isEnvelopeOk(res as { success?: boolean })) {
        throw new Error('Failed to save');
      }
      router.replace('/home');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSubmitting(false);
    }
  }, [buildAnswers, questions, router, rowFor]);

  const panelClass =
    'max-w-lg w-full bg-white/5 border border-white/10 rounded-2xl p-8 text-white shadow-[0_0_40px_rgba(0,209,255,0.15)]';

  const questionBody = useMemo(() => {
    if (!current) return null;
    const r = rowFor(current);
    if (current.type === 'multiselect' && current.options?.length) {
      const selected = !r.skipped && 'multi' in r ? r.multi : [];
      return (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {current.options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => toggleMulti(current, opt)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm border transition-colors',
                  selected.includes(opt)
                    ? 'bg-[#6C5CE7]/80 border-[#00D1FF]/80 text-white'
                    : 'bg-white/5 border-white/10 text-gray-900 hover:bg-white/10'
                )}
              >
                {opt}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomProduct(current);
                }
              }}
              placeholder="Add your own product line"
              className="flex-1 bg-white/10 border border-black/20 rounded-lg p-2 text-gray-900 placeholder:text-gray-500"
            />
            <button
              type="button"
              onClick={() => addCustomProduct(current)}
              className="px-3 py-2 rounded-lg bg-linear-to-r from-[#6C5CE7] to-[#00D1FF] text-white text-sm"
            >
              Add
            </button>
          </div>
        </div>
      );
    }
    const textVal =
      r.skipped === false && 'text' in r ? r.text ?? '' : '';
    if (current.type === 'textarea') {
      return (
        <textarea
          rows={4}
          value={textVal}
          onChange={(e) =>
            setRow(current.id, { skipped: false, text: e.target.value })
          }
          className="w-full bg-white/10 border border-black/20 rounded-lg p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/50"
        />
      );
    }
    return (
      <input
        type="text"
        value={textVal}
        onChange={(e) =>
          setRow(current.id, { skipped: false, text: e.target.value })
        }
        className="w-full bg-white/10 border border-black/20 rounded-lg p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00D1FF]/50"
      />
    );
  }, [
    addCustomProduct,
    current,
    customTag,
    rowFor,
    setRow,
    toggleMulti,
  ]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex mx-auto w-full items-center justify-center text-zinc-600">
        Loading…
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="min-h-[60vh] flex mx-auto w-full items-center justify-center">
        <div className={panelClass}>
          <p className="text-center text-gray-300">No questions available.</p>
          <button
            type="button"
            className="mt-4 w-full py-2 rounded-lg bg-linear-to-r from-[#00D1FF] to-[#6C5CE7] text-white"
            onClick={() => router.replace('/home')}
          >
            Continue to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center backdrop-blur-sm p-4">
      <div className={panelClass}>
        <div className="flex justify-between items-start gap-4 mb-4">
          <h1 className="text-xl font-bold text-transparent bg-clip-text bg-linear-to-r from-[#6C5CE7] to-[#00D1FF]">
            {phase === 'qa' ? 'Tell us about your brand' : 'Brand photos'}
          </h1>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void skipEntire()}
            className="text-sm text-black/50 hover:text-black/70 shrink-0"
          >
            Skip entire setup
          </button>
        </div>

        {phase === 'qa' && current && (
          <>
            <p className="text-sm text-gray-400 mb-2">
              Question {qIndex + 1} of {questions.length}
            </p>
            <p className="text-gray-900 mb-4 font-medium">{current.prompt}</p>
            {questionBody}
            <div className="mt-8 flex justify-between gap-4 flex-wrap">
              <button
                type="button"
                onClick={goBack}
                disabled={qIndex === 0}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm',
                  qIndex === 0
                    ? 'opacity-40 cursor-not-allowed'
                    : 'bg-white/10 hover:bg-white/15'
                )}
              >
                Back
              </button>
              <button
                type="button"
                onClick={skipQuestion}
                className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-700"
              >
                Skip question
              </button>
              <button
                type="button"
                onClick={goNext}
                className="px-6 py-2 rounded-lg text-sm bg-linear-to-r from-[#00D1FF] to-[#6C5CE7] text-white"
              >
                {qIndex < questions.length - 1 ? 'Next' : 'Continue to photos'}
              </button>
            </div>
          </>
        )}

        {phase === 'photos' && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Optional: you can add {remainingPhotoSlots} more image
              {remainingPhotoSlots === 1 ? '' : 's'} in this step (30 max in storage
              {brandPhotosMeta.length > 0
                ? `, ${brandPhotosMeta.length} already saved`
                : ''}
              {pendingFiles.length > 0
                ? `, ${pendingFiles.length} staged`
                : ''}
              ).
            </p>
            <label className="block border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:bg-white/5">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => onFilesPicked(e.target.files)}
              />
              <span className="text-gray-700">Drop or click to add images</span>
            </label>
            {pendingFiles.length > 0 && (
              <ul className="mt-3 text-sm text-gray-600 space-y-1">
                {pendingFiles.map((f) => (
                  <li key={f.name + f.size}>{f.name}</li>
                ))}
              </ul>
            )}
            <div className="mt-8 flex justify-between gap-4 flex-wrap">
              <button
                type="button"
                onClick={goBack}
                className="px-4 py-2 rounded-lg text-sm bg-white/10 hover:bg-white/15"
              >
                Back
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void skipPhotos()}
                className="px-4 py-2 rounded-lg text-sm text-gray-600"
              >
                Skip photos
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void finish()}
                className="px-6 py-2 rounded-lg text-sm bg-linear-to-r from-[#00D1FF] to-[#6C5CE7] text-white"
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
