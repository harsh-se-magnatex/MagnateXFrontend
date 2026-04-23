import { auth } from '@/lib/firebase';
import {
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  fetchSignInMethodsForEmail,
  EmailAuthProvider,
  linkWithCredential,
  User,
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
import { toast } from 'sonner';
const provider = new GoogleAuthProvider();

/**
 * When phone auth fails with a “credential / account already exists” style error,
 * match the email signup flow in `createUserEmailPassword`: if the number exists
 * in `deleted-users`, surface the same guidance as email.
 */
export async function resolvePhoneAuthErrorForDeletedAccount(
  error: unknown,
  phoneE164: string
): Promise<string> {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  if (
    code === 'auth/credential-already-in-use' ||
    code === 'auth/account-exists-with-different-credential'
  ) {
    try {
      const res = await checkPhoneExistsInDeletedUsers(phoneE164);
      if (res.data?.exists) {
        return 'Phone number linked to a deleted account. Sign in to restore or permanently delete it.';
      }
    } catch {
      /* fall through */
    }
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong.';
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
          'Email linked to a deleted account. Sign in to restore or permanently delete it.'
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

export const createUserEmailPassword = async (
  email: string,
  password: string
) => {
  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);

    if (methods.length > 0 && !methods.includes('password')) {
      return await handleProviderMerge(email, password, methods);
    }

    const res = await checkEmailExistsinDeletedUsers(email);
    if (res.data.exists) {
      throw new Error(
        'Email linked to a deleted account. Sign in to restore or permanently delete it.'
      );
    }
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (!result.user.emailVerified) {
      await sendEmailVerification(result.user, {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/sign-in`,
        handleCodeInApp: true,
      });
      toast.info(
        'Email verification sent. Please check your inbox (and spam folder).'
      );
    }
    const idToken = await result.user.getIdToken(true);
    await loginUser(idToken, 'signup', 'password');
    return result;
  } catch (error: any) {
    throw error;
  }
};

export const signInEmailPassword = async (email: string, password: string) => {
  let result: UserCredential | null = null;
  const methods = await fetchSignInMethodsForEmail(auth, email);

  if (methods.length > 0 && !methods.includes('password')) {
     await handleProviderMerge(email, password, methods);
  }
  try {
    result = await signInWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    if(error.code === 'auth/user-not-found'){
      const res = await checkEmailExistsinDeletedUsers(email)
      return {
        user: null,
        result: null,
        showRecoveryPopup: res.data.exists,
        deletedDocId: res.data.deletedDocId,
      };
    }
  }
  if (result && !result?.user.emailVerified) {
    toast.info(
      'Email not verified. Please check your inbox (and spam folder) and verify your email to continue.'
    );
    return result;
  }
  const idToken = await result?.user.getIdToken(true);
  const response = (await loginUser(
    idToken!,
    'signin',
    'password'
  )) as ApiEnvelope<{
    showRecoveryPopup: boolean;
    deletedDocId: string;
  }>;
  return {
    user: result?.user,
    result: result,
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
      'This email is linked to Google. Sign in with Google to merge both.'
    );

    const googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ login_hint: email });
    const googleResult = await signInWithPopup(auth, googleProvider);

    const emailCredential = EmailAuthProvider.credential(email, password);
    await linkWithCredential(googleResult.user, emailCredential);

    const idToken = await googleResult.user.getIdToken(true);
    await loginUser(idToken, 'signin', '');
    await linkProvider(idToken, 'password');

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

export const forgotPassword = async (email: string, url?: string) => {
  try {
    await sendPasswordResetEmail(auth, email, {
      url: url ? url : `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
      handleCodeInApp: true,
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
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
