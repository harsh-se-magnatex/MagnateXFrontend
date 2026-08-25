'use client';

import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ChevronDown, ImageOff, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { showErrorToast } from '@/lib/show-error-toast';
import { cn } from '@/lib/utils';
import { lockBodyScroll } from '@/lib/body-scroll-lock';
import {
  generateExamplePostsApi,
  getExamplePostsApi,
  type ExamplePostItem,
  type ExamplePostsMeta,
} from '@/features/user/api';

function platformLabel(platform: string): string {
  return platform.replace(/_/g, ' ');
}

function ExamplePostDetailModal({
  post,
  onClose,
}: {
  post: ExamplePostItem;
  onClose: () => void;
}) {
  useEffect(() => {
    return lockBodyScroll();
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm sm:p-6"
      style={{ minHeight: '100dvh', height: '100dvh' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="example-post-detail-title"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 id="example-post-detail-title" className="text-lg font-semibold">
              Example post
            </h2>
            <p className="text-xs font-medium capitalize text-muted-foreground">
              {platformLabel(post.platform)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            aria-label="Close"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-10 pt-4 overscroll-contain">
          {post.imageUrl ? (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Image
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.imageUrl}
                alt={`${post.platform} example`}
                className="max-h-80 w-full rounded-xl border border-border bg-muted object-contain"
              />
            </div>
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-4 text-sm text-muted-foreground">
              <ImageOff className="h-8 w-8" />
              Preview unavailable
            </div>
          )}
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Caption
            </p>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
              {post.caption || 'No caption'}
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ExamplePostsCard() {
  const [open, setOpen] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [posts, setPosts] = useState<ExamplePostItem[]>([]);
  const [meta, setMeta] = useState<ExamplePostsMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ExamplePostItem | null>(
    null
  );

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await getExamplePostsApi();
      setOnboarded(response.data.onboarded === true);
      setMeta(response.data.examplePostsMeta);
      setPosts(response.data.examplePosts ?? []);
    } catch {
      if (!silent) showErrorToast('Failed to load example posts.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial example-post hydration intentionally owns this component state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    if (meta?.status !== 'running') return;
    const timer = window.setInterval(() => void load(true), 5_000);
    return () => window.clearInterval(timer);
  }, [load, meta?.status]);

  const generate = async () => {
    if (generating || meta?.used) return;
    setGenerating(true);
    try {
      const response = await generateExamplePostsApi();
      setMeta({
        status: 'running',
        used: true,
        expectedCount: response.data.expectedCount,
        completedCount: 0,
        platforms: response.data.platforms,
        postsPerPlatform: response.data.postsPerPlatform,
      });
      void load(true);
    } catch {
      showErrorToast('Failed to start example-post generation.');
    } finally {
      setGenerating(false);
    }
  };

  const isRunning = meta?.status === 'running' || generating;
  const triggerLabel =
    posts.length > 0
      ? `Example posts (${posts.length})`
      : isRunning
        ? 'Generating examples'
        : 'Example posts';

  if (loading) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full"
        disabled
      >
        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
        Examples
      </Button>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full border-border bg-muted px-3.5 py-1.5 text-sm font-medium text-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            {triggerLabel}
            <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={8}
          className="w-[min(92vw,30rem)] overflow-hidden rounded-2xl border-border p-0"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">
              Example posts
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Free brand previews. Nothing is scheduled.
            </p>
          </div>

          <div className="max-h-[26rem] overflow-y-auto p-3">
            {!onboarded ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm">
                <p className="font-medium text-foreground">
                  Complete Brand DNA first
                </p>
                <p className="mt-1 text-muted-foreground">
                  Example posts need your brand profile before generation.
                </p>
                <Button asChild size="sm" variant="outline" className="mt-3">
                  <Link href="/brand-dna">Complete Brand DNA</Link>
                </Button>
              </div>
            ) : isRunning ? (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating {posts.length} of {meta?.expectedCount ?? 3}
              </div>
            ) : posts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm">
                <p className="font-medium text-foreground">
                  No examples generated yet
                </p>
                <p className="mt-1 text-muted-foreground">
                  Generate one free set for your connected platforms.
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => void generate()}
                  disabled={generating || meta?.used}
                >
                  {meta?.used ? 'Free examples already used' : 'Generate examples'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <article
                    key={post.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedPost(post)}
                    onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedPost(post);
                      }
                    }}
                    className={cn(
                      'grid cursor-pointer grid-cols-[5.5rem_1fr] gap-3 rounded-xl border border-border bg-card p-2 text-left transition-colors',
                      'hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30'
                    )}
                  >
                    <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                      {post.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.imageUrl}
                          alt={`${post.platform} example`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <ImageOff className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {platformLabel(post.platform)}
                      </p>
                      <p className="mt-1 max-h-28 overflow-y-auto whitespace-pre-wrap break-words pr-1 text-sm leading-snug text-foreground">
                        {post.caption || 'No caption'}
                      </p>
                      <p className="mt-2 text-[11px] font-medium text-primary">
                        Click for full details
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selectedPost ? (
        <ExamplePostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      ) : null}
    </>
  );
}
