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
  SHOWCASE_BRAND,
  formatRelativePostTime,
  getPostEngagement,
  type ShowcasePost,
} from '@/components/landing/social-preview/showcase-data';
import { ShowcaseMedia } from '@/components/landing/social-preview/showcase-media';
import { ShowcaseProfileGrid } from '@/components/landing/social-preview/showcase-grid';
import { ShowcasePostDetail } from '@/components/landing/social-preview/showcase-post-detail';

type FacebookPageMockupProps = {
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
  post,
  onOpen,
}: {
  post: ShowcasePost;
  onOpen: () => void;
}) {
  const { likes, comments, shares } = getPostEngagement(post);
  return (
    <article className="overflow-hidden rounded-xl border border-neutral-200/80 bg-white shadow-sm">
      <div className="flex items-start gap-3 px-4 pt-4">
        <MockAvatar />
        <div>
          <p className="text-[15px] font-semibold text-neutral-900">
            {SHOWCASE_BRAND.name}
          </p>
          <p className="text-xs text-neutral-500">
            {formatRelativePostTime(post.scheduleAt)} · Public
          </p>
        </div>
      </div>
      <p className="line-clamp-3 px-4 pt-3 text-[15px] leading-snug text-neutral-800">
        {post.caption}
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="relative mx-4 mt-3 block aspect-square w-[calc(100%-2rem)] overflow-hidden rounded-lg bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-purple"
        aria-label="Open Facebook post"
      >
        <ShowcaseMedia
          post={post}
          playVideo={false}
          interactive={false}
          mediaClassName="object-contain"
          sizes="(max-width: 680px) 100vw, 680px"
        />
      </button>
      <div className="mx-4 mt-3 flex items-center justify-between border-b border-neutral-100 pb-2 text-xs text-neutral-500">
        <span className="flex items-center gap-1">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#1877F2] text-[9px] text-white">
            👍
          </span>
          {likes.toLocaleString()}
        </span>
        <span>
          {comments} comments · {shares} shares
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1 px-2 py-1 text-neutral-600" aria-hidden>
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
  const feedPosts = posts.slice(0, 3);

  return (
    <div className="relative h-full bg-[#F0F2F5]">
      <div className="h-full overflow-y-auto overscroll-contain pb-6">
      <header className="border-b border-neutral-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <PlatformIcon platform="facebook" className="h-8 w-8" />
            <p className="text-xl font-bold text-[#1877F2]">facebook</p>
          </div>
          <div className="hidden flex-1 sm:block">
            <div className="mx-auto flex max-w-md items-center gap-2 rounded-full bg-[#F0F2F5] px-3 py-2">
              <Search className="h-4 w-4 text-neutral-500" />
              <span className="text-sm text-neutral-500">Search Facebook</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <MockAvatar className="h-9 w-9" />
            <Bell className="hidden h-5 w-5 text-neutral-600 sm:block" />
          </div>
        </div>
        <div className="mx-auto flex max-w-6xl justify-center gap-1 border-t border-neutral-100 px-4 py-1">
          {[Home, Users, Tv, Store, MessageCircle].map((Icon, i) => (
            <div
              key={i}
              className={`flex max-w-[80px] flex-1 items-center justify-center border-b-[3px] py-3 ${
                i === 0
                  ? 'border-[#1877F2] text-[#1877F2]'
                  : 'border-transparent text-neutral-500'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={i === 0 ? 2.25 : 1.75} />
            </div>
          ))}
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-4 lg:grid-cols-[220px_1fr_260px]">
        <aside className="hidden lg:block">
          <div className="sticky top-2 space-y-1 rounded-xl border border-neutral-200/80 bg-white p-3 shadow-sm">
            {shortcuts.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-lg px-2 py-2 text-[14px] font-medium text-neutral-800"
              >
                <Icon className="h-5 w-5 text-[#1877F2]" />
                {label}
              </div>
            ))}
          </div>
        </aside>

        <main className="mx-auto w-full max-w-[680px] space-y-4">
          <div className="rounded-xl border border-neutral-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <MockAvatar />
              <div className="flex-1 rounded-full bg-[#F0F2F5] px-4 py-2.5 text-sm text-neutral-500">
                What&apos;s on your mind, {SHOWCASE_BRAND.name}?
              </div>
            </div>
            <div className="mt-3 flex justify-around border-t border-neutral-100 pt-3 text-sm font-medium text-neutral-600">
              <span>Live video</span>
              <span>Photo/video</span>
              <span>Feeling/activity</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-neutral-200/80 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
              <Grid3x3 className="h-4 w-4 text-[#1877F2]" />
              <div>
                <p className="text-sm font-semibold text-neutral-900">
                  {SHOWCASE_BRAND.name} · Photos
                </p>
                <p className="text-xs text-neutral-500">
                  {posts.length} posts this month — tap any to open
                </p>
              </div>
            </div>
            <ShowcaseProfileGrid posts={posts} onSelect={onSelectPost} />
          </div>

          {feedPosts.map((post) => (
            <FacebookFeedPost
              key={post.id}
              post={post}
              onOpen={() => onSelectPost(post.id)}
            />
          ))}
        </main>

        <aside className="hidden lg:block">
          <div className="sticky top-2 rounded-xl border border-neutral-200/80 bg-white p-4 shadow-sm">
            <p className="mb-3 text-[16px] font-semibold text-neutral-900">Contacts</p>
            <div className="space-y-3">
              {['Alex', 'Jordan', 'Sam'].map((name) => (
                <div key={name} className="flex items-center gap-2">
                  <MockAvatar className="h-8 w-8" />
                  <span className="text-sm font-medium text-neutral-800">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
      </div>

      <ShowcasePostDetail
        platform="facebook"
        posts={posts}
        selectedPostId={selectedPostId}
        onClose={onClosePost}
        onSelect={onSelectPost}
      />
    </div>
  );
}
