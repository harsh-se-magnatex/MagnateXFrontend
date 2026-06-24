export function scrollToHash(hash: string, behavior: ScrollBehavior = 'smooth') {
  const id = decodeURIComponent(hash.replace(/^#/, ''));
  if (!id) {
    window.scrollTo({ top: 0, behavior });
    return;
  }
  document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' });
}

/** Re-scroll when the user clicks a hash link that matches the current URL hash. */
export function handleSameHashLinkClick(
  event: React.MouseEvent<HTMLAnchorElement>,
  href: string
) {
  const url = new URL(href, window.location.origin);
  if (!url.hash) return;

  const samePath = url.pathname === window.location.pathname;
  const sameHash = window.location.hash === url.hash;

  if (samePath && sameHash) {
    event.preventDefault();
    scrollToHash(url.hash);
  }
}
