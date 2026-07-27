'use client';

import Image from 'next/image';
import { Clapperboard, Images, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ShowcasePost } from '@/components/landing/social-preview/showcase-data';
import { getPostThumbnailUrl } from '@/components/landing/social-preview/showcase-data';

type ShowcaseProfileGridProps = {
  posts: ShowcasePost[];
  onSelect: (postId: string) => void;
  className?: string;
  gapClassName?: string;
  columns?: 3 | 4;
};

export function ShowcaseProfileGrid({
  posts,
  onSelect,
  className,
  gapClassName = 'gap-0.5',
  columns = 3,
}: ShowcaseProfileGridProps) {
  if (posts.length === 0) {
    return (
      <div className="flex items-center justify-center bg-neutral-50 px-4 py-12 text-sm text-neutral-500">
        No posts yet for this platform.
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid bg-neutral-100',
        columns === 4 ? 'grid-cols-4' : 'grid-cols-3',
        gapClassName,
        className
      )}
    >
      {posts.map((post) => (
        <ShowcaseGridCell key={post.id} post={post} onSelect={onSelect} />
      ))}
    </div>
  );
}

function ShowcaseGridCell({
  post,
  onSelect,
}: {
  post: ShowcasePost;
  onSelect: (postId: string) => void;
}) {
  const thumb = getPostThumbnailUrl(post);

  return (
    <button
      type="button"
      onClick={() => onSelect(post.id)}
      className="group relative aspect-square overflow-hidden bg-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-purple"
      aria-label={`Open post: ${post.caption.slice(0, 60)}`}
    >
      <Image
        src={thumb}
        alt=""
        fill
        className="object-cover transition duration-200 group-hover:scale-[1.03] group-hover:brightness-90"
        sizes="(max-width: 768px) 30vw, 140px"
      />
      <span className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/15" />
      {post.mediaType === 'video' && (
        <span className="absolute right-1.5 top-1.5 rounded bg-black/55 p-1 text-white backdrop-blur-sm">
          <Play className="h-3 w-3 fill-white" aria-hidden />
        </span>
      )}
      {post.mediaType === 'carousel' && (
        <span className="absolute right-1.5 top-1.5 rounded bg-black/55 p-1 text-white backdrop-blur-sm">
          <Images className="h-3 w-3" aria-hidden />
        </span>
      )}
      {post.mediaType === 'video' && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
          <Clapperboard className="h-7 w-7 text-white drop-shadow" aria-hidden />
        </span>
      )}
    </button>
  );
}
