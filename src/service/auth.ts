import { auth } from '@/lib/firebase';
import {
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  fetchSignInMethodsForEmail,
  EmailAuthProvider,
  linkWithCredential,
  UserCredential,
} from 'firebase/auth';
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
} from 'firebase/auth';
import {
  checkEmailExistsinDeletedUsers,
  checkPhoneExistsInDeletedUsers,
  linkProvider,
  loginUser,
} from './api/userService';
import { ApiEnvelope } from '@/lib/api-types';
import {
  getFirebaseAuthErrorMessage,
  extractFirebaseAuthCode,
} from '@/lib/firebase-auth-errors';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/show-error-toast';
import { trackLogin, trackSignUp } from '@/lib/analytics';
const provider = new GoogleAuthProvider();

export async function resolvePhoneAuthErrorForDeletedAccount(
  error: unknown,
  phoneE164: string
): Promise<string> {
  const code = extractFirebaseAuthCode(error) ?? '';
  if (
    code === 'auth/credential-already-in-use' ||
    code === 'auth/account-exists-with-different-credential'
  ) {
    try {
      const res = await checkPhoneExistsInDeletedUsers(phoneE164);
      if (res.data?.exists) {
        return 'Phone number linked to a deleted account. Login to restore or permanently delete it.';
      }
    } catch {
      /* fall through */
    }
  }
  return getFirebaseAuthErrorMessage(error);
}

export const signInWithGoogle = async (
  intent: 'signin' | 'signup',
  options?: { loginHint?: string }
) => {
  try {
    const googleProvider = options?.loginHint
      ? (() => {
          const p = new GoogleAuthProvider();
          p.setCustomParameters({ login_hint: options.loginHint });
          return p;
        })()
      : provider;
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    if (intent === 'signup') {
      const res = await checkEmailExistsinDeletedUsers(user.email as string);
      if (res.data.exists) {
        throw new Error(
          'Email linked to a deleted account. Login to restore or permanently delete it.'
        );
      }
    }
    const idToken = await result.user.getIdToken(true);

    const response = (await loginUser(
      idToken,
      intent,
      'google'
    )) as ApiEnvelope<{
      showRecoveryPopup: boolean;
      deletedDocId: string;
    }>;
    if (intent === 'signup') {
      void trackSignUp('google');
    } else {
      void trackLogin('google');
    }
    return {
      user,
      result,
      showRecoveryPopup: response.data.showRecoveryPopup,
      deletedDocId: response.data.deletedDocId,
    };
  } catch (error) {
    await auth.signOut();
    throw error;
  }
};

function noAccountError(): Error & { code: string } {
  const err = new Error('No account found. Please sign up first.') as Error & {
    code: string;
  };
  err.code = 'auth/user-not-found';
  return err;
}

/**
 * Same behavior as the old `fetchSignInMethodsForEmail` path, but works when
 * Firebase email-enumeration protection is enabled (client methods are always []).
 * Uses a direct fetch so the axios 401 interceptor cannot interrupt auth pages.
 */
async function lookupEmailAuth(email: string): Promise<{
  registered: boolean | null;
  providers: string[];
}> {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '');
  if (base) {
    try {
      const res = await fetch(`${base}/api/v1/user/check-email-registered`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        credentials: 'include',
      });
      if (res.ok) {
        const json = (await res.json()) as ApiEnvelope<{
          registered?: boolean;
          providers?: string[];
        }>;
        return {
          registered: !!json.data?.registered,
          providers: Array.isArray(json.data?.providers)
            ? json.data.providers
            : [],
        };
      }
    } catch {
      /* fall through to client Firebase API (works in local/dev) */
    }
  }

  try {
    const providers = await fetchSignInMethodsForEmail(auth, email);
    return {
      registered: providers.length > 0 ? true : null,
      providers,
    };
  } catch {
    return { registered: null, providers: [] };
  }
}

export const createUserEmailPassword = async (
  email: string,
  password: string
) => {
  try {
    const { providers } = await lookupEmailAuth(email);

    if (providers.length > 0 && !providers.includes('password')) {
      return await handleProviderMerge(email, password, providers);
    }

    const res = await checkEmailExistsinDeletedUsers(email);
    if (res.data.exists) {
      throw new Error(
        'Email linked to a deleted account. Login to restore or permanently delete it.'
      );
    }
    const result = await createUserWithEmailAndPassword(auth, email, password);

    if (!result.user.emailVerified) {
      await sendEmailVerification(result.user, {
        url: appContinueUrl('/sign-in'),
        handleCodeInApp: true,
      });
      toast.info(
        'Email verification sent. Please check your inbox (and spam folder).'
      );
    }

    const idToken = await result.user.getIdToken(true);
    await loginUser(idToken, 'signup', 'password');
    void trackSignUp('password');
    return result;
  } catch (error: unknown) {
    throw error;
  }
};

