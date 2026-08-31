/* eslint-disable react/no-unescaped-entities */
'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Mail, Lock, ShieldCheck, ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

import {
  confirmResetPassword,
  forgotPassword,
  verifyResetPasswordCode,
} from '@/src/service/auth';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/show-error-toast';

type Tone = 'success' | 'error' | 'info' | '';

function Notice({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2 text-sm flex items-start gap-2',
        tone === 'success' && 'border-success bg-success text-success',
        tone === 'error' &&
          'border-destructive/20 bg-destructive/10 text-destructive',
        (tone === 'info' || tone === '') &&
          'border-default bg-hover text-secondary'
      )}
    >
      <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function ResetPasswordPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const oobCode = useMemo(
    () => searchParams.get('oobCode') || '',
    [searchParams]
  );
  const mode = useMemo(() => searchParams.get('mode') || '', [searchParams]);

  const isSetNewPassword = Boolean(oobCode) && mode === 'resetPassword';

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [tone, setTone] = useState<Tone>('');
  const [codeChecked, setCodeChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!isSetNewPassword) {
        setCodeChecked(true);
        return;
      }

      setTone('info');
      setMessage('Verifying your reset link…');
      try {
        const resolvedEmail = await verifyResetPasswordCode(oobCode);
        if (cancelled) return;
        setEmail(resolvedEmail || '');
        setTone('');
        setMessage('');
      } catch (err: unknown) {
        if (cancelled) return;
        setTone('error');
        showErrorToast('This reset link is invalid or has expired.');
      } finally {
        if (!cancelled) setCodeChecked(true);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [isSetNewPassword, oobCode]);

  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setTone('');

    const trimmed = email.trim();
    if (!trimmed) {
      setTone('error');
      setMessage('Please enter your email address.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setTone('error');
      setMessage('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await forgotPassword(trimmed);
      if (!res.success) {
        setTone('error');
        if (res.message!.startsWith('Firebase: Error (auth/user-not-found).')) {
          showErrorToast(
            'User with this email not found. Please sign up first.'
          );
          return;
        }
        showErrorToast('Failed to send reset link. Please Try Again Later.');
        return;
      }
      setTone('success');
      toast.success(
        'Reset link sent. Please check your inbox (and spam folder).'
      );
    } catch (err: any) {
      setTone('error');
      if (err.code === 'auth/user-not-found') {
        showErrorToast('User not found. Please sign up first.');
        return;
      }
      showErrorToast('Failed to send reset link. Please Try Again Later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setTone('');

    if (newPassword.length < 8) {
      setTone('error');
      setMessage('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setTone('error');
      setMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await confirmResetPassword(oobCode, newPassword);
      setTone('success');
      setMessage('Password updated. You can sign in with your new password.');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => router.push('/sign-in'), 900);
    } catch (err: unknown) {
      setTone('error');
      setMessage('Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[520px] glass-card rounded-3xl p-8 sm:p-10 border border-default animate-in fade-in duration-700">
      <Link href="/" className="flex items-center gap-2.5 w-fit group mb-8">
        <img
          src="/logo.png"
          alt="SocioGenie"
          className="h-10 w-10 rounded-xl transition-transform"
        />
        <span className="text-xl font-bold tracking-tight bg-gradient-primary-text">
          SocioGenie
        </span>
      </Link>

      <div className="mb-6">
        <h1 className="text-page-title text-default">
          {isSetNewPassword ? 'Set a new password' : 'Reset your password'}
        </h1>
        <p className="mt-2 text-sm text-secondary">
          {isSetNewPassword
            ? 'Choose a strong password you don’t use elsewhere.'
            : "We'll email you a secure link to reset your password."}
        </p>
      </div>

      {!codeChecked && isSetNewPassword ? (
        <Notice tone={tone}>{message || 'Loading…'}</Notice>
      ) : (
        <>
          {message && <Notice tone={tone}>{message}</Notice>}

          {isSetNewPassword ? (
            <form onSubmit={handleSetNewPassword} className="mt-5">
              <FieldGroup>
                {email && (
                  <FieldDescription className="text-sm">
                    Resetting password for{' '}
                    <span className="font-medium text-default">{email}</span>
                  </FieldDescription>
                )}

                <Field>
                  <FieldLabel
                    htmlFor="new-password"
                    className="text-default font-medium"
                  >
                    New password
                  </FieldLabel>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3 text-secondary/60 h-5 w-5" />
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={loading}
                      placeholder="••••••••"
                      className="h-11 pl-10 rounded-lg border-default bg-default px-3 py-2.5 text-default placeholder:text-quaternary focus-visible:border-strong focus-visible:ring-strong"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="confirm-password"
                    className="text-default font-medium"
                  >
                    Confirm new password
                  </FieldLabel>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3 text-secondary/60 h-5 w-5" />
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      placeholder="••••••••"
                      className="h-11 pl-10 rounded-lg border-default bg-default px-3 py-2.5 text-default placeholder:text-quaternary focus-visible:border-strong focus-visible:ring-strong"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                </Field>

                <Field>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-11 w-full rounded-full btn-brand-fill transition-expo"
                  >
                    {loading ? 'Updating…' : 'Update password'}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </Field>

                <FieldDescription className="text-center text-sm text-secondary [&>a]:text-link [&>a]:underline [&>a]:underline-offset-2 [&>a:hover]:text-preview">
                  Back to <Link href="/sign-in">sign in</Link>
                </FieldDescription>
              </FieldGroup>
            </form>
          ) : (
            <form onSubmit={handleRequestLink} className="mt-5">
              <FieldGroup>
                <Field>
                  <FieldLabel
                    htmlFor="reset-email"
                    className="text-default font-medium"
                  >
                    Email
                  </FieldLabel>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3 text-secondary/60 h-5 w-5" />
                    <Input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      placeholder="name@company.com"
                      className="h-11 pl-10 pr-3 rounded-lg border-default bg-default py-2.5 text-default placeholder:text-quaternary focus-visible:border-strong focus-visible:ring-strong"
                      required
                      autoComplete="email"
                    />
                  </div>
                </Field>

                <Field>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-11 w-full rounded-full btn-brand-fill transition-expo"
                  >
                    {loading ? 'Sending…' : 'Send reset link'}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </Field>

                <FieldDescription className="text-center text-sm text-secondary [&>a]:text-link [&>a]:underline [&>a]:underline-offset-2 [&>a:hover]:text-preview">
                  Remembered it? <Link href="/sign-in">Login</Link>
                </FieldDescription>
              </FieldGroup>
            </form>
          )}
        </>
      )}
    </div>
  );
}

function ResetPasswordPageFallback() {
  return (
    <div className="w-full max-w-[520px] glass-card rounded-3xl p-8 sm:p-10 border border-default animate-in fade-in duration-700">
      <Link href="/" className="flex items-center gap-2.5 w-fit group mb-8">
        <img
          src="/logo.png"
          alt="SocioGenie"
          className="h-10 w-10 rounded-xl transition-transform"
        />
        <span className="text-xl font-bold tracking-tight bg-gradient-primary-text">
          SocioGenie
        </span>
      </Link>
      <p className="text-sm text-secondary">Loading…</p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordPageFallback />}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
