import type { SchedulableMediaPreview } from '@/lib/post-media-preview';

type PostMediaPreviewProps = {
  preview: SchedulableMediaPreview;
  className?: string;
  videoClassName?: string;
  imageClassName?: string;
  controls?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
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
}: PostMediaPreviewProps) {
  if (preview.isVideo && preview.videoUrl) {
    return (
      <video
        src={preview.videoUrl}
        poster={preview.posterUrl ?? undefined}
        className={videoClassName ?? className}
        controls={controls}
        muted={muted}
        playsInline={playsInline}
        preload={preload}
      />
    );
  }

  if (preview.imageUrl) {
    return (
      <img
        src={preview.imageUrl}
        alt=""
        className={imageClassName ?? className}
        loading="lazy"
      />
    );
  }

  return null;
}
