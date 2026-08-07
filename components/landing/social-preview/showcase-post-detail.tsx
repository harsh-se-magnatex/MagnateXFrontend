'use client';

import { useEffect } from 'react';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Send,
  Share2,
  ThumbsUp,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PreviewPlatform } from '@/components/landing/social-preview/constants';
import {
  formatRelativePostTime,
  getPostEngagement,
  type ShowcaseBrand,
  type ShowcasePost,
} from '@/components/landing/social-preview/showcase-data';
import { ShowcaseMedia } from '@/components/landing/social-preview/showcase-media';

type ShowcasePostDetailProps = {
  brand: ShowcaseBrand;
  platform: PreviewPlatform;
  posts: ShowcasePost[];
  selectedPostId: string | null;
  onClose: () => void;
  onSelect: (postId: string) => void;
};

function MockAvatar({
  className = 'h-9 w-9',
}: {
  className?: string;
}) {
  return (
    <div
      className={`${className} shrink-0 rounded-full bg-gradient-to-br from-primary-purple/80 to-primary-blue/80 ring-2 ring-white`}
      aria-hidden
    />
  );
}

export function ShowcasePostDetail({
  brand,
  platform,
  posts,
  selectedPostId,
  onClose,
  onSelect,
}: ShowcasePostDetailProps) {
  const index = posts.findIndex((p) => p.id === selectedPostId);
  const post = index >= 0 ? posts[index] : null;

  useEffect(() => {
    if (!post) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && index > 0) onSelect(posts[index - 1].id);
      if (e.key === 'ArrowRight' && index < posts.length - 1) {
        onSelect(posts[index + 1].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [post, index, posts, onClose, onSelect]);

  const goPrev = () => {
    if (index > 0) onSelect(posts[index - 1].id);
  };
  const goNext = () => {
    if (index < posts.length - 1) onSelect(posts[index + 1].id);
  };

  return (
    <AnimatePresence>
      {post && (
        <motion.div
          key={post.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-40 flex flex-col bg-black/55 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Post detail"
          onClick={onClose}
        >
          <div
            className="flex items-center justify-between px-3 py-2 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-white/10"
            >
              <X className="h-4 w-4" />
              Close
            </button>
            <p className="text-xs text-white/80">
              {index + 1} / {posts.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={goPrev}
                disabled={index <= 0}
                className="rounded-lg p-1.5 hover:bg-white/10 disabled:opacity-30"
                aria-label="Previous post"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={index >= posts.length - 1}
                className="rounded-lg p-1.5 hover:bg-white/10 disabled:opacity-30"
                aria-label="Next post"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 sm:px-4 sm:pb-4">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto max-w-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {platform === 'instagram' && (
                <InstagramDetail brand={brand} post={post} />
              )}
              {platform === 'facebook' && (
                <FacebookDetail brand={brand} post={post} />
              )}
              {platform === 'linkedin' && (
                <LinkedInDetail brand={brand} post={post} />
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function detailMediaFrameClass(post: ShowcasePost, rounded = false): string {
  const base = rounded
    ? 'relative mx-4 mt-3 overflow-hidden rounded-lg bg-neutral-100'
    : 'relative w-full overflow-hidden bg-neutral-100';
  // Generated assets are mostly square; carousels are portrait 4:5.
  // Always leave room for object-contain so nothing is cropped.
  if (post.mediaType === 'carousel') return `${base} aspect-[4/5]`;
  return `${base} aspect-square`;
}

function InstagramDetail({
  brand,
  post,
}: {
  brand: ShowcaseBrand;
  post: ShowcasePost;
}) {
  const { likes } = getPostEngagement(post);
  return (
    <article className="overflow-hidden rounded-xl bg-white shadow-xl">
      <div className="flex items-center gap-2 border-b border-neutral-100 px-3 py-2.5">
        <MockAvatar className="h-8 w-8" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-neutral-900">
            {brand.handle}
          </p>
          <p className="text-[11px] text-neutral-500">
            {formatRelativePostTime(post.scheduleAt)}
          </p>
        </div>
      </div>
      <div className={detailMediaFrameClass(post)}>
        <ShowcaseMedia
          post={post}
          playVideo
          mediaClassName="object-contain"
          sizes="(max-width: 768px) 100vw, 560px"
        />
      </div>
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between text-neutral-800">
          <div className="flex items-center gap-4">
            <Heart className="h-6 w-6" strokeWidth={1.75} />
            <MessageCircle className="h-6 w-6" strokeWidth={1.75} />
            <Send className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <Bookmark className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <p className="mt-2 text-[13px] font-semibold text-neutral-900">
          {likes.toLocaleString()} likes
        </p>
        <p className="mt-1 text-[13px] leading-snug text-neutral-800">
          <span className="font-semibold">{brand.handle} </span>
          {post.caption}
        </p>
      </div>
    </article>
  );
}

function FacebookDetail({
  brand,
  post,
}: {
  brand: ShowcaseBrand;
  post: ShowcasePost;
}) {
  const { likes, comments, shares } = getPostEngagement(post);
  return (
    <article className="overflow-hidden rounded-xl border border-neutral-200/80 bg-white shadow-xl">
      <div className="flex items-start gap-3 px-4 pt-4">
        <MockAvatar className="h-10 w-10" />
        <div>
          <p className="text-[15px] font-semibold text-neutral-900">
            {brand.name}
          </p>
          <p className="text-xs text-neutral-500">
            {formatRelativePostTime(post.scheduleAt)} · Public
          </p>
        </div>
      </div>
      <p className="px-4 pt-3 text-[15px] leading-snug text-neutral-800">
        {post.caption}
      </p>
      <div className={detailMediaFrameClass(post, true)}>
        <ShowcaseMedia
          post={post}
          playVideo
          mediaClassName="object-contain"
          sizes="(max-width: 680px) 100vw, 680px"
        />
      </div>
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

function LinkedInDetail({
  brand,
  post,
}: {
  brand: ShowcaseBrand;
  post: ShowcasePost;
}) {
  const { likes, comments, shares } = getPostEngagement(post);
  return (
    <article className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl">
      <div className="flex items-start gap-3 px-4 pt-4">
        <MockAvatar className="h-12 w-12" />
        <div>
          <p className="text-[14px] font-semibold text-neutral-900">
            {brand.name}
          </p>
          <p className="text-xs text-neutral-500">
            {brand.followersLabel} followers
          </p>
          <p className="text-xs text-neutral-500">
            {formatRelativePostTime(post.scheduleAt)} · Public
          </p>
        </div>
      </div>
      <p className="px-4 pt-3 text-[14px] leading-relaxed text-neutral-800 whitespace-pre-wrap">
        {post.caption}
      </p>
      <div className={detailMediaFrameClass(post, true)}>
        <ShowcaseMedia
          post={post}
          playVideo
          mediaClassName="object-contain"
          sizes="(max-width: 552px) 100vw, 552px"
        />
      </div>
      <div className="mx-4 mt-3 flex items-center justify-between border-b border-neutral-100 pb-2 text-xs text-neutral-500">
        <span>{likes.toLocaleString()} reactions</span>
        <span>
          {comments} comments · {shares} reposts
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1 px-2 py-1 text-neutral-600" aria-hidden>
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
