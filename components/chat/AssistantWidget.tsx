'use client';

import { usePathname } from 'next/navigation';

import { ChatLauncher } from './ChatLauncher';
import { ChatSheet } from './ChatSheet';

/**
 * Hide the widget on routes that already feel like full-screen flows or
 * where the bot can't help (admin tools, onboarding, the brand memory
 * guided Q&A, the sign-in screen). Anywhere else we render both the
 * floating launcher and the slide-out sheet.
 */
const HIDDEN_ROUTE_PREFIXES = [
  '/admin',
  '/onboarding',
  '/sign-in',
  '/sign-up',
  '/brand-memory',
];

export function AssistantWidget() {
  const pathname = usePathname() ?? '/';
  if (HIDDEN_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }
  return (
    <>
      <ChatLauncher />
      <ChatSheet />
    </>
  );
}
