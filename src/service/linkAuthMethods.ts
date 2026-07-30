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
    case 'auth/account-exists-with-different-credential':
      return 'The provided phone number is already linked to another account.';
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

function linkEmailCompleteUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/settings/account/complete-email-link`;
  }
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  if (fromEnv && /^https?:\/\//i.test(fromEnv)) {
    return `${fromEnv}/settings/account/complete-email-link`;
  }
  throw new Error(
    'NEXT_PUBLIC_APP_URL is missing. Set it to your app origin (e.g. https://test.sociogenie.ai).'
  );
}

/**
 * Step 1: send a sign-in link to the address. The email is not linked to the account until
 * the user opens the link while signed in; then {@link completeAccountEmailLink} runs.
 * Requires "Email link" enabled for Email/Password in Firebase Auth.
 *
 * Password is intentionally not collected here — email links open in a new tab, and
 * `sessionStorage` is per-tab, so any password saved on the account page would be
 * missing on the completion page. Collect the password once after verification instead.
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

export async function requestEmailLinkToAddEmail(email: string): Promise<void> {
  const trimmed = email.trim();
  const actionCodeSettings = {
    url: continueUrlForEmailLink(trimmed),
    handleCodeInApp: true,
  };
  await sendSignInLinkToEmail(auth, trimmed, actionCodeSettings);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LINK_EMAIL_STORAGE_KEY, trimmed);
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
 * Step 2: after the user opens the email link, prove inbox access and link the email.
 * Always returns `needsPassword` so the password is set once on the completion page
 * (works across tabs / devices; email-link auth itself is passwordless).
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

  // Email-link credential proves inbox ownership but does not set a password.
  return { status: 'needsPassword' };
}

/**
 * Step 3: set the email/password credential after the link is verified, then sync backend.
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
 *
 * Intentionally only calls `linkProvider` (no `loginUser`): the link flow already persisted
 * `email`/`phoneNumber`, and `linkProvider` updates `providers` and `emailVerified`.
 * Going through `loginUser` here would re-run `refreshSocialTokensOnLogin` on every account-page
 * visit and could clear `users/{uid}/social/{facebook,instagram}` on transient Graph errors.
 */
export async function syncPasswordProviderAfterEmailVerified(
  user: User
): Promise<void> {
  const hasPassword = user.providerData.some(
    (p) => p.providerId === 'password'
  );
  if (!user.emailVerified || !hasPassword) return;
  const idToken = await user.getIdToken(true);
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
