'use client';

import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  Home,
  Search,
  PlusSquare,
  Film,
  User,
  Grid3x3,
  Tag,
} from 'lucide-react';
import { PlatformIcon } from '@/components/home/dashboard-ui';
import { SHOWCASE_BRAND } from '@/components/landing/social-preview/showcase-data';
import type { ShowcasePost } from '@/components/landing/social-preview/showcase-data';
import {
  getPostEngagement,
} from '@/components/landing/social-preview/showcase-data';
import { ShowcaseMedia } from '@/components/landing/social-preview/showcase-media';
import { ShowcaseProfileGrid } from '@/components/landing/social-preview/showcase-grid';
import { ShowcasePostDetail } from '@/components/landing/social-preview/showcase-post-detail';

type InstagramPageMockupProps = {
  posts: ShowcasePost[];
  selectedPostId: string | null;
  onSelectPost: (postId: string) => void;
  onClosePost: () => void;
};

function MockAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass =
    size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-14 w-14 sm:h-16 sm:w-16' : 'h-10 w-10';
  return (
    <div
      className={`${sizeClass} shrink-0 rounded-full bg-gradient-to-br from-primary-purple/80 to-primary-blue/80 ring-2 ring-white`}
      aria-hidden
    />
  );
}

function InstagramFeedPost({
  post,
  sponsored = false,
  onOpen,
}: {
  post: ShowcasePost;
  sponsored?: boolean;
  onOpen: () => void;
}) {
  const { likes } = getPostEngagement(post);
  return (
    <article className="border-b border-neutral-200 bg-white last:border-b-0">
      <div className="flex items-center gap-2 px-2.5 py-2 sm:gap-3 sm:px-3 sm:py-2.5">
        <MockAvatar size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-neutral-900 sm:text-[13px]">
            {SHOWCASE_BRAND.handle}
          </p>
          {sponsored && (
            <p className="text-[10px] text-neutral-500 sm:text-[11px]">Sponsored</p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="relative block aspect-square w-full bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-purple"
        aria-label="Open post from feed"
      >
        <ShowcaseMedia
          post={post}
          playVideo={false}
          interactive={false}
          mediaClassName="object-contain"
          sizes="(max-width: 768px) 50vw, 360px"
        />
      </button>
      <div className="px-2.5 py-2 sm:px-3 sm:py-2.5">
        <div className="flex items-center justify-between text-neutral-800">
          <div className="flex items-center gap-3 sm:gap-4">
            <Heart className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.75} />
            <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.75} />
            <Send className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.75} />
          </div>
          <Bookmark className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.75} />
        </div>
        <p className="mt-1.5 text-[12px] font-semibold text-neutral-900 sm:mt-2 sm:text-[13px]">
          {likes.toLocaleString()} likes
        </p>
        <p className="mt-1 line-clamp-3 text-[12px] leading-snug text-neutral-800 sm:text-[13px]">
          <span className="font-semibold">{SHOWCASE_BRAND.handle} </span>
          {post.caption}
        </p>
      </div>
    </article>
  );
}

