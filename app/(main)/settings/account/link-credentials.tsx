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
import { CountryCodePhoneField } from '@/components/shared/CountryCodePhoneField';
import { joinPhone, splitStoredPhone } from '@/lib/country-codes';
import {
  confirmPhoneLink,
  formatAuthLinkError,
  requestEmailLinkToAddEmail,
  startPhoneLink,
  syncPasswordProviderAfterEmailVerified,
} from '@/src/service/linkAuthMethods';

import {
  workspaceInputClass,
  workspaceSectionCardClass,
  workspaceSectionTitleLgClass,
  workspaceSectionLabelClass,
  workspaceIconBadgeClass,
} from '@/lib/workspace-ui';

const inputBase = workspaceInputClass;

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
  const [phoneCountryCode, setPhoneCountryCode] = useState('');
  const [phoneNationalNumber, setPhoneNationalNumber] = useState('');
  const [phoneStep, setPhoneStep] = useState<'idle' | 'otp'>('idle');
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(
    null
  );
  const [phoneBusy, setPhoneBusy] = useState(false);

  const [linkEmail, setLinkEmail] = useState('');
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
    if (
      !(window as unknown as { recaptchaVerifier?: RecaptchaVerifier })
        .recaptchaVerifier
    ) {
      (
        window as unknown as { recaptchaVerifier: RecaptchaVerifier }
      ).recaptchaVerifier = new RecaptchaVerifier(
        auth,
        recaptchaContainerRef.current,
        {
          size: 'invisible',
          callback: () => {},
          'expired-callback': () => {
            (
              window as unknown as { recaptchaVerifier?: RecaptchaVerifier }
            ).recaptchaVerifier?.clear();
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

  const e164 = joinPhone(phoneCountryCode, phoneNationalNumber);

  const resetPhoneFlow = () => {
    setPhoneStep('idle');
    setOtp('');
    setConfirmation(null);
  };

  useEffect(() => {
    const { countryCode, nationalNumber } = splitStoredPhone(user.phoneNumber);
    setPhoneCountryCode(countryCode);
    setPhoneNationalNumber(nationalNumber);
  }, [user.phoneNumber]);

  const handleSendPhoneLinkSms = async () => {
    if (!phoneCountryCode) {
      showErrorToast('Select a country code.');
      return;
    }
    if (phoneNationalNumber.length < 6) {
      showErrorToast('Enter a valid mobile number.');
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
    setEmailBusy(true);
    try {
      await requestEmailLinkToAddEmail(email);
      setEmailLinkSent(true);
      setLinkEmail('');
      toast.info(
        'We sent a verification link to that address. Open it while signed in — you’ll set a password after the email is verified.'
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
        <div className="mb-4 flex items-center gap-3 border-b border-default pb-4">
          <div className={workspaceIconBadgeClass}>
            <UserIcon className="h-5 w-5" />
          </div>
          <h2 className={workspaceSectionTitleLgClass}>Email &amp; phone</h2>
        </div>
        <p className="text-sm text-secondary">
          No email or phone on this account. Please contact support if you need
          help.
        </p>
      </section>
    );
  }

  return (
    <section className={workspaceSectionCardClass}>
      <div className="mb-6 flex items-center gap-3 border-b border-default pb-4">
        <div className={workspaceIconBadgeClass}>
          <Mail className="h-5 w-5" />
        </div>
        <div>
          <h2 className={workspaceSectionTitleLgClass}>Email &amp; phone</h2>
          <p className="mt-0.5 text-sm text-secondary">
            Linked sign-in methods. Add the missing one with verification.
          </p>
        </div>
      </div>

      {emailLinkSent && !hasEmail && hasPhone && (
        <div
          className="mb-6 rounded-2xl border border-primary/35 bg-primary/10 px-4 py-3 text-sm text-default ring-1 ring-strong"
          role="status"
        >
          <p className="font-medium">Check your email</p>
          <p className="mt-1 text-secondary">
            Open the link we sent (on this device, while signed in) to verify
            and add this email. If the link opened elsewhere, sign in on that
            device or request a new link.
          </p>
        </div>
      )}

      {showEmailVerified && (
        <div
          className="mb-6 flex items-start gap-3 rounded-2xl border border-success bg-success px-4 py-3 text-sm text-success ring-1 ring-[var(--border-success)]"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <div>
            <p className="font-medium text-success">Email verified</p>
            <p className="mt-1 text-success">
              Password sign-in is enabled for{' '}
              <span className="font-mono">{user.email}</span>.
            </p>
          </div>
        </div>
      )}

      {needsEmailVerification && (
        <div
          className="mb-6 rounded-2xl border border-warning bg-warning px-4 py-3 text-sm text-warning ring-1 ring-[var(--border-warning)]"
          role="status"
        >
          <p className="font-medium">Verify your email to finish linking</p>
          <p className="mt-1 text-warning">
            We sent a link to <span className="font-mono">{user.email}</span>.
            After you open it, password sign-in is fully enabled on your
            account.
          </p>
        </div>
      )}

      <div className="grid gap-8 sm:max-w-xl">
        {showEmailOnlyAddPhone ? (
          <>
            {/* Phone + inline OTP: email users adding mobile (SMS code on this page) */}
            <div
              className={cn(
                'space-y-4 rounded-2xl border border-primary/30 bg-default p-4 ring-1 ring-strong sm:p-5',
                phoneStep === 'otp' && 'ring-strong'
              )}
            >
              <div>
                <p className="text-sm font-semibold text-default">
                  Add mobile number
                </p>
                <p className="mt-1 text-sm text-secondary">
                  We&apos;ll text you a code. Enter it below on this page to
                  verify and link your mobile number.
                </p>
              </div>
              <div className="space-y-3">
                <label
                  htmlFor="link-phone-digits"
                  className={workspaceSectionLabelClass}
                >
                  Mobile number
                </label>
                <CountryCodePhoneField
                  id="link-phone-digits"
                  countryCode={phoneCountryCode}
                  nationalNumber={phoneNationalNumber}
                  onChange={(countryCode, nationalNumber) => {
                    setPhoneCountryCode(countryCode);
                    setPhoneNationalNumber(nationalNumber);
                  }}
                  selectClassName={inputBase}
                  customInputClassName={inputBase}
                  numberInputClassName={inputBase}
                  nationalPlaceholder="98765 43210"
                  className={
                    phoneStep === 'otp'
                      ? 'pointer-events-none opacity-80'
                      : undefined
                  }
                />
                {phoneStep === 'idle' && (
                  <Button
                    type="button"
                    disabled={
                      phoneBusy ||
                      !phoneCountryCode ||
                      phoneNationalNumber.length < 6
                    }
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
                    <p className="text-sm font-medium text-default">
                      Verification code
                    </p>
                    {phoneStep === 'otp' && (
                      <p className="text-xs text-secondary">
                        Sent to <span className="font-mono">{e164}</span>
                      </p>
                    )}
                  </div>
                  {phoneStep === 'idle' && (
                    <p className="text-xs text-secondary">
                      Tap “Send verification code” to receive a 6-digit SMS,
                      then enter it here.
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
                          className="size-10 rounded-lg border border-default bg-element sm:size-11"
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
                        className="bg-default"
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
                <form
                  onSubmit={handleRequestEmailLink}
                  className="mt-4 space-y-4"
                >
                  <p className="text-sm text-secondary">
                    We’ll email you a verification link. Your email is linked
                    only after you open that link while signed in. You’ll choose
                    a password on the next step.
                  </p>
                  <Button
                    type="submit"
                    disabled={emailBusy || !linkEmail.trim()}
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
