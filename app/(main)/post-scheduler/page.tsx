'use client';

import { useAuth } from '@/src/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import {
  Calendar,
  Clock,
  Image as ImageIcon,
  Send,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { scheduleUserPost } from '@/src/service/api/userService';
import { getTodatDate } from '@/utils/getTodayDate';
import { toast } from 'sonner';
import { useUserPlanCredits } from '../_components/UserPlanCreditsProvider';
import {
  consumePostSchedulerPrefill,
  type PostSchedulerPrefillPayload,
} from '@/lib/post-scheduler-prefill-store';

const inputBase =
  'w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all';

const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const PLATFORM_ORDER = ['instagram', 'facebook', 'linkedin'] as const;
type SchedulerPlatform = (typeof PLATFORM_ORDER)[number];

function firstEnabledPlatform(
  accounts: Partial<Record<SchedulerPlatform, boolean>> | null | undefined
): SchedulerPlatform | undefined {
  if (!accounts) return undefined;
  return PLATFORM_ORDER.find((p) => accounts[p] === true);
}

/** Firestore timestamp as returned from API (seconds + nanoseconds) */
type FirestoreTimestamp = {
  _seconds: number;
  _nanoseconds: number;
};

export type ScheduledPost = {
  message: string;
  imageUrl: string | null;
  scheduleAt: FirestoreTimestamp;
  platform: string;
  postStatus: 'pending' | 'processing' | 'posted' | 'failed';
  failedAt: FirestoreTimestamp | null;
  error: string | null;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
  postedAt: FirestoreTimestamp | null;
};