function InstagramFeedColumn({
  posts,
  onSelectPost,
}: {
  posts: ShowcasePost[];
  onSelectPost: (postId: string) => void;
}) {
  const stories = Array.from({ length: 6 }, (_, i) => i);
  const feedPosts = posts.slice(0, 4);

  return (
    <section className="flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-neutral-200 bg-white">
      <div className="shrink-0 border-b border-neutral-200 bg-neutral-50 px-3 py-2">
        <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-neutral-500 sm:text-[11px]">
          Home feed
        </p>
      </div>

      <div className="shrink-0 flex gap-2 overflow-x-auto border-b border-neutral-200 px-2 py-2.5 sm:gap-3 sm:px-3 sm:py-3">
        {stories.map((story) => (
          <div key={story} className="flex shrink-0 flex-col items-center gap-1">
            <div className="rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
              <MockAvatar size="sm" />
            </div>
            <span className="max-w-[52px] truncate text-[10px] text-neutral-600 sm:max-w-[64px] sm:text-[11px]">
              {story === 0 ? 'Your story' : `story_${story}`}
            </span>
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {feedPosts.map((post, i) => (
          <InstagramFeedPost
            key={post.id}
            post={post}
            sponsored={i === 0}
            onOpen={() => onSelectPost(post.id)}
          />
        ))}
      </div>
    </section>
  );
}

function InstagramProfileColumn({
  posts,
  onSelectPost,
}: {
  posts: ShowcasePost[];
  onSelectPost: (postId: string) => void;
}) {
  return (
    <section className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-neutral-200 bg-neutral-50 px-3 py-2">
        <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-neutral-500 sm:text-[11px]">
          Profile grid
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <MockAvatar size="lg" />
            <div className="grid flex-1 grid-cols-3 gap-1 text-center sm:gap-3">
              <div>
                <p className="text-sm font-semibold text-neutral-900 sm:text-base">
                  {posts.length}
                </p>
                <p className="text-[10px] text-neutral-500 sm:text-xs">posts</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900 sm:text-base">
                  {SHOWCASE_BRAND.followersLabel}
                </p>
                <p className="text-[10px] text-neutral-500 sm:text-xs">followers</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900 sm:text-base">
                  {SHOWCASE_BRAND.followingLabel}
                </p>
                <p className="text-[10px] text-neutral-500 sm:text-xs">following</p>
              </div>
            </div>
          </div>

          <div className="mt-2 sm:mt-3">
            <p className="text-xs font-semibold text-neutral-900 sm:text-sm">
              {SHOWCASE_BRAND.name}
            </p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-neutral-600 sm:text-xs">
              {SHOWCASE_BRAND.tagline}
            </p>
          </div>
        </div>

        <div className="flex border-y border-neutral-200" aria-hidden>
          <div className="flex flex-1 items-center justify-center border-b-2 border-neutral-900 py-2 text-neutral-900 sm:py-2.5">
            <Grid3x3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
          <div className="flex flex-1 items-center justify-center py-2 text-neutral-400 sm:py-2.5">
            <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </div>
        </div>

        <ShowcaseProfileGrid posts={posts} onSelect={onSelectPost} />
      </div>
    </section>
  );
}

export function InstagramPageMockup({
  posts,
  selectedPostId,
  onSelectPost,
  onClosePost,
}: InstagramPageMockupProps) {
  return (
    <div className="relative mx-auto flex h-full w-full max-w-4xl flex-col bg-white">
      <header className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <PlatformIcon platform="instagram" className="h-7 w-7" />
          <p className="text-lg font-semibold tracking-tight text-neutral-900">Instagram</p>
        </div>
        <div className="flex items-center gap-4 text-neutral-800">
          <Heart className="h-5 w-5" strokeWidth={1.75} />
          <Send className="h-5 w-5" strokeWidth={1.75} />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-2">
        <InstagramFeedColumn posts={posts} onSelectPost={onSelectPost} />
        <InstagramProfileColumn posts={posts} onSelectPost={onSelectPost} />
      </div>

      <nav
        className="shrink-0 border-t border-neutral-200 bg-white"
        aria-label="Instagram-style navigation"
      >
        <div className="flex items-center justify-around px-2 py-2.5 text-neutral-800">
          <Home className="h-6 w-6 fill-neutral-900 stroke-none" />
          <Search className="h-6 w-6" strokeWidth={1.75} />
          <PlusSquare className="h-6 w-6" strokeWidth={1.75} />
          <Film className="h-6 w-6" strokeWidth={1.75} />
          <User className="h-6 w-6" strokeWidth={1.75} />
        </div>
      </nav>

      <ShowcasePostDetail
        platform="instagram"
        posts={posts}
        selectedPostId={selectedPostId}
        onClose={onClosePost}
        onSelect={onSelectPost}
      />
    </div>
  );
}
