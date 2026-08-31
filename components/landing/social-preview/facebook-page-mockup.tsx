'use client';

import {
  Home,
  Users,
  Tv,
  Store,
  MessageCircle,
  ThumbsUp,
  Share2,
  Search,
  Bell,
  Grid3x3,
} from 'lucide-react';
import { PlatformIcon } from '@/components/home/dashboard-ui';
import {
  formatRelativePostTime,
  pickShowcaseFeedPosts,
  type ShowcaseBrand,
  type ShowcasePost,
} from '@/components/landing/social-preview/showcase-data';
import { ShowcaseMedia } from '@/components/landing/social-preview/showcase-media';
import { ShowcaseProfileGrid } from '@/components/landing/social-preview/showcase-grid';
import { ShowcasePostDetail } from '@/components/landing/social-preview/showcase-post-detail';

type FacebookPageMockupProps = {
  brand: ShowcaseBrand;
  posts: ShowcasePost[];
  selectedPostId: string | null;
  onSelectPost: (postId: string) => void;
  onClosePost: () => void;
};

function MockAvatar({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <div
      className={`${className} shrink-0 rounded-full bg-gradient-to-br from-primary-blue/80 to-primary-purple/80`}
      aria-hidden
    />
  );
}

function FacebookFeedPost({
  brand,
  post,
  onOpen,
}: {
  brand: ShowcaseBrand;
  post: ShowcasePost;
  onOpen: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-[var(--pf-border)] bg-[var(--pf-surface)] shadow-sm">
      <div className="flex items-start gap-3 px-4 pt-4">
        <MockAvatar />
        <div>
          <p className="text-[15px] font-semibold text-[var(--pf-text)]">
            {brand.name}
          </p>
          <p className="text-xs text-[var(--pf-text-muted)]">
            {formatRelativePostTime(post.scheduleAt)} · Public
          </p>
        </div>
      </div>
      <p className="line-clamp-3 px-4 pt-3 text-[15px] leading-snug text-[var(--pf-text)]">
        {post.caption}
      </p>
      <div className="relative mx-4 mt-3 aspect-square w-[calc(100%-2rem)] overflow-hidden rounded-lg bg-[var(--pf-surface-2)]">
        <ShowcaseMedia
          post={post}
          playVideo={false}
          interactive
          onMediaClick={onOpen}
          mediaClassName="object-contain"
          sizes="(max-width: 680px) 100vw, 680px"
          alt="Open Facebook post"
        />
      </div>
      <div className="mx-4 mt-3 border-t border-[var(--pf-border)]" />
      <div
        className="grid grid-cols-3 gap-1 px-2 py-1 text-[var(--pf-text-muted)]"
        aria-hidden
      >
        <div className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium">
          <ThumbsUp className="h-4 w-4" />
          Like
        </div>
        <div className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium">
          <MessageCircle className="h-4 w-4" />
          Comment
        </div>
        <div className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium">
          <Share2 className="h-4 w-4" />
          Share
        </div>
      </div>
    </article>
  );
}

