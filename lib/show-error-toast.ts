import { toast, type Action, type ExternalToast } from 'sonner';
import { cn } from '@/lib/utils';

/** Matches the `<Toaster id={…} />` in `@/components/ui/sonner`. */
export const ERROR_TOASTER_ID = 'error-center';

type ErrorMessage = Parameters<typeof toast.error>[0];

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
        '!flex !flex-col !items-stretch !rounded-[1.5rem] !border !border-gray-200 !bg-gray-50 !p-8 !shadow-md sm:!max-w-md',
        classNames?.toast
      ),
      content: cn(
        '!items-start !gap-0 !text-left',
        classNames?.content
      ),
      title: cn(
        '!text-lg !font-semibold !leading-snug !text-gray-900',
        classNames?.title
      ),
      description: cn(
        '!mt-3 !text-left !text-base !font-normal !leading-relaxed !text-gray-600',
        classNames?.description
      ),
      actionButton: cn(
        '!ml-auto !mt-8 !h-auto !min-h-0 !rounded-full !border-0 !bg-blue-600 !px-10 !py-2.5 !text-sm !font-semibold !uppercase !tracking-wide !text-white !shadow-none hover:!bg-blue-700',
        classNames?.actionButton
      ),
    },
    action:
      action ??
      ({
        label: 'OK',
        onClick: () => toast.dismiss(id),
      } satisfies Action),
  });
  return id;
}
