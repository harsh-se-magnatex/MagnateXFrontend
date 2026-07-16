/**
 * Radix dismiss handlers treat portaled UI (e.g. Sonner toasts) as outside
 * clicks. Use on `onPointerDownOutside` / `onInteractOutside` / `onFocusOutside`
 * so modals stay open while the user interacts with those layers.
 */
export function preventDismissForPortaledOverlay(event: Event): void {
  const target = event.target;
  if (!(target instanceof Element)) return;

  if (
    target.closest('[data-sonner-toast]') ||
    target.closest('[data-sonner-toaster]')
  ) {
    event.preventDefault();
  }
}

export function withPortaledOverlayDismissGuard<E extends Event>(
  handler?: (event: E) => void
): (event: E) => void {
  return (event) => {
    preventDismissForPortaledOverlay(event);
    handler?.(event);
  };
}