function formatTimestamp(ts: FirestoreTimestamp | null): string {
  if (!ts) return '—';
  const date = new Date(ts._seconds * 1000 + ts._nanoseconds / 1e6);
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function isValidImageFile(file: File): boolean {
  return ACCEPTED_IMAGE_TYPES.includes(file.type);
}

export default function PostSchedulePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [prefilledImageUrl, setPrefilledImageUrl] = useState<string | null>(
    null
  );
  const [prefilledPosts, setPrefilledPosts] = useState<
    Array<{ imageUrl: string; message: string; platform: SchedulerPlatform }>
  >([]);
  const [lockedPlatform, setLockedPlatform] = useState<
    SchedulerPlatform | 'all_platforms' | null
  >(null);
  const [message, setMessage] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [platform, setPlatform] = useState<SchedulerPlatform | ''>('');
  const [isDragging, setIsDragging] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [postLoading, setPostLoading] = useState(false);

  const hasImage = selectedImage !== null || Boolean(prefilledImageUrl);
  const hasMessageOnly = !hasImage && message.trim().length > 0;
  const imageAreaDisabled = hasMessageOnly;
  const formattedToday = getTodatDate();
  const { billing, loading: creditsLoading } = useUserPlanCredits();
  const selectedAccounts = billing?.selected;
  const inputLabel = hasImage ? 'Caption' : 'Message';

  const hasSelectablePlatforms = useMemo(
    () => !!firstEnabledPlatform(selectedAccounts),
    [selectedAccounts]
  );

  const showSelectAccountsFirst =
    !creditsLoading && billing != null && !hasSelectablePlatforms;

  useEffect(() => {
    if (lockedPlatform === 'all_platforms') return;
    if (lockedPlatform && PLATFORM_ORDER.includes(lockedPlatform)) {
      if (platform !== lockedPlatform) setPlatform(lockedPlatform);
      return;
    }
    const first = firstEnabledPlatform(selectedAccounts);
    if (!first) {
      setPlatform('');
      return;
    }
    if (!platform) {
      setPlatform(first);
      return;
    }
    if (!selectedAccounts?.[platform]) {
      setPlatform(first);
    }
  }, [selectedAccounts, platform, lockedPlatform]);

  const handleFile = useCallback((file: File | null) => {
    setImageError(null);
    if (!file) {
      setSelectedImage(null);
      return;
    }
    if (!isValidImageFile(file)) {
      setImageError('Please use a valid image (JPEG, PNG, GIF, or WebP).');
      return;
    }
    setPrefilledImageUrl(null);
    setSelectedImage(file);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (imageAreaDisabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [imageAreaDisabled, handleFile]
  );

  const onDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (imageAreaDisabled) return;
      setIsDragging(true);
    },
    [imageAreaDisabled]
  );

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const clearImage = () => {
    setSelectedImage(null);
    setPrefilledImageUrl(null);
    setPrefilledPosts([]);
    setImageError(null);
  };

  const previewUrl = useMemo(() => {
    if (selectedImage) return URL.createObjectURL(selectedImage);
    return prefilledImageUrl;
  }, [selectedImage, prefilledImageUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl && selectedImage) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl, selectedImage]);

  const scheduledAt =
    scheduleDate && scheduleTime ? `${scheduleDate}T${scheduleTime}` : '';

  const isAllPlatformsLocked = lockedPlatform === 'all_platforms';
  const hasValidPlatformTarget = isAllPlatformsLocked || platform.length > 0;
  const hasAllPlatformCaptions =
    !isAllPlatformsLocked ||
    prefilledPosts.some((post) => post.message.trim().length > 0);
  const canSchedule =
    (isAllPlatformsLocked ? hasAllPlatformCaptions : message.trim().length > 0) &&
    hasImage &&
    hasValidPlatformTarget &&
    scheduleDate.length > 0 &&
    scheduleTime.length > 0 &&
    hasSelectablePlatforms &&
    !showSelectAccountsFirst;

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [loading, user, router]);

  useEffect(() => {
    const shouldPrefill = searchParams.get('prefill') === 'product-advert';
    if (!shouldPrefill) return;
    const payload = consumePostSchedulerPrefill() as
      | PostSchedulerPrefillPayload
      | null;
    if (!payload) return;

    const parsedPosts = Array.isArray(payload.posts)
      ? payload.posts
          .map((item) => ({
            imageUrl: String(item?.imageUrl ?? '').trim(),
            message: String(item?.message ?? '').trim(),
            platform: String(item?.platform ?? '').toLowerCase() as SchedulerPlatform,
          }))
          .filter(
            (item) => !!item.imageUrl && PLATFORM_ORDER.includes(item.platform)
          )
      : [];
    if (parsedPosts.length > 0) {
      setPrefilledPosts(parsedPosts);
      setPrefilledImageUrl(parsedPosts[0].imageUrl);
      setMessage(parsedPosts[0].message);
    }
    if (
      payload.lockedPlatform === 'all_platforms' ||
      PLATFORM_ORDER.includes(payload.lockedPlatform as SchedulerPlatform)
    ) {
      setLockedPlatform(payload.lockedPlatform);
      if (payload.lockedPlatform !== 'all_platforms') {
        setPlatform(payload.lockedPlatform);
      }
    } else if (parsedPosts.length === 1) {
      setLockedPlatform(parsedPosts[0].platform);
      setPlatform(parsedPosts[0].platform);
    } else if (parsedPosts.length > 1) {
      setLockedPlatform('all_platforms');
    }
  }, [searchParams]);

  if (loading) return null;
  if (!user) return null;
  const handleSchedulePost = async () => {
    if (!canSchedule) return;
    try {
      setPostLoading(true);
      const buildFileFromImageUrl = async (imageUrl: string, index: number) => {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        return new File([blob], `product-advert-${Date.now()}-${index}.png`, {
          type: blob.type || 'image/png',
        });
      };

      if (isAllPlatformsLocked && prefilledPosts.length > 0) {
        const postsToSchedule = prefilledPosts.filter(
          (post) => selectedAccounts?.[post.platform]
        );
        if (postsToSchedule.length === 0) {
          throw new Error('No connected platforms available for scheduling.');
        }
        await Promise.all(
          postsToSchedule.map(async (post, index) => {
            const file = await buildFileFromImageUrl(post.imageUrl, index);
            return scheduleUserPost(
              file,
              post.message || message,
              scheduledAt,
              post.platform
            );
          })
        );
        toast.success('Posts scheduled successfully');
        return;
      }

      let fileToSchedule = selectedImage;
      if (!fileToSchedule && prefilledImageUrl) {
        fileToSchedule = await buildFileFromImageUrl(prefilledImageUrl, 0);
      }
      if (!fileToSchedule) {
        throw new Error('Please attach an image before scheduling.');
      }

      const response = await scheduleUserPost(
        fileToSchedule,
        message,
        scheduledAt,
        platform as SchedulerPlatform
      );
      if (response.success) {
        toast.success('Post scheduled successfully');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to schedule post');
    } finally {
      setPostLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl animate-in fade-in duration-500 pb-20">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 leading-tight">
          Social Media Post Scheduler
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          Schedule your social media content perfectly timed for your audience.
        </p>
      </header>

      <div className="grid gap-8">
        {/* Composer Area */}
        <section className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Send className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Compose</h2>
          </div>

          {!isAllPlatformsLocked ? (
            <>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Media Attachment
                </label>
                <div
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  className={cn(
                    'relative rounded-2xl border-2 border-dashed transition-all',
                    imageAreaDisabled
                      ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
                      : isDragging
                        ? 'border-indigo-400 bg-indigo-50/50'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100/50'
                  )}
                >
                  {hasImage ? (
                    <div className="p-4 relative flex justify-center">
                      <div className="relative group rounded-xl overflow-hidden shadow-sm">
                        <img
                          src={previewUrl ?? ''}
                          alt="Post preview"
                          className="max-h-[300px] object-contain bg-slate-100"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={clearImage}
                            disabled={imageAreaDisabled}
                            className="rounded-full bg-white/90 p-2 text-red-600 shadow-sm hover:scale-110 transition-transform disabled:opacity-50"
                            aria-label="Remove image"
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label
                      className={cn(
                        'flex flex-col items-center justify-center gap-3 py-10 px-4',
                        imageAreaDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
                      )}
                    >
                      <input
                        type="file"
                        accept={ACCEPTED_IMAGE_TYPES.join(',')}
                        onChange={onFileInputChange}
                        disabled={imageAreaDisabled}
                        className="sr-only"
                      />
                      <div
                        className={cn(
                          'flex h-14 w-14 items-center justify-center rounded-full text-slate-400 bg-white shadow-sm ring-1 ring-slate-100',
                          imageAreaDisabled ? 'opacity-50' : 'text-indigo-500'
                        )}
                      >
                        <ImageIcon className="h-6 w-6" />
                      </div>
                      <div className="text-center">
                        <span className="text-sm font-medium text-slate-700 block">
                          {imageAreaDisabled
                            ? 'Image disabled'
                            : 'Click to upload or drag & drop'}
                        </span>
                        <span className="text-xs text-slate-500 mt-1 block">
                          {imageAreaDisabled
                            ? "You're creating a text-only post"
                            : 'SVG, PNG, JPG or GIF (max. 5MB)'}
                        </span>
                      </div>
                    </label>
                  )}
                </div>
                {imageError && (
                  <p className="mt-2 text-sm text-red-500 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="h-4 w-4" /> {imageError}
                  </p>
                )}
                {hasMessageOnly && (
                  <p className="mt-2 text-sm text-yellow-600 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="h-4 w-4" /> Clear message box to add an
                    image.
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="schedule-message"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  {inputLabel}
                </label>
                <textarea
                  id="schedule-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    hasImage
                      ? 'Add a captivating caption...'
                      : 'What do you want to share?'
                  }
                  rows={5}
                  className={cn(inputBase, 'resize-y min-h-[120px] leading-relaxed')}
                />
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700">All platform posts</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {prefilledPosts.map((post) => (
                  <div
                    key={post.platform}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-2"
                  >
                    <img
                      src={post.imageUrl}
                      alt={post.platform}
                      className="w-full rounded-lg object-contain bg-white border border-slate-100 aspect-square"
                    />
                    <p className="mt-2 text-xs text-center font-semibold text-slate-600 capitalize">
                      {post.platform}
                    </p>
                    <p className="mt-2 text-xs text-slate-600 whitespace-pre-line leading-relaxed line-clamp-6">
                      {post.message || 'No caption provided'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-5 space-y-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
              Publish Settings
            </h3>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5  text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" /> Date
                </label>
                <input
                  type="date"
                  min={formattedToday}
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className={inputBase}
                />
              </div>
              <div>
                <label className="mb-1.5  text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-400" /> Time
                </label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className={inputBase}
                />
              </div>
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Platform
              </span>
              {showSelectAccountsFirst ? (
                <div
                  role="status"
                  className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950"
                >
                  <p className="font-medium">Select your accounts first</p>
                  <p className="mt-1 text-amber-900/90">
                    Choose which platforms you use in onboarding or social
                    settings, then come back here to schedule posts.
                  </p>
                  <Link
                    href="/social-media-integration"
                    className="mt-2 inline-block text-sm font-semibold text-amber-950 underline underline-offset-2 hover:text-amber-900"
                  >
                    Open social setup
                  </Link>
                </div>
              ) : lockedPlatform ? (
                <label className="inline-flex cursor-default items-center gap-2 text-sm font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked
                    readOnly
                    className="size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                  />
                  <span className="capitalize">
                    {lockedPlatform === 'all_platforms'
                      ? 'All platforms'
                      : lockedPlatform}
                  </span>
                </label>
              ) : (
                <select
                  disabled={!hasSelectablePlatforms}
                  value={platform}
                  onChange={(e) =>
                    setPlatform(e.target.value as SchedulerPlatform)
                  }
                  className={inputBase}
                >
                  <option value="" disabled>
                    Select platform...
                  </option>
                  {selectedAccounts?.instagram && (
                    <option value="instagram">Instagram</option>
                  )}
                  {selectedAccounts?.facebook && (
                    <option value="facebook">Facebook</option>
                  )}
                  {selectedAccounts?.linkedin && (
                    <option value="linkedin">LinkedIn</option>
                  )}
                </select>
              )}
            </div>

            {scheduledAt && (
              <p className="text-xs font-medium text-indigo-600 bg-indigo-50 py-2 px-3 rounded-lg inline-block">
                Will publish on: {scheduledAt.replace('T', ' at ')}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleSchedulePost}
            disabled={!canSchedule || postLoading}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700 hover:-translate-y-0.5 active:scale-[0.98] disabled:transform-none disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
          >
            {postLoading ? 'Scheduling...' : 'Schedule Post'}
          </button>
        </section>
      </div>
    </div>
  );
}