export const signInEmailPassword = async (email: string, password: string) => {
  let result: UserCredential | null = null;
  const { registered, providers } = await lookupEmailAuth(email);

  // Unknown email → same as old auth/user-not-found → sign-up page
  if (registered === false) {
    const deleted = await checkEmailExistsinDeletedUsers(email);
    if (deleted.data?.exists && deleted.data?.deletedDocId) {
      return {
        user: null,
        result: null,
        showRecoveryPopup: true,
        deletedDocId: deleted.data.deletedDocId,
      };
    }
    throw noAccountError();
  }

  // Old path: Google-only account → popup + link password, then password sign-in
  if (providers.length > 0 && !providers.includes('password')) {
    await handleProviderMerge(email, password, providers);
  }

  try {
    result = await signInWithEmailAndPassword(auth, email, password);
  } catch (error: unknown) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code: unknown }).code)
        : '';
    if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
      const res = await checkEmailExistsinDeletedUsers(email);
      if (res.data?.exists && res.data?.deletedDocId) {
        return {
          user: null,
          result: null,
          showRecoveryPopup: true,
          deletedDocId: res.data.deletedDocId,
        };
      }

      // Fallback when pre-check could not run (e.g. API not deployed yet)
      if (registered !== true) {
        throw noAccountError();
      }

      const again = await lookupEmailAuth(email);
      if (again.registered === false) {
        throw noAccountError();
      }
      if (again.providers.length > 0 && !again.providers.includes('password')) {
        await handleProviderMerge(email, password, again.providers);
        result = await signInWithEmailAndPassword(auth, email, password);
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }
  if (result && !result?.user.emailVerified) {
    try {
      await sendEmailVerification(result.user, {
        url: appContinueUrl('/sign-in'),
        handleCodeInApp: true,
      });
      toast.info(
        'Email not verified. We sent a new verification link — check your inbox (and spam folder).'
      );
    } catch {
      showErrorToast(
        'Email not verified. Please check your inbox (and spam folder) and verify your email to continue.'
      );
    }
    return result;
  }
  if (!result?.user) {
    throw new Error('Login failed');
  }

  const idToken = await result.user.getIdToken(true);
  const response = (await loginUser(
    idToken,
    'signin',
    'password'
  )) as ApiEnvelope<{
    showRecoveryPopup: boolean;
    deletedDocId: string;
  }>;
  void trackLogin('password');
  return {
    user: result.user,
    result,
    showRecoveryPopup: response.data.showRecoveryPopup,
    deletedDocId: response.data.deletedDocId,
  };
};

const handleProviderMerge = async (
  email: string,
  password: string,
  methods: string[]
) => {
  if (methods.includes('google.com')) {
    toast.info(
      'This email is linked to Google. Login with Google to merge both.'
    );

    const googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ login_hint: email });
    const googleResult = await signInWithPopup(auth, googleProvider);

    const emailCredential = EmailAuthProvider.credential(email, password);
    await linkWithCredential(googleResult.user, emailCredential);

    // Backend marks Auth + Firestore emailVerified=true (Google already verified).
    let idToken = await googleResult.user.getIdToken(true);
    await loginUser(idToken, 'signin', '');
    await linkProvider(idToken, 'password');

    await googleResult.user.reload();
    idToken = await googleResult.user.getIdToken(true);

    toast.success('Email & Google accounts merged!');
    return googleResult;
  }

  throw new Error(`Please sign in with: ${methods.join(', ')}`);
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};

/** Continue URL for Firebase emails — must be an absolute https URL with a real domain. */
export function appContinueUrl(path = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  if (fromEnv && /^https?:\/\//i.test(fromEnv)) {
    return `${fromEnv}${normalized}`;
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${normalized}`;
  }
  throw new Error(
    'NEXT_PUBLIC_APP_URL is missing. Set it to your app origin (e.g. https://test.sociogenie.ai).'
  );
}

export const forgotPassword = async (email: string, url?: string) => {
  try {
    const continueUrl =
      url && /^https?:\/\//i.test(url) ? url : appContinueUrl('/sign-in');
    await sendPasswordResetEmail(auth, email, {
      url: continueUrl,
      handleCodeInApp: true,
    });
    return { success: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to send reset link.';
    return { success: false, message };
  }
};

export const verifyResetPasswordCode = async (oobCode: string) => {
  return verifyPasswordResetCode(auth, oobCode);
};

export const confirmResetPassword = async (
  oobCode: string,
  newPassword: string
) => {
  return confirmPasswordReset(auth, oobCode, newPassword);
};
