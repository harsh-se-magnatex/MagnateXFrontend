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

type Tone = 'success' | 'error' | 'info' | '';

function Notice({
  tone,
  children,
}: {
  tone: Tone;
  children: React.ReactNode;
}) {
  if (!children) return null;
  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2 text-sm flex items-start gap-2',
        tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
        tone === 'error' && 'border-destructive/20 bg-destructive/10 text-destructive',
        (tone === 'info' || tone === '') &&
          'border-border bg-accent/30 text-muted-foreground'
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

  const oobCode = useMemo(() => searchParams.get('oobCode') || '', [searchParams]);
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
        toast.error(
          err instanceof Error
            ? err.message
            : 'This reset link is invalid or has expired.'
        );
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
      const res = await forgotPassword(trimmed,'http://localhost:3000/sign-in');
      if (!res.success) {
        setTone('error');
        console.log(res.message);
        if(res.message.startsWith("Firebase: Error (auth/user-not-found).")){
          toast.error('User with this email not found. Please sign up first.');
          return;
        }
        toast.error(res.message || 'Failed to send reset link.');
        return;
      }
      setTone('success');
      toast.success(
        "Reset link sent. Please check your inbox (and spam folder)."
      );
    } catch (err: any) {
      console.log(err.code);
      setTone('error');
      if(err.code ==="auth/user-not-found"){
        toast.error('User not found. Please sign up first.');
        return;
      }
      toast.error(err.message || 'Failed to send reset link.');
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
      setMessage(
          err instanceof Error ? err.message : 'Failed to reset password.'
        );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[520px] glass-card rounded-3xl p-8 sm:p-10 border border-border/40 shadow-xl shadow-primary-blue/10 animate-in fade-in duration-700">
      <Link href="/" className="flex items-center gap-2.5 w-fit group mb-8">
        <img
          src="/logo.png"
          alt="SocioGenie"
          className="h-10 w-10 rounded-xl shadow-sm transition-transform group-hover:scale-105"
        />
        <span className="text-xl font-bold tracking-tight bg-gradient-primary-text">
          SocioGenie
        </span>
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          {isSetNewPassword ? 'Set a new password' : 'Reset your password'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
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
                    Resetting password for <span className="font-medium text-foreground">{email}</span>
                  </FieldDescription>
                )}

                <Field>
                  <FieldLabel htmlFor="new-password" className="text-foreground font-medium">
                    New password
                  </FieldLabel>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3 text-muted-foreground/60 h-5 w-5" />
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={loading}
                      placeholder="••••••••"
                      className="h-11 pl-10 rounded-xl border-border bg-card px-3 py-2.5 text-foreground shadow-sm placeholder:text-muted-foreground/50 focus-visible:border-primary-blue focus-visible:ring-primary-blue/20"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                </Field>

                <Field>
                  <FieldLabel htmlFor="confirm-password" className="text-foreground font-medium">
                    Confirm new password
                  </FieldLabel>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3 text-muted-foreground/60 h-5 w-5" />
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      placeholder="••••••••"
                      className="h-11 pl-10 rounded-xl border-border bg-card px-3 py-2.5 text-foreground shadow-sm placeholder:text-muted-foreground/50 focus-visible:border-primary-blue focus-visible:ring-primary-blue/20"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                </Field>

                <Field>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-11 w-full rounded-xl bg-gradient-primary text-white shadow-md shadow-primary-blue/20 transition-all hover:shadow-lg hover:shadow-primary-blue/25 active:scale-[0.98]"
                  >
                    {loading ? 'Updating…' : 'Update password'}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </Field>

                <FieldDescription className="text-center text-sm text-muted-foreground [&>a]:text-primary-blue [&>a]:underline [&>a]:underline-offset-2 [&>a:hover]:text-primary-purple">
                  Back to <Link href="/sign-in">sign in</Link>
                </FieldDescription>
              </FieldGroup>
            </form>
          ) : (
            <form onSubmit={handleRequestLink} className="mt-5">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="reset-email" className="text-foreground font-medium">
                    Email
                  </FieldLabel>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3 text-muted-foreground/60 h-5 w-5" />
                    <Input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      placeholder="name@company.com"
                      className="h-11 pl-10 pr-3 rounded-xl border-border bg-card py-2.5 text-foreground shadow-sm placeholder:text-muted-foreground/50 focus-visible:border-primary-blue focus-visible:ring-primary-blue/20"
                      required
                      autoComplete="email"
                    />
                  </div>
                </Field>

                <Field>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-11 w-full rounded-xl bg-gradient-primary text-white shadow-md shadow-primary-blue/20 transition-all hover:shadow-lg hover:shadow-primary-blue/25 active:scale-[0.98]"
                  >
                    {loading ? 'Sending…' : 'Send reset link'}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </Field>

                <FieldDescription className="text-center text-sm text-muted-foreground [&>a]:text-primary-blue [&>a]:underline [&>a]:underline-offset-2 [&>a:hover]:text-primary-purple">
                  Remembered it? <Link href="/sign-in">Sign in</Link>
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
    <div className="w-full max-w-[520px] glass-card rounded-3xl p-8 sm:p-10 border border-border/40 shadow-xl shadow-primary-blue/10 animate-in fade-in duration-700">
      <Link href="/" className="flex items-center gap-2.5 w-fit group mb-8">
        <img
          src="/logo.png"
          alt="SocioGenie"
          className="h-10 w-10 rounded-xl shadow-sm transition-transform group-hover:scale-105"
        />
        <span className="text-xl font-bold tracking-tight bg-gradient-primary-text">
          SocioGenie
        </span>
      </Link>
      <p className="text-sm text-muted-foreground">Loading…</p>
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
