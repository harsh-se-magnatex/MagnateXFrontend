import type { User } from 'firebase/auth';

/** True when the user has an email on file but has not verified it yet. */
export function needsEmailVerificationForPurchase(
  user: User | null | undefined
): boolean {
  if (!user?.email) return false;
  return !user.emailVerified;
}

export const EMAIL_VERIFICATION_PURCHASE_MESSAGE =
  'Email verification is required for purchasing any plan';
