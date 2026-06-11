'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAdditionalUserInfo, updateProfile } from 'firebase/auth';
import { createUserEmailPassword, signInWithGoogle } from '@/src/service/auth';
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
import { Mail, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/show-error-toast';
import { signOutUser } from '@/src/service/auth';
import { getFirebaseAuthErrorMessage } from '@/lib/firebase-auth-errors';

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [usePhone, setUsePhone] = useState(false);

  const busy = loading || oauthLoading;

  const handleGoogleLogin = async () => {
    try {
      setOauthLoading(true);
      const result = await signInWithGoogle('signup');
      const additionalUserInfo = getAdditionalUserInfo(result.result);
      if (additionalUserInfo?.isNewUser) {
        localStorage.setItem('isNewUser', 'true');
      } else {
        localStorage.setItem('isNewUser', 'false');
      }
      if (result.showRecoveryPopup) {
        await signOutUser();
        toast.info(
          'A recently deleted account is linked to this Google account. Login to recover it or start fresh.'
        );
        router.replace('/sign-in');
        return;
      }
      router.replace('/home');
    } catch (err: unknown) {
      const message = getFirebaseAuthErrorMessage(err);
      showErrorToast(message);
      if (
        err instanceof Error &&
        err.message ===
          'Email linked to a deleted account. Login to restore or permanently delete it.'
      ) {
        router.push('/sign-in');
      }
    } finally {
      setOauthLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email || !password || !confirmPassword) return;
    if (password !== confirmPassword) {
      showErrorToast('Passwords do not match');
      return;
    }
    try {
      setLoading(true);
      const userCredential = await createUserEmailPassword(email, password);
      await updateProfile(userCredential.user, {
        displayName: fullName.trim(),
      });
      const additionalUserInfo = getAdditionalUserInfo(userCredential);
      if (additionalUserInfo?.isNewUser) {
        localStorage.setItem('isNewUser', 'true');
      } else {
        localStorage.setItem('isNewUser', 'false');
      }
      if(!userCredential.user.emailVerified){
        router.push('/sign-in');
        return;
      }
      toast.success(
        'New account created successfully. Please login to continue.'
      );
      router.push('/sign-in');
    } catch (err: unknown) {
      const message = getFirebaseAuthErrorMessage(err);
      showErrorToast(message);
      if (
        err instanceof Error &&
        err.message ===
          'Email linked to a deleted account. Login to restore or permanently delete it.'
      ) {
        router.push('/sign-in');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <AuthFormTabs mode="sign-up" />
      {!usePhone ? (
        <form onSubmit={handleSignUp}>
          <FieldGroup className="gap-5">
            <header className="flex flex-col gap-3 scroll-mt-28">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Create your free account
                </h1>
                <p className="text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Link
                    href="/sign-in"
                    className="font-medium text-primary-blue underline underline-offset-2 hover:text-primary-purple"
                  >
                    Log in
                  </Link>
                </p>
              </div>
              <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                No credit card required to start · Cancel anytime
              </p>
            </header>
            <Field>
              <FieldLabel
                htmlFor="signup-name"
                className="text-foreground font-medium"
              >
                Full name
              </FieldLabel>
              <Input
                id="signup-name"
                type="text"
                name="name"
                autoComplete="name"
                placeholder="Jordan Lee"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={busy}
                className="h-11 rounded-xl border-border bg-card px-3 py-2.5 text-foreground shadow-sm placeholder:text-muted-foreground/50 focus-visible:border-primary-blue focus-visible:ring-primary-blue/20"
              />
            </Field>
            <Field>
              <FieldLabel
                htmlFor="signup-email"
                className="text-foreground font-medium"
              >
                Email address
              </FieldLabel>
              <Input
                id="signup-email"
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
              id="signup-password"
              label="Password"
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              disabled={busy}
            />
            <AuthPasswordField
              id="signup-confirm-password"
              label="Confirm password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              disabled={busy}
            />
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
                  'Create Free Account'
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
                Sign up with phone
              </h1>
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link
                  href="/sign-in"
                  className="font-medium text-primary-blue underline underline-offset-2 hover:text-primary-purple"
                >
                  Log in
                </Link>
              </p>
            </div>
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
              No credit card required to start · Cancel anytime
            </p>
          </header>
          <PhoneNumberLogin intent="signup" />
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
            Sign up with Google
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
              Sign up with email
            </span>
          ) : (
            <span className="inline-flex items-center justify-center gap-2">
              <Smartphone className="h-5 w-5 shrink-0" aria-hidden />
              Sign up with phone
            </span>
          )}
        </Button>
      </Field>
      <FieldDescription className="px-0 text-center text-sm text-muted-foreground [&>a]:text-primary-blue [&>a]:underline [&>a]:underline-offset-2 [&>a:hover]:text-primary-purple">
        By continuing, you agree to our{' '}
        <a href="/legal/terms">Terms of Service</a> and{' '}
        <a href="/legal/privacy">Privacy Policy</a>.
      </FieldDescription>
    </div>
  );
}
