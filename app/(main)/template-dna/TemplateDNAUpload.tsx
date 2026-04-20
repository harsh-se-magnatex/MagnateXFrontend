'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import {
  extractTemplateDNA,
  getTemplateDNA,
  type PostTemplateDNA,
  type TemplateDNAPlatform,
} from '@/src/service/api/template-dna.service';
import {
  UploadCloud,
  X,
  Sparkles,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  CircleX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

function isValidImageFile(file: File): boolean {
  return ACCEPTED_IMAGE_TYPES.includes(file.type);
}

const PLATFORM_LABELS: Record<TemplateDNAPlatform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
};

interface TemplateDNAUploadProps {
  platform: TemplateDNAPlatform;
}

export function TemplateDNAUpload({ platform }: TemplateDNAUploadProps) {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadSavedLoading, setLoadSavedLoading] = useState(true);
  const [templateDNA, setTemplateDNA] = useState<PostTemplateDNA | {}>({});

  const platformLabel = PLATFORM_LABELS[platform];
  const maxImages = 10;

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    setImageError(null);
    const files = Array.from(newFiles);
    const valid = files.filter((f) => isValidImageFile(f));
    const invalidCount = files.length - valid.length;
    if (invalidCount > 0) {
      setImageError(
        `Skipped ${invalidCount} invalid file(s). Use JPEG, PNG, GIF, or WebP.`
      );
    }
    setSelectedImages((prev) => {
      const combined = [...prev, ...valid].slice(0, maxImages);
      if (combined.length > maxImages) {
        setImageError(
          `Maximum ${maxImages} images. Only the first ${maxImages} are used.`
        );
      }
      return combined.slice(0, maxImages);
    });
  }, []);

  const removeImage = useCallback((index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImageError(null);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files?.length) addFiles(files);
    },
    [addFiles]
  );

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length) addFiles(files);
    e.target.value = '';
  };

  const previewUrls = useMemo(
    () => selectedImages.map((f) => URL.createObjectURL(f)),
    [selectedImages]
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadSavedLoading(true);
      try {
        const saved = await getTemplateDNA(platform)as PostTemplateDNA;
        if (!cancelled) setTemplateDNA(saved);
      } catch {
        if (!cancelled) setTemplateDNA({});
      } finally {
        if (!cancelled) setLoadSavedLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [platform]);

  const handleExtract = async () => {
    if (!selectedImages.length) return;
    setLoading(true);
    try {
      const dna = await extractTemplateDNA(selectedImages, platform);
      setTemplateDNA(dna);
    } catch (err: any) {
   
      toast.error(err.response.data.message || 'Failed to extract template DNA');
    } finally {
      setLoading(false);
    }
  };

  const clearImages = () => {
    setSelectedImages([]);
    setImageError(null);
  };

  return (
    <div className="gap-8 flex sm:flex-row flex-col max-w-6xl mx-auto w-full animate-in fade-in duration-500 h-full">
      <section className="space-y-6 min-w-[50%] max-h-[50%]">
        <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm  overflow-hidden ">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Upload Images
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                We'll analyze them with AI for {platformLabel}
              </p>
            </div>
          </div>

          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={cn(
              'relative rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col group min-h-[300px]',
              isDragging
                ? 'border-indigo-400 bg-indigo-50/50'
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50'
            )}
          >
            {selectedImages.length > 0 ? (
              <div className="p-6 flex flex-col h-full">
                <div className="flex-1">
                  <div className="flex flex-wrap gap-4 mb-6">
                    <AnimatePresence>
                      {selectedImages.map((file, index) => (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          key={index}
                          className="relative inline-block group/img"
                        >
                          <img
                            src={previewUrls[index]}
                            alt={`Post preview ${index + 1}`}
                            className="h-28 w-28 rounded-xl object-cover border border-slate-200 shadow-sm"
                          />
                          <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover/img:opacity-100 transition-opacity rounded-xl" />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 rounded-full bg-white p-1.5 text-slate-500 shadow-sm border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors opacity-0 group-hover/img:opacity-100"
                            aria-label="Remove image"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-auto">
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                      Add more
                      <input
                        type="file"
                        accept={ACCEPTED_IMAGE_TYPES.join(',')}
                        onChange={onFileInputChange}
                        multiple
                        className="sr-only"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={clearImages}
                      className="text-sm font-medium text-slate-500 hover:text-rose-600 transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  <p className="text-xs font-medium text-slate-400">
                    {selectedImages.length} / {maxImages} max
                  </p>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-10 h-full cursor-pointer rounded-2xl text-center">
                <div className="w-16 h-16 mb-4 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 group-hover:border-indigo-200 group-hover:shadow-md transition-all group-hover:scale-105">
                  <ImageIcon className="w-8 h-8 opacity-80" />
                </div>
                <span className="text-base font-bold text-slate-700 mb-1">
                  Click to upload images
                </span>
                <span className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
                  or drag and drop them here. Use JPEG, PNG, or WebP.
                </span>
                <input
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES.join(',')}
                  onChange={onFileInputChange}
                  multiple
                  className="sr-only"
                />
              </label>
            )}
          </div>

          <AnimatePresence>
            {imageError && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="mt-4 flex gap-2 items-start text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-sm font-medium leading-tight">
                  {imageError}
                </p>
              </motion.div>
            )}
          
          </AnimatePresence>

          <div className="mt-6">
            <button
              type="button"
              onClick={handleExtract}
              disabled={selectedImages.length === 0 || loading}
              className="w-full flex justify-center items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700 hover:-translate-y-0.5 active:scale-[0.98] disabled:transform-none disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-500/30 border-t-slate-500 rounded-full animate-spin" />
                  Extracting DNA...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Extract Template DNA
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-6 flex flex-col min-w-[50%]">
        <div className="glass-card rounded-3xl min-h-full p-6 sm:p-8 border border-slate-200 shadow-sm ">
          <div className="  gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'p-2.5 rounded-xl transition-colors',
                  Object.entries(templateDNA).length>0
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-slate-50 text-slate-500'
                )}
              >
                {Object.entries(templateDNA).length>0 ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <CircleX className="w-5 h-5" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {Object.entries(templateDNA).length>0?"Extracted DNA":"No DNA Found"}
                </h2>
              </div>
            </div>
          </div>

          <div className="max-h-[90%]">
            {loadSavedLoading ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-100 flex-col gap-3">
                <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-sm font-medium">Loading saved template...</p>
              </div>
            ) : Object.keys(templateDNA).length===0  ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed p-8 text-center max-w-sm mx-auto w-full">
                <Sparkles className="w-8 h-8 mb-3 opacity-50" />
                <h3 className="text-slate-700 font-bold mb-1">No DNA Found</h3>
                <p className="text-sm leading-relaxed">
                  No template DNA saved for {platformLabel}. Upload images and
                  extract to establish your brand baseline.
                </p>
              </div>
            ) : (
              <div className="flex-1 bg-slate-900 rounded-2xl overflow-hidden flex flex-col shadow-inner max-h-[60%]">
                <div className="bg-slate-800/80 px-4 py-2 border-b border-slate-700/50 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">
                    DNA Profile
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>
                <div className="p-5  overflow-auto custom-scrollbar max-h-80">
                  <pre className="text-xs text-sky-300 whitespace-pre-wrap font-mono leading-relaxed">
                    {Object.entries(templateDNA)
                      .join('\n')
                      .split(',')
                      .join(': ')}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
