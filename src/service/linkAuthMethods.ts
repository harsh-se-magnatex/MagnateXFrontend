import {
  EmailAuthProvider,
  linkWithCredential,
  linkWithPhoneNumber,
  RecaptchaVerifier,
  sendEmailVerification,
  type ConfirmationResult,
  type User,
} from 'firebase/auth';
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

export type LinkEmailPasswordOptions = {
  /** @deprecated Verification uses `/sign-in` on the current origin (same as email signup). */
  continueUrl?: string;
};

function signInVerificationActionUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/sign-in`;
  }
  return `${process.env.NEXT_PUBLIC_APP_URL}/sign-in`;
}

/**
 * Links email/password to the current user. Sends the same verification email as signup
 * (`handleCodeInApp` + `/sign-in`) when the address is not verified yet.
 * Backend `password` provider is registered only after the email is verified so we do not
 * treat the account as password-linked until then.
 */
export async function linkEmailPasswordToAccount(
  user: User,
  email: string,
  password: string,
  _options?: LinkEmailPasswordOptions
): Promise<{ emailVerificationSent: boolean }> {
  const credential = EmailAuthProvider.credential(email.trim(), password);
  await linkWithCredential(user, credential);
  await user.reload();

  let emailVerificationSent = false;
  if (!user.emailVerified) {
    await sendEmailVerification(user, {
      url: signInVerificationActionUrl(),
      handleCodeInApp: true,
    });
    emailVerificationSent = true;
  }

  const idToken = await user.getIdToken(true);
  await loginUser(idToken, 'signin', 'password');
  if (user.emailVerified) {
    await linkProvider(idToken, 'password');
  }
  await user.reload();
  return { emailVerificationSent };
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
