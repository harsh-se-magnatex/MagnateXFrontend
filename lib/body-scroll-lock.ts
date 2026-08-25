let activeLocks = 0;
let previousBodyOverflow = '';

/** Share one document scroll lock across all overlays and menus. */
export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') return () => undefined;

  if (activeLocks === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  activeLocks += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeLocks = Math.max(0, activeLocks - 1);
    if (activeLocks === 0) {
      document.body.style.overflow = previousBodyOverflow;
      previousBodyOverflow = '';
    }
  };
}
