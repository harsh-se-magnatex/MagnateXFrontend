'use client';

import { useAuth } from '@/src/hooks/useAuth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { isSignInWithEmailLink } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  completeAccountEmailLink,
  formatAuthLinkError,
  setPasswordAndFinishAccountEmailLink,
} from '@/src/service/linkAuthMethods';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const inputBase =
  'w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all';

function firebaseErrorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const c = (err as { code?: string }).code;
    return typeof c === 'string' ? c : '';
  }
  return '';
}

export default function CompleteEmailLinkPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<
    'working' | 'no-link' | 'need-signin' | 'needs-password' | 'error'
  >('working');
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [finishBusy, setFinishBusy] = useState(false);
  const linkStarted = useRef(false);
  const signInRedirected = useRef(false);

  const runComplete = useCallback(async () => {
    if (typeof window === 'undefined' || !user) return;
    const href = window.location.href;
    if (!isSignInWithEmailLink(auth, href)) {
      setView('no-link');
      return;
    }
    setErrMsg(null);
    try {
      const result = await completeAccountEmailLink(user, href);
      if (result.status === 'done') {
        router.replace('/settings/account');
        toast.success('Email verified and linked to your account.');
        return;
      }
      setView('needs-password');
    } catch (err: unknown) {
      const code = firebaseErrorCode(err);
      if (code === 'auth/provider-already-linked') {
        router.replace('/settings/account');
        toast.info('This email is already linked to your account.');
        return;
      }
      setErrMsg(
        code
          ? formatAuthLinkError(code)
          : err instanceof Error
            ? err.message
            : 'Could not complete linking.'
      );
      setView('error');
    }
  }, [user, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      if (signInRedirected.current) return;
      signInRedirected.current = true;
      if (typeof window === 'undefined') return;
      const next = encodeURIComponent(window.location.href);
      router.replace(`/sign-in?returnTo=${next}`);
      setView('need-signin');
      return;
    }
    if (linkStarted.current) return;
    if (typeof window === 'undefined') return;
    if (!isSignInWithEmailLink(auth, window.location.href)) {
      setView('no-link');
      return;
    }
    linkStarted.current = true;
    void runComplete();
  }, [authLoading, user, router, runComplete]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (pwd.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (pwd !== pwd2) {
      toast.error('Passwords do not match.');
      return;
    }
    setFinishBusy(true);
    try {
      await setPasswordAndFinishAccountEmailLink(user, pwd);
      setPwd('');
      setPwd2('');
      router.replace('/settings/account');
      toast.success('Email linked and password saved.');
    } catch (err: unknown) {
      const code = firebaseErrorCode(err);
      toast.error(
        code ? formatAuthLinkError(code) : 'Could not save password. Try again.'
      );
    } finally {
      setFinishBusy(false);
    }
  };

  if (authLoading) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-slate-600">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm">Loading…</p>
      </div>
    );
  }

  if (view === 'need-signin') {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-slate-600">
        <p className="text-sm">Redirecting to sign in…</p>
      </div>
    );
  }

  if (view === 'no-link') {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-xl font-semibold text-slate-900">Email link</h1>
        <p className="mt-2 text-sm text-slate-600">
          This page is opened from a verification link. Use the link in the
          email we sent, or go to account settings to send a new one.
        </p>
        <Button
          type="button"
          className="mt-6 bg-indigo-600 hover:bg-indigo-700"
          onClick={() => router.push('/settings/account')}
        >
          Back to account settings
        </Button>
      </div>
    );
  }

  if (view === 'error' && errMsg) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-xl font-semibold text-slate-900">
          Couldn&apos;t add email
        </h1>
        <p className="mt-2 text-sm text-slate-600">{errMsg}</p>
        <Button
          type="button"
          className="mt-6 bg-indigo-600 hover:bg-indigo-700"
          onClick={() => router.push('/settings/account')}
        >
          Back to account settings
        </Button>
      </div>
    );
  }

  if (view === 'needs-password') {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-xl font-semibold text-slate-900">
          Set a password
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Your email is verified and linked. Choose a password for signing in
          with email.
        </p>
        <form onSubmit={handleSetPassword} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label
              className="text-sm font-semibold text-slate-700"
              htmlFor="set-p1"
            >
              Password
            </label>
            <input
              id="set-p1"
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              className={inputBase}
              autoComplete="new-password"
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-sm font-semibold text-slate-700"
              htmlFor="set-p2"
            >
              Confirm password
            </label>
            <input
              id="set-p2"
              type="password"
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              className={inputBase}
              autoComplete="new-password"
            />
          </div>
          <Button
            type="submit"
            disabled={finishBusy}
            className="w-full bg-indigo-600 hover:bg-indigo-700 sm:w-auto"
          >
            {finishBusy ? 'Saving…' : 'Save password'}
          </Button>
        </form>
      </div>
    );
  }

  if (view === 'working') {
    return (
      <div
        className={cn(
          'mx-auto max-w-md px-4 py-16',
          'flex flex-col items-center justify-center gap-3 text-slate-600'
        )}
      >
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm">Linking your email…</p>
      </div>
    );
  }

  return null;
}
