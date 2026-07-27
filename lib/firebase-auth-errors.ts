/**
 * Map Firebase Auth error codes to user-facing copy.
 * @see https://firebase.google.com/docs/auth/admin/errors
 */

const FIREBASE_AUTH_USER_MESSAGES: Record<string, string> = {
  'auth/invalid-app-credential':
    'We could not verify this sign-in request. Please try again, or use email or Google instead. If it keeps happening, contact support.',
  'auth/missing-app-credential':
    'Sign-in verification failed to start. Refresh the page and try again, or use email or Google.',
  'auth/invalid-api-key':
    'Sign-in is temporarily unavailable. Please try again later.',
  'auth/app-not-authorized':
    'This app is not allowed to sign in from here. Please contact support.',
  'auth/unauthorized-domain':
    'Sign-in is not enabled for this website. Please contact support.',
  'auth/captcha-check-failed':
    'Safety check failed. Please refresh the page and try again.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/invalid-password': 'That password is not valid. Please try again.',
  'auth/wrong-password': 'Incorrect email or password. Please try again.',
  'auth/user-not-found':
    'No account found for that email. Please sign up or try another method.',
  'auth/email-already-in-use':
    'That email is already registered. Try signing in instead.',
  'auth/weak-password': 'Please choose a stronger password.',
  'auth/invalid-credential':
    'Incorrect email or password. Please try again.',
  'auth/invalid-verification-code':
    'That code is incorrect or expired. Request a new code and try again.',
  'auth/invalid-verification-id':
    'That verification link is invalid or expired. Please start again.',
  'auth/session-expired': 'Your session expired. Please sign in again.',
  'auth/user-disabled':
    'This account has been disabled. Contact support if you need help.',
  'auth/user-token-expired': 'Your session expired. Please sign in again.',
  'auth/too-many-requests':
    'Too many attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed':
    'Network error. Check your connection and try again.',
  'auth/internal-error':
    'Something went wrong on our side. Please try again in a moment.',
  'auth/operation-not-allowed':
    'This sign-in method is not available. Please try email or Google.',
  'auth/popup-closed-by-user':
    'The sign-in window was closed. Try again when you are ready.',
  'auth/popup-blocked':
    'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.',
  'auth/account-exists-with-different-credential':
    'An account already exists with the same email using a different sign-in method. Try signing in with Google or reset your password.',
  'auth/credential-already-in-use':
    'That sign-in is already linked to another account.',
  'auth/requires-recent-login':
    'For your security, please sign in again to continue.',
  'auth/missing-phone-number': 'Enter a phone number.',
  'auth/invalid-phone-number':
    'That phone number does not look valid. Check and try again.',
  'auth/quota-exceeded':
    'Too many verification requests. Try again later or use another sign-in method.',
};

const FIREBASE_MESSAGE_CODE = /\((auth\/[^)]+)\)/;

/** Read auth code from a FirebaseAuthError or from `Firebase: Error (auth/...).` text. */
export function extractFirebaseAuthCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const c = (error as { code: unknown }).code;
    if (typeof c === 'string' && c.startsWith('auth/')) return c;
  }
  if (error instanceof Error && error.message) {
    const m = error.message.match(FIREBASE_MESSAGE_CODE);
    if (m) return m[1];
  }
  return undefined;
}

/** True if `message` is the Firebase-style technical wrapper, not app-thrown text. */
function isRawFirebaseWrapper(message: string): boolean {
  return /^Firebase:\s*Error\s*\(auth\//i.test(message);
}

/** True if message looks like axios/HTTP technical noise. */
function isTechnicalHttpMessage(message: string): boolean {
  return (
    /status code\s*\d+/i.test(message) ||
    /^Request failed/i.test(message) ||
    /^Network Error$/i.test(message) ||
    /^(GET|POST|PUT|PATCH|DELETE)\s+\S+\s+failed$/i.test(message) ||
    (message.startsWith('{') && message.includes('"'))
  );
}

/**
 * Human-readable auth error for toasts. App-thrown guidance strings are kept;
 * technical HTTP/Firebase wrappers are replaced with a generic message.
 */
export function getFirebaseAuthErrorMessage(error: unknown): string {
  const code = extractFirebaseAuthCode(error);
  if (code) {
    return (
      FIREBASE_AUTH_USER_MESSAGES[code] ??
      'Sign-in failed. Please try again or use another method.'
    );
  }
  if (error instanceof Error && error.message) {
    const msg = error.message.trim();
    if (msg && !isRawFirebaseWrapper(msg) && !isTechnicalHttpMessage(msg)) {
      return msg;
    }
  }
  return 'Something went wrong. Please try again.';
}