export function FacebookPageMockup({
  brand,
  posts,
  selectedPostId,
  onSelectPost,
  onClosePost,
}: FacebookPageMockupProps) {
  const shortcuts = [
    { icon: Home, label: 'Home' },
    { icon: Users, label: 'Friends' },
    { icon: Tv, label: 'Watch' },
    { icon: Store, label: 'Marketplace' },
  ];
  const feedPosts = pickShowcaseFeedPosts(posts, 3);

  return (
    <div className="relative h-full bg-[var(--pf-bg)]">
      <div className="h-full overflow-y-auto overscroll-contain pb-6">
        <header className="border-b border-[var(--pf-border)] bg-[var(--pf-surface)] shadow-sm">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <PlatformIcon platform="facebook" className="h-8 w-8" />
              <p className="text-xl font-bold text-[var(--pf-accent)]">facebook</p>
            </div>
            <div className="hidden flex-1 sm:block">
              <div className="mx-auto flex max-w-md items-center gap-2 rounded-full bg-[var(--pf-surface-2)] px-3 py-2">
                <Search className="h-4 w-4 text-[var(--pf-text-muted)]" />
                <span className="text-sm text-[var(--pf-text-muted)]">
                  Search Facebook
                </span>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <MockAvatar className="h-9 w-9" />
              <Bell className="hidden h-5 w-5 text-[var(--pf-text-muted)] sm:block" />
            </div>
          </div>
          <div className="mx-auto flex max-w-6xl justify-center gap-1 border-t border-[var(--pf-border)] px-4 py-1">
            {[Home, Users, Tv, Store, MessageCircle].map((Icon, i) => (
              <div
                key={i}
                className={`flex max-w-[80px] flex-1 items-center justify-center border-b-[3px] py-3 ${
                  i === 0
                    ? 'border-[var(--pf-accent)] text-[var(--pf-accent)]'
                    : 'border-transparent text-[var(--pf-text-muted)]'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={i === 0 ? 2.25 : 1.75} />
              </div>
            ))}
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-4 lg:grid-cols-[220px_1fr_260px]">
          <aside className="hidden lg:block">
            <div className="sticky top-2 space-y-1 rounded-xl border border-[var(--pf-border)] bg-[var(--pf-surface)] p-3 shadow-sm">
              {shortcuts.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 text-[14px] font-medium text-[var(--pf-text)]"
                >
                  <Icon className="h-5 w-5 text-[var(--pf-accent)]" />
                  {label}
                </div>
              ))}
            </div>
          </aside>

          <main className="mx-auto w-full max-w-[680px] space-y-4">
            <div className="rounded-xl border border-[var(--pf-border)] bg-[var(--pf-surface)] p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <MockAvatar />
                <div className="flex-1 rounded-full bg-[var(--pf-surface-2)] px-4 py-2.5 text-sm text-[var(--pf-text-muted)]">
                  What&apos;s on your mind, {brand.name}?
                </div>
              </div>
              <div className="mt-3 flex justify-around border-t border-[var(--pf-border)] pt-3 text-sm font-medium text-[var(--pf-text-muted)]">
                <span>Live video</span>
                <span>Photo/video</span>
                <span>Feeling/activity</span>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-[var(--pf-border)] bg-[var(--pf-surface)] shadow-sm">
              <div className="flex items-center gap-2 border-b border-[var(--pf-border)] px-4 py-3">
                <Grid3x3 className="h-4 w-4 text-[var(--pf-accent)]" />
                <div>
                  <p className="text-sm font-semibold text-[var(--pf-text)]">
                    {brand.name} · Photos
                  </p>
                  <p className="text-xs text-[var(--pf-text-muted)]">
                    {posts.length} posts this month — tap any to open
                  </p>
                </div>
              </div>
              <ShowcaseProfileGrid posts={posts} onSelect={onSelectPost} />
            </div>

            {feedPosts.map((post) => (
              <FacebookFeedPost
                key={post.id}
                brand={brand}
                post={post}
                onOpen={() => onSelectPost(post.id)}
              />
            ))}
          </main>

          <aside className="hidden lg:block">
            <div className="sticky top-2 rounded-xl border border-[var(--pf-border)] bg-[var(--pf-surface)] p-4 shadow-sm">
              <p className="mb-3 text-[16px] font-semibold text-[var(--pf-text)]">
                Contacts
              </p>
              <div className="space-y-3">
                {['Alex', 'Jordan', 'Sam'].map((name) => (
                  <div key={name} className="flex items-center gap-2">
                    <MockAvatar className="h-8 w-8" />
                    <span className="text-sm font-medium text-[var(--pf-text)]">
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <ShowcasePostDetail
        brand={brand}
        platform="facebook"
        posts={posts}
        selectedPostId={selectedPostId}
        onClose={onClosePost}
        onSelect={onSelectPost}
      />
    </div>
  );
}
