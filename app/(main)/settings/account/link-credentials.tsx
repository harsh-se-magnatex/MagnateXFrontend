'use client';

import { useEffect, useRef, useState } from 'react';
import {
  RecaptchaVerifier,
  type ConfirmationResult,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Mail, Smartphone, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  confirmPhoneLink,
  formatAuthLinkError,
  requestEmailLinkToAddEmail,
  startPhoneLink,
  syncPasswordProviderAfterEmailVerified,
} from '@/src/service/linkAuthMethods';

const IN_PREFIX = '+91';

const inputBase =
  'w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all';

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function firebaseErrorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const c = (err as { code?: string }).code;
    return typeof c === 'string' ? c : '';
  }
  return '';
}

type Props = {
  user: FirebaseUser;
};

export function LinkCredentialsSection({ user }: Props) {
  const hasEmail = Boolean(user.email);
  const hasPhone = Boolean(user.phoneNumber);
  /** Signed in with email (or OAuth with email) but phone not linked yet */
  const showEmailOnlyAddPhone = hasEmail && !hasPhone;

  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const [phoneDigits, setPhoneDigits] = useState('');
  const [phoneStep, setPhoneStep] = useState<'idle' | 'otp'>('idle');
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(
    null
  );
  const [phoneBusy, setPhoneBusy] = useState(false);

  const [linkEmail, setLinkEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [linkPassword2, setLinkPassword2] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailLinkSent, setEmailLinkSent] = useState(false);

  const hasPasswordProvider = user.providerData.some(
    (p) => p.providerId === 'password'
  );
  const needsEmailVerification = hasPasswordProvider && !user.emailVerified;

  const passwordBackendSyncedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user.emailVerified) return;
    if (!user.providerData.some((p) => p.providerId === 'password')) return;
    const key = `${user.uid}:password-backend`;
    if (passwordBackendSyncedRef.current === key) return;
    passwordBackendSyncedRef.current = key;
    void syncPasswordProviderAfterEmailVerified(user).catch(() => {
      passwordBackendSyncedRef.current = null;
    });
  }, [user, user.uid, user.emailVerified]);

  useEffect(() => {
    if (!recaptchaContainerRef.current) return;
    if (!(window as unknown as { recaptchaVerifier?: RecaptchaVerifier })
      .recaptchaVerifier) {
      (
        window as unknown as { recaptchaVerifier: RecaptchaVerifier }
      ).recaptchaVerifier = new RecaptchaVerifier(
        auth,
        recaptchaContainerRef.current,
        {
          size: 'invisible',
          callback: () => {},
          'expired-callback': () => {
            (window as unknown as { recaptchaVerifier?: RecaptchaVerifier })
              .recaptchaVerifier?.clear();
          },
        }
      );
    }
    return () => {
      const w = window as unknown as { recaptchaVerifier?: RecaptchaVerifier };
      if (w.recaptchaVerifier) {
        w.recaptchaVerifier.clear();
        delete w.recaptchaVerifier;
      }
    };
  }, []);

  const e164 = `${IN_PREFIX}${phoneDigits}`;

  const resetPhoneFlow = () => {
    setPhoneStep('idle');
    setOtp('');
    setConfirmation(null);
  };

  const handleSendPhoneLinkSms = async () => {
    if (phoneDigits.length !== 10) {
      toast.error('Enter a valid 10-digit mobile number.');
      return;
    }
    const verifier = (
      window as unknown as { recaptchaVerifier?: RecaptchaVerifier }
    ).recaptchaVerifier;
    if (!verifier) {
      toast.error('Verification could not start. Refresh the page.');
      return;
    }
    setPhoneBusy(true);
    try {
      const conf = await startPhoneLink(user, e164, verifier);
      setConfirmation(conf);
      setPhoneStep('otp');
      toast.info(
        'Verification code sent by SMS. Enter the 6-digit code below on this page.'
      );
    } catch (err: unknown) {
      toast.error(formatAuthLinkError(firebaseErrorCode(err)));
    } finally {
      setPhoneBusy(false);
    }
  };

  const handleConfirmPhoneLink = async () => {
    if (otp.length !== 6 || !confirmation) {
      toast.error('Enter the 6-digit code.');
      return;
    }
    setPhoneBusy(true);
    try {
      await confirmPhoneLink(confirmation, otp);
      resetPhoneFlow();
      toast.success('Phone number linked.');
    } catch (err: unknown) {
      toast.error(formatAuthLinkError(firebaseErrorCode(err)));
    } finally {
      setPhoneBusy(false);
    }
  };

  const handleRequestEmailLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = linkEmail.trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Enter a valid email address.');
      return;
    }
    if (linkPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (linkPassword !== linkPassword2) {
      toast.error('Passwords do not match.');
      return;
    }
    setEmailBusy(true);
    try {
      await requestEmailLinkToAddEmail(email, linkPassword);
      setEmailLinkSent(true);
      setLinkEmail('');
      setLinkPassword('');
      setLinkPassword2('');
      toast.info(
        'We sent a sign-in link to that address. Open it in this browser while you are signed in here — your email is linked only after you confirm the link.'
      );
    } catch (err: unknown) {
      toast.error(formatAuthLinkError(firebaseErrorCode(err)));
    } finally {
      setEmailBusy(false);
    }
  };

  if (!hasEmail && !hasPhone) {
    return (
      <section className="glass-card rounded-3xl p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-4">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
            <UserIcon className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">
            Email &amp; phone
          </h2>
        </div>
        <p className="text-sm text-slate-600">
          No email or phone on this account. Please contact support if you need
          help.
        </p>
      </section>
    );
  }

  return (
    <section className="glass-card rounded-3xl p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
          <Mail className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Email &amp; phone
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Linked sign-in methods. Add the missing one with verification.
          </p>
        </div>
      </div>

      {emailLinkSent && !hasEmail && hasPhone && (
        <div
          className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-950"
          role="status"
        >
          <p className="font-medium">Check your email</p>
          <p className="mt-1 text-indigo-900/90">
            Open the link we sent (on this device, while signed in) to verify and
            add this email. If the link opened elsewhere, sign in on that device
            or request a new link.
          </p>
        </div>
      )}

      {needsEmailVerification && (
        <div
          className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <p className="font-medium">Verify your email to finish linking</p>
          <p className="mt-1 text-amber-900/90">
            We sent a link to <span className="font-mono">{user.email}</span>.
            After you open it, password sign-in is fully enabled on your account.
          </p>
        </div>
      )}

      <div className="grid gap-8 sm:max-w-xl">
        {showEmailOnlyAddPhone ? (
          <>
            {/* Phone + inline OTP: email users adding mobile (SMS code on this page) */}
            <div
              className={cn(
                'space-y-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 sm:p-5',
                phoneStep === 'otp' && 'ring-1 ring-indigo-200/80'
              )}
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Add mobile number
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  India (+91). We’ll text you a code — enter it in the field below
                  on this page to verify and link.
                </p>
              </div>
              <div className="space-y-3">
                <label
                  htmlFor="link-phone-digits"
                  className="text-sm font-semibold text-slate-700"
                >
                  Mobile number
                </label>
                <div className="flex min-h-11 w-full items-stretch gap-2 rounded-xl border border-slate-200 bg-white transition-colors focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
                  <span className="flex shrink-0 items-center border-r border-slate-200 px-3 text-sm font-medium text-slate-600">
                    {IN_PREFIX}
                  </span>
                  <div className="relative flex min-w-0 flex-1 items-center">
                    <Smartphone className="pointer-events-none absolute left-0 h-5 w-5 text-slate-400" />
                    <input
                      id="link-phone-digits"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={phoneDigits}
                      onChange={(e) =>
                        setPhoneDigits(digitsOnly(e.target.value))
                      }
                      disabled={phoneStep === 'otp'}
                      className="h-11 w-full min-w-0 rounded-r-xl bg-transparent py-3 pr-4 pl-9 text-slate-900 outline-none placeholder:text-slate-400"
                      placeholder="9876543210"
                      autoComplete="tel-national"
                    />
                  </div>
                </div>
                {phoneStep === 'idle' && (
                  <Button
                    type="button"
                    disabled={phoneBusy || phoneDigits.length !== 10}
                    onClick={() => void handleSendPhoneLinkSms()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 sm:w-auto"
                  >
                    {phoneBusy ? 'Sending code…' : 'Send verification code'}
                  </Button>
                )}

                <div
                  className="space-y-2 pt-1"
                  role="region"
                  aria-label="SMS verification code"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800">
                      Verification code
                    </p>
                    {phoneStep === 'otp' && (
                      <p className="text-xs text-slate-600">
                        Sent to <span className="font-mono">{e164}</span>
                      </p>
                    )}
                  </div>
                  {phoneStep === 'idle' && (
                    <p className="text-xs text-slate-500">
                      Tap “Send verification code” to receive a 6-digit SMS, then
                      enter it here.
                    </p>
                  )}
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    disabled={phoneStep !== 'otp'}
                    containerClassName="w-full justify-center gap-1.5 sm:gap-2"
                  >
                    <InputOTPGroup className="w-full justify-center gap-1.5">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="size-10 rounded-lg bg-white sm:size-11"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  {phoneStep === 'otp' && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetPhoneFlow}
                        className="bg-white"
                      >
                        Change number
                      </Button>
                      <Button
                        type="button"
                        disabled={phoneBusy || otp.length !== 6}
                        onClick={() => void handleConfirmPhoneLink()}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        {phoneBusy ? 'Verifying…' : 'Verify & link phone'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Email read-only below */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Email address
              </label>
              <input
                type="email"
                value={user.email || ''}
                disabled
                className={cn(inputBase, 'opacity-80')}
                readOnly
              />
            </div>
          </>
        ) : (
          <>
            {/* Email row */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Email address
              </label>
              <input
                type="email"
                value={hasEmail ? user.email || '' : linkEmail}
                onChange={(e) => setLinkEmail(e.target.value)}
                disabled={hasEmail}
                className={cn(inputBase, hasEmail && 'opacity-80')}
                placeholder="you@company.com"
                autoComplete="email"
              />
              {!hasEmail && hasPhone && (
                <form onSubmit={handleRequestEmailLink} className="mt-4 space-y-4">
                  <p className="text-sm text-slate-600">
                    We’ll email you a sign-in link. Your email and password are
                    added <span className="font-medium">only after you open
                    that link</span> (same browser, while signed in).
                  </p>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Password to use after verification
                    </label>
                    <input
                      type="password"
                      value={linkPassword}
                      onChange={(e) => setLinkPassword(e.target.value)}
                      className={inputBase}
                      autoComplete="new-password"
                      placeholder="At least 6 characters"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Confirm password
                    </label>
                    <input
                      type="password"
                      value={linkPassword2}
                      onChange={(e) => setLinkPassword2(e.target.value)}
                      className={inputBase}
                      autoComplete="new-password"
                      placeholder="Confirm password"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={emailBusy}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700"
                  >
                    {emailBusy ? 'Sending…' : 'Send verification link'}
                  </Button>
                </form>
              )}
            </div>

            {/* Phone row: in this branch user always has a phone on the account (linked or phone-only) */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Mobile number
              </label>
              <input
                type="tel"
                value={user.phoneNumber || ''}
                disabled
                className={cn(inputBase, 'opacity-80')}
              />
            </div>
          </>
        )}
      </div>

      <div id="recaptcha-container-account-link" ref={recaptchaContainerRef} />
    </section>
  );
}
