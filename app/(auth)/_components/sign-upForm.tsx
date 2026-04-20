'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAdditionalUserInfo, updateProfile } from 'firebase/auth';
import { createUserEmailPassword, signInWithGoogle } from '@/src/service/auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AuthPasswordField } from './auth-password-field';
import { PhoneNumberLogin } from './phone-number-login';
import { RecentlyDeletedAccountDialog } from './recently-deleted-account-dialog';
import { Mail, Smartphone } from 'lucide-react';
import {
  recoverDeletedUserAccount,
  createNewAccount,
} from '@/src/service/api/userService';
import { toast } from 'sonner';
import { auth } from '@/lib/firebase';

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
  const [recoveryDialogOpen, setRecoveryDialogOpen] = useState(false);
  const [deletedDocId, setDeletedDocId] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');

  const busy = loading || oauthLoading;

  const formatFirebaseErrorMessage = (error: string) => {
    switch (error) {
      case 'auth/popup-closed-by-user':
        return 'Google login cancelled. Please try again.';
      case 'auth/too-many-requests':
        return 'Too many requests. Please try again later.';
      case 'auth/invalid-credential':
        return 'Invalid credentials. Please try again.';
      case 'auth/invalid-email':
        return 'Invalid email. Please try again.';
      case 'auth/invalid-password':
        return 'Invalid password. Please try again.';
      case 'auth/weak-password':
        return 'Weak password. Please try again.';
      case 'auth/email-already-in-use':
        return 'Email already in use. Please try again.';
      case 'auth/invalid-email':
        return 'Invalid email. Please try again.';
      case 'auth/invalid-password':
        return 'Invalid password. Please try again.';
      default:
        return error;
    }
  };

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
        setRecoveryToken(await result.user.getIdToken());
        setRecoveryDialogOpen(true);
        setDeletedDocId(result.deletedDocId);
        return;
      }
      router.replace('/home');
    } catch (err: any) {
      const message =
      err instanceof Error ? err.message : 'Google login failed';
      if(message.startsWith('Firebase')){
        const formattedMessage = formatFirebaseErrorMessage(err.code);
        toast.error(formattedMessage);
        return;
      }
      toast.error(message);
      if(message === 'Email linked to a deleted account. Sign in to restore or permanently delete it.'){
        router.push('/sign-in');
      }
    } finally {
      setOauthLoading(false);
    }
  };

  const handleContinueOld = async () => {
    try {
      await recoverDeletedUserAccount(deletedDocId, recoveryToken);
      toast.success(
        'Old account recovered successfully. Please sign in to continue.'
      );
      router.replace('/sign-in');
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to recover deleted user account';
      toast.error(message);
    }
  };

  const handleCreateNew = async () => {
    try {
      await createNewAccount(recoveryToken, deletedDocId);
      toast.success(
        'Old account deleted successfully. Please sign up again to continue.'
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create new account';
      toast.error(message);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email || !password || !confirmPassword) return;
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
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
        'New account created successfully. Please sign in to continue.'
      );
      router.push('/sign-in');
    } catch (err: any) {
      const message = err instanceof Error ? err.message : 'Sign up failed';
      if(message.startsWith('Firebase')){
        const formattedMessage = formatFirebaseErrorMessage(err.code);
        toast.error(formattedMessage);
        return;
      }
      toast.error(message);
      if(message === 'Email linked to a deleted account. Sign in to restore or permanently delete it.'){
        router.push('/sign-in');
      }
    } finally {
      setLoading(false);
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
      {!usePhone ? (
        <form onSubmit={handleSignUp}>
          <FieldGroup className="gap-5">
            <header className="flex flex-col gap-3">
              <p className="text-xs font-semibold tracking-wider text-primary-blue uppercase">
                Sign up
              </p>
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
                className="h-11 w-full rounded-xl bg-gradient-primary text-white shadow-md shadow-primary-blue/20 transition-all hover:shadow-lg hover:shadow-primary-blue/25 active:scale-[0.98]"
              >
                {loading ? 'Creating account…' : 'Create Free Account'}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      ) : (
        <div className="space-y-4">
          <header className="flex flex-col gap-3">
            <p className="text-xs font-semibold tracking-wider text-primary-blue uppercase">
              Sign up
            </p>
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
          <PhoneNumberLogin />
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
          disabled={oauthLoading}
          className="h-11 rounded-xl border-border bg-card font-medium text-foreground shadow-sm transition-all hover:border-primary-blue/40 hover:bg-primary-blue/5 hover:text-primary-blue"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="size-5"
          >
            <path
              d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
              fill="currentColor"
            />
          </svg>
          Continue with Google
        </Button>
        <Button
          variant="outline"
          type="button"
          onClick={() => setUsePhone(!usePhone)}
          disabled={oauthLoading}
          className="h-11 rounded-xl border-border bg-card font-medium text-foreground shadow-sm transition-all hover:border-primary-blue/40 hover:bg-primary-blue/5 hover:text-primary-blue"
        >
          {usePhone ? (
            <>
              <Mail className="h-5 w-5" />
              Email
            </>
          ) : (
            <>
              <Smartphone className="h-5 w-5" />
              Phone
            </>
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
