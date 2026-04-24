import {
  EmailAuthProvider,
  isSignInWithEmailLink,
  linkWithCredential,
  linkWithPhoneNumber,
  RecaptchaVerifier,
  sendSignInLinkToEmail,
  updatePassword,
  type ConfirmationResult,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { linkProvider, loginUser } from './api/userService';

export function formatAuthLinkError(code: string): string {
  switch (code) {
    case 'auth/credential-already-in-use':
      return 'This email or phone is already used by another account.';
    case 'auth/provider-already-linked':
      return 'This sign-in method is already linked.';
    case 'auth/requires-recent-login':
      return 'For security, sign out and sign in again, then try linking.';
    case 'auth/invalid-verification-code':
    case 'auth/invalid-verification-id':
      return 'Invalid or expired verification code. Try again.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters.';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/invalid-action-code':
    case 'auth/expired-action-code':
      return 'This link is invalid or has expired. Request a new one from account settings.';
    case 'auth/invalid-continue-uri':
      return 'This app URL is not authorized for email links. Contact support.';
    case 'auth/operation-not-allowed':
      return 'Email sign-in link is not enabled. Ask an admin to turn on Email link in Firebase Auth.';
    default:
      return 'Could not complete linking. Please try again.';
  }
}

async function syncBackendAfterLink(user: User, method: 'phone' | 'password') {
  const idToken = await user.getIdToken(true);
  await loginUser(idToken, 'signin', method);
  await linkProvider(
    idToken,
    method === 'phone' ? 'phone' : 'password'
  );
  await user.reload();
}

/** Persisted so the completion page can read the same address the link was sent to. */
export const LINK_EMAIL_STORAGE_KEY = 'magnatex:emailForLink';

/** Same browser session: password is applied only after a successful link (verify-first). */
export const LINK_EMAIL_PASSWORD_SESSION_KEY = 'magnatex:pendingLinkPassword';

function linkEmailCompleteUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/settings/account/complete-email-link`;
  }
  return `${process.env.NEXT_PUBLIC_APP_URL}/settings/account/complete-email-link`;
}

/**
 * Step 1: send a sign-in link to the address. The email is not linked to the account until
 * the user opens the link while signed in; then {@link completeAccountEmailLink} runs.
 * Requires "Email link" enabled for Email/Password in Firebase Auth.
 */
function continueUrlForEmailLink(pendingEmail: string): string {
  const u = new URL(linkEmailCompleteUrl());
  u.searchParams.set('pendingEmail', encodeURIComponent(pendingEmail.trim()));
  return u.toString();
}

function readPendingLinkEmailFromClient(): string | null {
  if (typeof window === 'undefined') return null;
  const fromStore = window.localStorage.getItem(LINK_EMAIL_STORAGE_KEY)?.trim();
  if (fromStore) return fromStore;
  try {
    const raw = new URL(window.location.href).searchParams.get('pendingEmail');
    if (!raw) return null;
    return decodeURIComponent(raw).trim() || null;
  } catch {
    return null;
  }
}

export async function requestEmailLinkToAddEmail(
  email: string,
  password: string
): Promise<void> {
  const trimmed = email.trim();
  const actionCodeSettings = {
    url: continueUrlForEmailLink(trimmed),
    handleCodeInApp: true,
  };
  await sendSignInLinkToEmail(auth, trimmed, actionCodeSettings);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LINK_EMAIL_STORAGE_KEY, trimmed);
    window.sessionStorage.setItem(LINK_EMAIL_PASSWORD_SESSION_KEY, password);
  }
}

export type CompleteAccountEmailLinkResult =
  | { status: 'done' }
  | { status: 'needsPassword' };

async function syncPasswordProviderAfterLink(user: User): Promise<void> {
  const idToken = await user.getIdToken(true);
  await loginUser(idToken, 'signin', 'password');
  await linkProvider(idToken, 'password');
  await user.reload();
}

/**
 * Step 2: after the user opens the email link, link by proving inbox access first.
 * Optional password from {@link requestEmailLinkToAddEmail} (same session); otherwise
 * {@link setPasswordAndFinishAccountEmailLink} must be used.
 */
export async function completeAccountEmailLink(
  currentUser: User,
  emailLink: string
): Promise<CompleteAccountEmailLinkResult> {
  const storedEmail = readPendingLinkEmailFromClient();
  if (!storedEmail) {
    throw new Error(
      'We could not match this link to the email you entered. Request a new link from account settings, or open the link you received in full.'
    );
  }
  if (!isSignInWithEmailLink(auth, emailLink)) {
    throw new Error('This link is not a valid sign-in link.');
  }
  const cred = EmailAuthProvider.credentialWithLink(storedEmail, emailLink);
  await linkWithCredential(currentUser, cred);

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(LINK_EMAIL_STORAGE_KEY);
  }

  const u = auth.currentUser;
  if (!u) {
    throw new Error('Session lost after linking. Please sign in and try again.');
  }
  await u.reload();

  const pwd =
    typeof window !== 'undefined'
      ? window.sessionStorage.getItem(LINK_EMAIL_PASSWORD_SESSION_KEY)
      : null;
  if (pwd && pwd.length >= 6) {
    await updatePassword(u, pwd);
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(LINK_EMAIL_PASSWORD_SESSION_KEY);
    }
    await u.reload();
    await syncPasswordProviderAfterLink(auth.currentUser!);
    return { status: 'done' };
  }
  return { status: 'needsPassword' };
}

/**
 * If the user opened the link on another device or session storage was cleared, collect the
 * password here and register the password provider with the backend.
 */
export async function setPasswordAndFinishAccountEmailLink(
  user: User,
  password: string
): Promise<void> {
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
  await updatePassword(user, password);
  await user.reload();
  await syncPasswordProviderAfterLink(auth.currentUser!);
}

/**
 * Call after Firebase reports `emailVerified` (e.g. user returned from the verification link)
 * so Firestore gets the `password` provider when it was deferred during link.
 */
export async function syncPasswordProviderAfterEmailVerified(
  user: User
): Promise<void> {
  const hasPassword = user.providerData.some(
    (p) => p.providerId === 'password'
  );
  if (!user.emailVerified || !hasPassword) return;
  const idToken = await user.getIdToken(true);
  await loginUser(idToken, 'signin', 'password');
  await linkProvider(idToken, 'password');
  await user.reload();
}

export async function startPhoneLink(
  user: User,
  e164: string,
  appVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  return linkWithPhoneNumber(user, e164, appVerifier);
}

export async function confirmPhoneLink(
  confirmation: ConfirmationResult,
  code: string
): Promise<User> {
  const cred = await confirmation.confirm(code);
  await syncBackendAfterLink(cred.user, 'phone');
  return cred.user;
}
