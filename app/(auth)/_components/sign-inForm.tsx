'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AuthPasswordField } from './auth-password-field';
import { AuthFormTabs } from './auth-form-tabs';
import { PhoneNumberLogin } from './phone-number-login';
import { RecentlyDeletedAccountDialog } from './recently-deleted-account-dialog';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSafeAppReturnTo } from '@/lib/safeAppReturnTo';
import { signInEmailPassword, signInWithGoogle } from '@/src/service/auth';
import {
  recoverDeletedUserAccount,
  createNewAccount,
} from '@/src/service/api/userService';
import { getAdditionalUserInfo, User, UserCredential } from 'firebase/auth';
import { Mail, Smartphone } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/show-error-toast';
import {
  extractFirebaseAuthCode,
  getFirebaseAuthErrorMessage,
} from '@/lib/firebase-auth-errors';
export function SigninForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const router = useRouter();
  const [oauthLoading, setOauthLoading] = useState(false);
  const [signInLoading, setSignInLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usePhone, setUsePhone] = useState(false);
  const [recoveryDialogOpen, setRecoveryDialogOpen] = useState(false);
  const [deletedDocId, setDeletedDocId] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [returnTo, setReturnTo] = useState<string | null>(null);

  useEffect(() => {
    setReturnTo(
      getSafeAppReturnTo(
        new URLSearchParams(window.location.search).get('returnTo')
      )
    );
  }, []);

  const goAfterSignIn = (fallback: string) => {
    if (returnTo && !returnTo.startsWith('/sign-in')) {
      router.replace(returnTo);
      return;
    }
    router.replace(fallback);
  };

  const busy = oauthLoading || signInLoading;

  const handleGoogleLogin = async () => {
    try {
      setOauthLoading(true);
      const result = await signInWithGoogle('signin');
      if (result.showRecoveryPopup) {
        setRecoveryToken(await result.user.getIdToken());
        setRecoveryDialogOpen(true);
        setDeletedDocId(result.deletedDocId);
        return;
      }
      const additionalUserInfo = getAdditionalUserInfo(result.result);
      if (additionalUserInfo?.isNewUser) {
        router.replace('/onBoarding');
        return;
      }
      goAfterSignIn('/home');
    } catch (err: unknown) {
      const code = extractFirebaseAuthCode(err);
      const message = getFirebaseAuthErrorMessage(err);
      showErrorToast(message);
      if (
        code === 'auth/user-not-found' ||
        (err instanceof Error &&
          err.message.includes('No account found. Please sign up first.'))
      ) {
        router.push('/sign-up');
      }
    } finally {
      setOauthLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      setSignInLoading(true);
      const userCredential = (await signInEmailPassword(email, password)) as {
        user: User;
        result: UserCredential;
        showRecoveryPopup?: boolean;
        deletedDocId?: string;
      };
      if (userCredential?.showRecoveryPopup && userCredential?.deletedDocId) {
        if (userCredential.user) {
          setRecoveryToken(await userCredential.user.getIdToken());
        } else {
          setRecoveryToken('');
        }
        setRecoveryDialogOpen(true);
        setDeletedDocId(userCredential.deletedDocId);
        return;
      }

      if (!userCredential.user.emailVerified) {
        return;
      }
      
      const isNewUser = localStorage.getItem('isNewUser');
      if (isNewUser === 'true') {
        router.push('/onBoarding');
        localStorage.removeItem('isNewUser');
        return;
      }
      goAfterSignIn('/home');

      localStorage.removeItem('isNewUser');
    } catch (err: unknown) {
      const recovery =
        err &&
          typeof err === 'object' &&
          (err as { code?: string }).code === 'auth/deleted-account-recovery' &&
          typeof (err as { deletedDocId?: unknown }).deletedDocId === 'string'
          ? (err as { deletedDocId: string; message?: string })
          : null;
      if (recovery) {
        setRecoveryDialogOpen(true);
        setDeletedDocId(recovery.deletedDocId);
        setRecoveryToken('');
        toast.info(recovery.message ?? '');
        return;
      }
      const code = extractFirebaseAuthCode(err);
      const message = getFirebaseAuthErrorMessage(err);
      const shouldGoToSignUp =
        code === 'auth/user-not-found' ||
        (err instanceof Error &&
          err.message.includes('No account found. Please sign up first.'));
      showErrorToast(message);
      if (shouldGoToSignUp) {
        router.replace(
          `/sign-up?email=${encodeURIComponent(email.trim())}`
        );
      }
    } finally {
      setSignInLoading(false);
    }
  };

  const handleContinueOld = async () => {
    try {
      const token = recoveryToken;
      const docId = deletedDocId;
      await recoverDeletedUserAccount(docId, token);
      toast.success('Old Account Recovered Successfully.');
      router.push('/home');
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        err.message === 'recovery-verify-failed'
      ) {
        return;
      }
      const message = 'Failed to recover deleted user account';
      showErrorToast(message);
    }
  };

  const handleCreateNew = async () => {
    try {
      const token = recoveryToken;
      const docId = deletedDocId;
      await createNewAccount(token, docId);
      await auth.signOut();
      setRecoveryDialogOpen(false);
      toast.success(
        'Old account Deleted Successfully. Please sign up again to continue.'
      );
      router.push('/sign-up');
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        err.message === 'recovery-verify-failed'
      ) {
        return;
      }
      const message = 'Failed to create new account';
      showErrorToast(message);
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <RecentlyDeletedAccountDialog
        open={recoveryDialogOpen}
        onOpenChange={setRecoveryDialogOpen}
        onCreateNew={handleCreateNew}
        onContinueOld={handleContinueOld}
      />
      <AuthFormTabs mode="login" />
      {!usePhone ? (
        <form onSubmit={handleSignIn}>
          <FieldGroup className="gap-5">
            <header className="flex flex-col gap-3 scroll-mt-28">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Welcome back
                </h1>
                <p className="text-sm text-muted-foreground">
                  Don&apos;t have an account?{' '}
                  <Link
                    href="/sign-up"
                    className="font-medium text-primary-blue underline underline-offset-2 hover:text-primary-purple"
                  >
                    Sign up free
                  </Link>
                </p>
              </div>
              <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                Log in to manage your AI-generated, human-reviewed social media
                workflow.
              </p>
            </header>
            <Field>
              <FieldLabel
                htmlFor="signin-email"
                className="text-foreground font-medium"
              >
                Email
              </FieldLabel>
              <Input
                id="signin-email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                disabled={busy}
                className="h-11 rounded-xl border-border bg-card px-3 py-2.5 text-foreground shadow-sm placeholder:text-muted-foreground/50 focus-visible:border-primary-blue focus-visible:ring-primary-blue/20"
              />
            </Field>
            <AuthPasswordField
              id="signin-password"
              label="Password"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              disabled={busy}
            />
            <div>
              <Link
                href="/reset-password"
                className="text-sm font-medium text-primary-blue hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Field>
              <Button
                type="submit"
                disabled={busy}
                aria-busy={busy}
                className="h-11 w-full rounded-xl bg-gradient-primary text-white shadow-md shadow-primary-blue/20 transition-all hover:shadow-lg hover:shadow-primary-blue/25 active:scale-[0.98]"
              >
                {busy ? (
                  <Spinner className="size-4.5 text-white" />
                ) : (
                  'Log In'
                )}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      ) : (
        <div className="space-y-4">
          <header className="flex flex-col gap-3 scroll-mt-28">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Welcome back
              </h1>
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link
                  href="/sign-up"
                  className="font-medium text-primary-blue underline underline-offset-2 hover:text-primary-purple"
                >
                  Sign up free
                </Link>
              </p>
            </div>
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
              Log in with your phone number.
            </p>
          </header>
          <PhoneNumberLogin
            intent="signin"
            returnToPath={returnTo}
            onRecoveryNeeded={async ({ deletedDocId }) => {
              const u = auth.currentUser;
              if (u) setRecoveryToken(await u.getIdToken());
              setDeletedDocId(deletedDocId);
              setRecoveryDialogOpen(true);
            }}
          />
        </div>
      )}
      <FieldSeparator className="**:data-[slot=field-separator-content]:bg-background **:data-[slot=field-separator-content]:text-muted-foreground">
        Or
      </FieldSeparator>
      <Field className="grid gap-4 sm:grid-cols-2">
        <Button
          variant="outline"
          type="button"
          onClick={() => void handleGoogleLogin()}
          disabled={busy}
          className="h-auto min-h-11 rounded-xl border-border bg-card px-3 py-2.5 text-center text-sm font-medium leading-snug text-foreground shadow-sm transition-all hover:border-primary-blue/40 hover:bg-primary-blue/5 hover:text-primary-blue sm:h-11 sm:text-base"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="size-5 shrink-0"
              aria-hidden
            >
              <path
                d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                fill="currentColor"
              />
            </svg>
            Login with Google
          </span>
        </Button>
        <Button
          variant="outline"
          type="button"
          onClick={() => setUsePhone(!usePhone)}
          disabled={busy}
          className="h-auto min-h-11 rounded-xl border-border bg-card px-3 py-2.5 text-center text-sm font-medium leading-snug text-foreground shadow-sm transition-all hover:border-primary-blue/40 hover:bg-primary-blue/5 hover:text-primary-blue sm:h-11 sm:text-base"
        >
          {usePhone ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Mail className="h-5 w-5 shrink-0" aria-hidden />
              Login with email
            </span>
          ) : (
            <span className="inline-flex items-center justify-center gap-2">
              <Smartphone className="h-5 w-5 shrink-0" aria-hidden />
              Login with phone
            </span>
          )}
        </Button>
      </Field>
      <FieldDescription className="px-0 text-center text-sm text-muted-foreground [&>a]:text-primary-blue [&>a]:underline [&>a]:underline-offset-2 [&>a:hover]:text-primary-purple">
        By continuing, you agree to our{' '}
        <a href="/legal/terms">Terms of Service</a> and{' '}
        <a href="/legal/privacy">Privacy Policy</a>.
      </FieldDescription>
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Instagram, Facebook &amp; LinkedIn · Content reviewed within 24 hours
      </p>
    </div>
  );
}
