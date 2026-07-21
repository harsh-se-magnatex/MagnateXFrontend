import type { User } from 'firebase/auth';

/**
 * True when the user cannot checkout: missing email, or email present but
 * not verified. Phone-only accounts need to add + verify an email first.
 */
export function needsEmailVerificationForPurchase(
  user: User | null | undefined
): boolean {
  if (!user) return false;
  const email = user.email?.trim();
  if (!email) return true;
  return !user.emailVerified;
}

export const EMAIL_VERIFICATION_PURCHASE_MESSAGE =
  'You need a verified email to purchase any plan or credit.';

export const TOP_UP_REQUIRES_PLAN_MESSAGE =
  'You need an active plan first to buy credits.';
