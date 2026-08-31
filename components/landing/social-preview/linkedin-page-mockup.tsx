'use client';

import {
  Home,
  Users,
  Briefcase,
  MessageCircle,
  Bell,
  Search,
  ThumbsUp,
  Share2,
  Send,
  Plus,
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

type LinkedInPageMockupProps = {
  brand: ShowcaseBrand;
  posts: ShowcasePost[];
  selectedPostId: string | null;
  onSelectPost: (postId: string) => void;
  onClosePost: () => void;
};

function MockAvatar({ className = 'h-12 w-12' }: { className?: string }) {
  return (
    <div
      className={`${className} shrink-0 rounded-full bg-gradient-to-br from-primary-blue/80 to-primary-purple/80`}
      aria-hidden
    />
  );
}

function LinkedInFeedPost({
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
          <p className="text-[14px] font-semibold text-[var(--pf-text)]">
            {brand.name}
          </p>
          <p className="text-xs text-[var(--pf-text-muted)]">
            {brand.followersLabel} followers
          </p>
          <p className="text-xs text-[var(--pf-text-muted)]">
            {formatRelativePostTime(post.scheduleAt)} · Public
          </p>
        </div>
      </div>
      <p className="line-clamp-3 px-4 pt-3 text-[14px] leading-relaxed text-[var(--pf-text)]">
        {post.caption}
      </p>
      <div className="relative mx-4 mt-3 aspect-square w-[calc(100%-2rem)] overflow-hidden rounded-lg bg-[var(--pf-surface-2)]">
        <ShowcaseMedia
          post={post}
          playVideo={false}
          interactive
          onMediaClick={onOpen}
          mediaClassName="object-contain"
          sizes="(max-width: 552px) 100vw, 552px"
          alt="Open LinkedIn post"
        />
      </div>
      <div className="mx-4 mt-3 border-t border-[var(--pf-border)]" />
      <div
        className="grid grid-cols-4 gap-1 px-2 py-1 text-[var(--pf-text-muted)]"
        aria-hidden
      >
        <div className="flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold sm:text-sm">
          <ThumbsUp className="h-4 w-4" />
          Like
        </div>
        <div className="flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold sm:text-sm">
          <MessageCircle className="h-4 w-4" />
          Comment
        </div>
        <div className="flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold sm:text-sm">
          <Share2 className="h-4 w-4" />
          Repost
        </div>
        <div className="flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-semibold sm:text-sm">
          <Send className="h-4 w-4" />
          Send
        </div>
      </div>
    </article>
  );
}

export function LinkedInPageMockup({
  brand,
  posts,
  selectedPostId,
  onSelectPost,
  onClosePost,
}: LinkedInPageMockupProps) {
  const navItems = [
    { icon: Home, label: 'Home' },
    { icon: Users, label: 'My Network' },
    { icon: Briefcase, label: 'Jobs' },
    { icon: MessageCircle, label: 'Messaging' },
    { icon: Bell, label: 'Notifications' },
  ];
  const feedPosts = pickShowcaseFeedPosts(posts, 3);

  return (
    <div className="relative h-full bg-[var(--pf-bg)]">
      <div className="h-full overflow-y-auto overscroll-contain pb-6">
        <header className="border-b border-[var(--pf-border)] bg-[var(--pf-surface)]">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <PlatformIcon platform="linkedin" className="h-8 w-8" />
              <p className="text-lg font-bold text-[var(--pf-accent)]">LinkedIn</p>
            </div>
            <div className="hidden flex-1 sm:block">
              <div className="mx-auto flex max-w-sm items-center gap-2 rounded-md border border-[var(--pf-border)] bg-[var(--pf-surface-2)] px-3 py-1.5">
                <Search className="h-4 w-4 text-[var(--pf-text-muted)]" />
                <span className="text-sm text-[var(--pf-text-muted)]">Search</span>
              </div>
            </div>
            <nav
              className="ml-auto hidden items-center gap-1 md:flex"
              aria-hidden
            >
              {navItems.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex min-w-[64px] flex-col items-center px-2 py-1 text-[11px] text-[var(--pf-text-muted)]"
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                  <span className="mt-0.5 hidden lg:block">{label}</span>
                </div>
              ))}
            </nav>
            <MockAvatar className="h-8 w-8 md:hidden" />
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-4 lg:grid-cols-[225px_1fr_280px]">
          <aside className="hidden lg:block">
            <div className="sticky top-2 overflow-hidden rounded-xl border border-[var(--pf-border)] bg-[var(--pf-surface)] shadow-sm">
              <div className="h-14 bg-gradient-to-r from-sky-100 to-blue-100" />
              <div className="-mt-8 px-4 pb-4">
                <MockAvatar className="mx-auto h-16 w-16 ring-4 ring-[var(--pf-surface)]" />
                <p className="mt-2 text-center text-sm font-semibold text-[var(--pf-text)]">
                  {brand.name}
                </p>
                <p className="text-center text-xs text-[var(--pf-text-muted)]">
                  {brand.tagline}
                </p>
                <p className="mt-2 text-center text-xs text-[var(--pf-text-muted)]">
                  {posts.length} posts this month
                </p>
              </div>
            </div>
          </aside>

          <main className="mx-auto w-full max-w-[552px] space-y-4">
            <div className="rounded-xl border border-[var(--pf-border)] bg-[var(--pf-surface)] p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <MockAvatar className="h-12 w-12" />
                <div className="flex-1 rounded-full border border-[var(--pf-border)] px-4 py-2.5 text-sm text-[var(--pf-text-muted)]">
                  Start a post
                </div>
              </div>
              <div className="mt-3 flex justify-around border-t border-[var(--pf-border)] pt-3 text-xs font-semibold text-[var(--pf-text-muted)] sm:text-sm">
                <span className="flex items-center gap-1">
                  <Plus className="h-4 w-4 text-[var(--pf-accent)]" />
                  Photo
                </span>
                <span>Video</span>
                <span>Event</span>
                <span>Write article</span>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-[var(--pf-border)] bg-[var(--pf-surface)] shadow-sm">
              <div className="flex items-center gap-2 border-b border-[var(--pf-border)] px-4 py-3">
                <Grid3x3 className="h-4 w-4 text-[var(--pf-accent)]" />
                <div>
                  <p className="text-sm font-semibold text-[var(--pf-text)]">
                    Company posts
                  </p>
                  <p className="text-xs text-[var(--pf-text-muted)]">
                    Tap any post to open the LinkedIn view
                  </p>
                </div>
              </div>
              <ShowcaseProfileGrid posts={posts} onSelect={onSelectPost} />
            </div>

            {feedPosts.map((post) => (
              <LinkedInFeedPost
                key={post.id}
                brand={brand}
                post={post}
                onOpen={() => onSelectPost(post.id)}
              />
            ))}
          </main>

          <aside className="hidden lg:block">
            <div className="sticky top-2 rounded-xl border border-[var(--pf-border)] bg-[var(--pf-surface)] p-4 shadow-sm">
              <p className="mb-3 text-sm font-semibold text-[var(--pf-text)]">
                LinkedIn News
              </p>
              <ul className="space-y-2 text-xs text-[var(--pf-text-muted)]">
                <li>Trends in retail marketing</li>
                <li>Small business growth tips</li>
                <li>Product photography insights</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      <ShowcasePostDetail
        brand={brand}
        platform="linkedin"
        posts={posts}
        selectedPostId={selectedPostId}
        onClose={onClosePost}
        onSelect={onSelectPost}
      />
    </div>
  );
}
