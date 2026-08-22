import type { SchedulableMediaPreview } from '@/lib/post-media-preview';
import { cn } from '@/lib/utils';

type PostMediaPreviewProps = {
  preview: SchedulableMediaPreview;
  className?: string;
  videoClassName?: string;
  imageClassName?: string;
  controls?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  /**
   * Wraps the media in `.app-media-frame` — gradient ring, clipped
   * corners, hover zoom, fade-in.
   *
   * Opt-in rather than always-on: this component returns a bare element
   * and several callers size it absolutely or rely on it being the direct
   * child of their own grid cell. Introducing a wrapper unconditionally
   * would silently break those layouts, so each call site turns it on
   * once it has been looked at.
   */
  framed?: boolean;
  frameClassName?: string;
};

export function PostMediaPreview({
  preview,
  className,
  videoClassName,
  imageClassName,
  controls = false,
  muted = true,
  playsInline = true,
  preload = 'metadata',
  framed = false,
  frameClassName,
}: PostMediaPreviewProps) {
  const media =
    preview.isVideo && preview.videoUrl ? (
      <video
        src={preview.videoUrl}
        poster={preview.posterUrl ?? undefined}
        className={videoClassName ?? className}
        controls={controls}
        muted={muted}
        playsInline={playsInline}
        preload={preload}
      />
    ) : preview.imageUrl ? (
      <img
        src={preview.imageUrl}
        alt=""
        className={imageClassName ?? className}
        loading="lazy"
      />
    ) : null;

  if (!media) return null;

  if (!framed) return media;

  return <div className={cn('app-media-frame', frameClassName)}>{media}</div>;
}
