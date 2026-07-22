'use client';

import Image from 'next/image';
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
import {
  BRAND_HANDLE,
  BRAND_NAME,
  PREVIEW_IMAGE,
  SAMPLE_CAPTION,
} from '@/components/landing/social-preview/constants';

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

function InstagramPost({ sponsored = false }: { sponsored?: boolean }) {
  return (
    <article className="border-b border-neutral-200 bg-white last:border-b-0">
      <div className="flex items-center gap-2 px-2.5 py-2 sm:gap-3 sm:px-3 sm:py-2.5">
        <MockAvatar size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-neutral-900 sm:text-[13px]">
            {BRAND_HANDLE}
          </p>
          {sponsored && <p className="text-[10px] text-neutral-500 sm:text-[11px]">Sponsored</p>}
        </div>
      </div>
      <div className="relative aspect-square w-full bg-neutral-100">
        <Image
          src={PREVIEW_IMAGE}
          alt="Sample Instagram post"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, 360px"
        />
      </div>
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
          1,248 likes
        </p>
        <p className="mt-1 text-[12px] leading-snug text-neutral-800 sm:text-[13px]">
          <span className="font-semibold">{BRAND_HANDLE} </span>
          {SAMPLE_CAPTION}
        </p>
      </div>
    </article>
  );
}

function InstagramFeedColumn() {
  const stories = Array.from({ length: 6 }, (_, i) => i);

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
        <InstagramPost sponsored />
        <InstagramPost />
        <InstagramPost />
      </div>
    </section>
  );
}

function InstagramProfileColumn() {
  const gridItems = Array.from({ length: 9 }, (_, i) => i);

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
                <p className="text-sm font-semibold text-neutral-900 sm:text-base">24</p>
                <p className="text-[10px] text-neutral-500 sm:text-xs">posts</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900 sm:text-base">1.2K</p>
                <p className="text-[10px] text-neutral-500 sm:text-xs">followers</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900 sm:text-base">186</p>
                <p className="text-[10px] text-neutral-500 sm:text-xs">following</p>
              </div>
            </div>
          </div>

          <div className="mt-2 sm:mt-3">
            <p className="text-xs font-semibold text-neutral-900 sm:text-sm">{BRAND_NAME}</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-neutral-600 sm:text-xs">
              Premium eyewear cases · Design meets durability
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

        <div className="grid grid-cols-3 gap-0.5 bg-neutral-100">
          {gridItems.map((item) => (
            <div key={item} className="relative aspect-square bg-neutral-200">
              <Image
                src={PREVIEW_IMAGE}
                alt={`Sample grid post ${item + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 16vw, 120px"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function InstagramPageMockup() {
  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col bg-white">
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
        <InstagramFeedColumn />
        <InstagramProfileColumn />
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
    </div>
  );
}
