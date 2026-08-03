import { toast, type Action, type ExternalToast } from 'sonner';
import { cn } from '@/lib/utils';

/** Matches the `<Toaster id={…} />` in `@/components/ui/sonner`. */
export const ERROR_TOASTER_ID = 'error-center';

/** Shown when an upload/save request fails with HTTP 413. */
export const CONTENT_TOO_LARGE_MESSAGE =
  'Content Too Large. Upload less than 50 MB';

type ErrorMessage = Parameters<typeof toast.error>[0];

/**
 * Prefer the Content Too Large message when the thrown error is a 413;
 * otherwise show `fallback`.
 */
export function showCaughtErrorToast(err: unknown, fallback: ErrorMessage) {
  if (err instanceof Error && err.message === CONTENT_TOO_LARGE_MESSAGE) {
    return showErrorToast(CONTENT_TOO_LARGE_MESSAGE);
  }
  return showErrorToast(fallback);
}

/**
 * Modal-style error feedback: centered card (billing dialog look), no icon or
 * close “X”, dismissed only via OK unless a custom `action` is passed.
 */
export function showErrorToast(message: ErrorMessage, data?: ExternalToast) {
  const { action, classNames, icon, richColors, ...rest } = data ?? {};
  const id = toast.error(message, {
    ...rest,
    icon: icon ?? null,
    richColors: richColors ?? false,
    toasterId: ERROR_TOASTER_ID,
    duration: Infinity,
    dismissible: false,
    closeButton: false,
    classNames: {
      ...classNames,
      toast: cn(
        '!flex !flex-col !items-stretch !rounded-[1.5rem] !border !border-white/15 !bg-[#12141c] !p-8 !text-white !shadow-[0_0_40px_rgba(0,0,0,0.45)] sm:!max-w-md',
        classNames?.toast
      ),
      content: cn(
        '!items-start !gap-0 !text-left',
        classNames?.content
      ),
      title: cn(
        '!text-lg !font-semibold !leading-snug !text-white',
        classNames?.title
      ),
      description: cn(
        '!mt-3 !text-left !text-base !font-normal !leading-relaxed !text-white/70',
        classNames?.description
      ),
      actionButton: cn(
        '!ml-auto !mt-8 !h-auto !min-h-0 !rounded-full !border-0 !bg-linear-to-r !from-[#6C5CE7] !to-[#00D1FF] !px-10 !py-2.5 !text-sm !font-semibold !uppercase !tracking-wide !text-white !shadow-none hover:!opacity-90',
        classNames?.actionButton
      ),
    },
    action:
      action ??
      ({
        label: 'OK',
        onClick: (event) => {
          event.stopPropagation();
          toast.dismiss(id);
        },
      } satisfies Action),
  });
  return id;
}
