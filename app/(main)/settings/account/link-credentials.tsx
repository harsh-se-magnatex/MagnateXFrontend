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
import { Mail, Smartphone, User as UserIcon, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/show-error-toast';
import { cn } from '@/lib/utils';
import {
  confirmPhoneLink,
  formatAuthLinkError,
  requestEmailLinkToAddEmail,
  startPhoneLink,
  syncPasswordProviderAfterEmailVerified,
} from '@/src/service/linkAuthMethods';

const IN_PREFIX = '+91';

import {
  workspaceInputClass,
  workspaceSectionCardClass,
  workspaceSectionTitleLgClass,
  workspaceSectionLabelClass,
  workspaceIconBadgeClass,
} from '@/lib/workspace-ui';

const inputBase = workspaceInputClass;

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
  const showEmailVerified =
    hasEmail && user.emailVerified && hasPasswordProvider;

  // Persisted across remounts so revisiting /settings/account does not retrigger the
  // backend sync (which previously caused social token refresh to run every visit and
  // wipe `users/{uid}/social/{facebook,instagram}` on transient Graph API errors).
  const passwordBackendSyncInFlightRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user.emailVerified) return;
    if (!user.providerData.some((p) => p.providerId === 'password')) return;
    if (typeof window === 'undefined') return;

    const storageKey = `magnatex:password-backend-synced:${user.uid}`;
    try {
      if (window.localStorage.getItem(storageKey) === '1') return;
    } catch {
      // localStorage unavailable (private mode, etc.); fall through to in-memory dedupe.
    }

    const inFlightKey = `${user.uid}:password-backend`;
    if (passwordBackendSyncInFlightRef.current === inFlightKey) return;
    passwordBackendSyncInFlightRef.current = inFlightKey;

    void syncPasswordProviderAfterEmailVerified(user)
      .then(() => {
        try {
          window.localStorage.setItem(storageKey, '1');
        } catch {
          // best-effort persistence; the ref still dedupes this session.
        }
      })
      .catch(() => {
        passwordBackendSyncInFlightRef.current = null;
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
      showErrorToast('Enter a valid 10-digit mobile number.');
      return;
    }
    const verifier = (
      window as unknown as { recaptchaVerifier?: RecaptchaVerifier }
    ).recaptchaVerifier;
    if (!verifier) {
      showErrorToast('Verification could not start. Refresh the page.');
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
      console.log('err', err);
      showErrorToast(formatAuthLinkError(firebaseErrorCode(err)));
    } finally {
      setPhoneBusy(false);
    }
  };

  const handleConfirmPhoneLink = async () => {
    if (otp.length !== 6 || !confirmation) {
      showErrorToast('Enter the 6-digit code.');
      return;
    }
    setPhoneBusy(true);
    try {
      await confirmPhoneLink(confirmation, otp);
      resetPhoneFlow();
      toast.success('Phone number linked.');
    } catch (err: unknown) {
      console.log('err', err);
      showErrorToast(formatAuthLinkError(firebaseErrorCode(err)));
    } finally {
      setPhoneBusy(false);
    }
  };

  const handleRequestEmailLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = linkEmail.trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      showErrorToast('Enter a valid email address.');
      return;
    }
    if (linkPassword.length < 6) {
      showErrorToast('Password must be at least 6 characters.');
      return;
    }
    if (linkPassword !== linkPassword2) {
      showErrorToast('Passwords do not match.');
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
      showErrorToast(formatAuthLinkError(firebaseErrorCode(err)));
    } finally {
      setEmailBusy(false);
    }
  };

  if (!hasEmail && !hasPhone) {
    return (
      <section className={workspaceSectionCardClass}>
        <div className="mb-4 flex items-center gap-3 border-b border-border/60 pb-4">
          <div className={workspaceIconBadgeClass}>
            <UserIcon className="h-5 w-5" />
          </div>
          <h2 className={workspaceSectionTitleLgClass}>Email &amp; phone</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          No email or phone on this account. Please contact support if you need
          help.
        </p>
      </section>
    );
  }

  return (
    <section className={workspaceSectionCardClass}>
      <div className="mb-6 flex items-center gap-3 border-b border-border/60 pb-4">
        <div className={workspaceIconBadgeClass}>
          <Mail className="h-5 w-5" />
        </div>
        <div>
          <h2 className={workspaceSectionTitleLgClass}>Email &amp; phone</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Linked sign-in methods. Add the missing one with verification.
          </p>
        </div>
      </div>

      {emailLinkSent && !hasEmail && hasPhone && (
        <div
          className="mb-6 rounded-2xl border border-primary/35 bg-primary/10 px-4 py-3 text-sm text-foreground ring-1 ring-primary/15"
          role="status"
        >
          <p className="font-medium">Check your email</p>
          <p className="mt-1 text-muted-foreground">
            Open the link we sent (on this device, while signed in) to verify and
            add this email. If the link opened elsewhere, sign in on that device
            or request a new link.
          </p>
        </div>
      )}

      {showEmailVerified && (
        <div
          className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-500/35 bg-emerald-950/55 px-4 py-3 text-sm text-emerald-100 ring-1 ring-emerald-500/20"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
          <div>
            <p className="font-medium text-emerald-100">Email verified</p>
            <p className="mt-1 text-emerald-200/85">
              Password sign-in is enabled for{' '}
              <span className="font-mono">{user.email}</span>.
            </p>
          </div>
        </div>
      )}

      {needsEmailVerification && (
        <div
          className="mb-6 rounded-2xl border border-amber-500/35 bg-amber-950/55 px-4 py-3 text-sm text-amber-100 ring-1 ring-amber-500/20"
          role="status"
        >
          <p className="font-medium">Verify your email to finish linking</p>
          <p className="mt-1 text-amber-200/85">
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
                'space-y-4 rounded-2xl border border-primary/30 bg-card p-4 ring-1 ring-primary/15 sm:p-5',
                phoneStep === 'otp' && 'ring-primary/25'
              )}
            >
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Add mobile number
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  India (+91). We’ll text you a code — enter it in the field below
                  on this page to verify and link.
                </p>
              </div>
              <div className="space-y-3">
                <label
                  htmlFor="link-phone-digits"
                  className={workspaceSectionLabelClass}
                >
                  Mobile number
                </label>
                <div className="flex min-h-11 w-full items-stretch gap-2 rounded-xl border border-border bg-muted transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                  <span className="flex shrink-0 items-center border-r border-border px-3 text-sm font-medium text-muted-foreground">
                    {IN_PREFIX}
                  </span>
                  <div className="relative flex min-w-0 flex-1 items-center">
                    <Smartphone className="pointer-events-none absolute left-0 h-5 w-5 text-muted-foreground" />
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
                      className="h-11 w-full min-w-0 rounded-r-xl bg-transparent py-3 pr-4 pl-9 text-foreground outline-none placeholder:text-muted-foreground"
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
                    className="w-full bg-primary hover:opacity-95 sm:w-auto"
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
                    <p className="text-sm font-medium text-foreground">
                      Verification code
                    </p>
                    {phoneStep === 'otp' && (
                      <p className="text-xs text-muted-foreground">
                        Sent to <span className="font-mono">{e164}</span>
                      </p>
                    )}
                  </div>
                  {phoneStep === 'idle' && (
                    <p className="text-xs text-muted-foreground">
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
                          className="size-10 rounded-lg border border-border bg-muted sm:size-11"
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
                        className="bg-card"
                      >
                        Change number
                      </Button>
                      <Button
                        type="button"
                        disabled={phoneBusy || otp.length !== 6}
                        onClick={() => void handleConfirmPhoneLink()}
                        className="bg-primary hover:opacity-95"
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
              <label className={workspaceSectionLabelClass}>
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
              <label className={workspaceSectionLabelClass}>
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
                  <p className="text-sm text-muted-foreground">
                    We’ll email you a sign-in link. Your email and password are
                    added <span className="font-medium">only after you open
                    that link</span> (same browser, while signed in).
                  </p>
                  <div className="space-y-2">
                    <label className={workspaceSectionLabelClass}>
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
                    <label className={workspaceSectionLabelClass}>
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
                    className="w-full bg-primary hover:opacity-95 sm:w-auto"
                  >
                    {emailBusy ? 'Sending…' : 'Send verification link'}
                  </Button>
                </form>
              )}
            </div>

            {/* Phone row: in this branch user always has a phone on the account (linked or phone-only) */}
            <div className="space-y-2">
              <label className={workspaceSectionLabelClass}>
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
