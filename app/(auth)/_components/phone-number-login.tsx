'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth';
import { updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { ArrowRight, Smartphone, User } from 'lucide-react';
import { loginUser } from '@/src/service/api/userService';
import { resolvePhoneAuthErrorForDeletedAccount } from '@/src/service/auth';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/show-error-toast';
import { trackLogin, trackSignUp } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { CountryCodePhoneField } from '@/components/shared/CountryCodePhoneField';
import { joinPhone } from '@/lib/country-codes';

export type PhoneNumberLoginProps = {
  intent: 'signin' | 'signup';
  /** After sign-in, navigate here if set (safe in-app path only). */
  returnToPath?: string | null;
  onRecoveryNeeded?: (payload: {
    deletedDocId: string;
  }) => void | Promise<void>;
  className?: string;
};

export function PhoneNumberLogin({
  intent,
  returnToPath,
  onRecoveryNeeded,
  className,
}: PhoneNumberLoginProps) {
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const router = useRouter();

  const [phoneCountryCode, setPhoneCountryCode] = useState('');
  const [phoneNationalNumber, setPhoneNationalNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(
    null
  );

  useEffect(() => {
    if (recaptchaContainerRef.current) {
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

  const resetToPhoneStep = () => {
    setStep('phone');
    setOtp('');
    setConfirmation(null);
  };

  const handleSendCode = async () => {
    if (!phoneCountryCode) {
      showErrorToast('Select a country code.');
      return;
    }
    if (phoneNationalNumber.length < 6) {
      showErrorToast('Enter a valid mobile number.');
      return;
    }
    if (intent === 'signup') {
      const trimmed = displayName.trim();
      if (trimmed.length < 2) {
        showErrorToast('Please enter your name (at least 2 characters).');
        return;
      }
    }

    setLoading(true);
    try {
      const verifier = (
        window as unknown as { recaptchaVerifier?: RecaptchaVerifier }
      ).recaptchaVerifier;
      if (!verifier) {
        showErrorToast(
          'Verification could not start. Please refresh and try again.'
        );
        return;
      }
      const result = await signInWithPhoneNumber(auth, e164, verifier);
      setConfirmation(result);
      setStep('otp');
      toast.success('Verification code sent.');
    } catch (error: unknown) {
      console.error('Error sending SMS:', error);
      const message = await resolvePhoneAuthErrorForDeletedAccount(error, e164);
      showErrorToast(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6 || !confirmation) {
      showErrorToast('Enter the 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await confirmation.confirm(otp);
      const idToken = await userCredential.user.getIdToken(true);
      const nameOpt =
        intent === 'signup' ? { name: displayName.trim() } : undefined;

      const response = await loginUser(idToken, intent, 'phone', nameOpt);

      if (response.data?.showRecoveryPopup && response.data?.deletedDocId) {
        if (onRecoveryNeeded) {
          await onRecoveryNeeded({
            deletedDocId: response.data.deletedDocId,
          });
        } else {
          toast.info(
            'A recently deleted account is linked to this number. Sign in to recover it or start fresh.'
          );
          await auth.signOut();
          router.replace('/sign-in');
        }
        return;
      }

      if (intent === 'signup') {
        void trackSignUp('phone');
        await updateProfile(userCredential.user, {
          displayName: displayName.trim(),
        });
        localStorage.setItem('isNewUser', 'true');
        await auth.signOut();
        toast.success(
          'Account created successfully. Please sign in to continue.'
        );
        router.replace('/sign-in');
        return;
      }

      void trackLogin('phone');

      const isNewFlag = localStorage.getItem('isNewUser');
      if (isNewFlag === 'true') {
        router.replace('/onBoarding');
        localStorage.removeItem('isNewUser');
        return;
      }
      if (
        intent === 'signin' &&
        returnToPath &&
        !returnToPath.startsWith('/sign-in')
      ) {
        router.replace(returnToPath);
        return;
      }
      router.replace('/home');
    } catch (error: unknown) {
      console.error('Phone login error:', error);
      const message = await resolvePhoneAuthErrorForDeletedAccount(error, e164);
      showErrorToast(message);
      try {
        await auth.signOut();
      } catch {
        /* ignore */
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {step === 'phone' ? (
        <>
          {intent === 'signup' && (
            <div className="relative">
              <label className="mb-2 block text-xs font-semibold tracking-wider text-secondary uppercase">
                Full name
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3 h-5 w-5 text-secondary/60" />
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="h-11 w-full rounded-lg border border-default bg-hover py-3 pr-4 pl-10 text-base text-default transition-expo outline-none placeholder:text-quaternary focus:border-primary-blue focus:ring-2 focus:ring-strong sm:text-sm"
                />
              </div>
            </div>
          )}
          <div className="relative">
            <label className="mb-2 block text-xs font-semibold tracking-wider text-secondary uppercase">
              Mobile number
            </label>
            <CountryCodePhoneField
              id="auth-phone-number"
              countryCode={phoneCountryCode}
              nationalNumber={phoneNationalNumber}
              onChange={(countryCode, nationalNumber) => {
                setPhoneCountryCode(countryCode);
                setPhoneNationalNumber(nationalNumber);
              }}
              selectClassName="h-11 rounded-xl border-default bg-hover px-3 text-base text-default placeholder:text-quaternary focus-visible:border-strong focus-visible:ring-strong"
              customInputClassName="h-11 rounded-xl border-default bg-hover px-3 text-base text-default placeholder:text-quaternary focus-visible:border-strong focus-visible:ring-strong"
              numberInputClassName="h-11 rounded-xl border-default bg-hover px-3 text-base text-default placeholder:text-quaternary focus-visible:border-strong focus-visible:ring-strong"
              nationalPlaceholder="98765 43210"
            />
            <p className="mt-1.5 text-xs text-secondary">
              Select your country code, then enter your mobile number. SMS rates
              may apply.
            </p>
          </div>
          <Button
            variant="default"
            size="default"
            type="button"
            className="h-11 w-full btn-brand-fill"
            onClick={() => void handleSendCode()}
            disabled={
              loading ||
              !phoneCountryCode ||
              phoneNationalNumber.length < 6 ||
              (intent === 'signup' && displayName.trim().length < 2)
            }
          >
            {loading ? 'Sending code…' : 'Continue with phone'}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <p className="text-sm text-secondary">
              Enter the 6-digit code sent to{' '}
              <span className="font-medium text-default">{e164}</span>
            </p>
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={setOtp}
              containerClassName="w-full justify-center gap-1.5 sm:gap-2"
            >
              <InputOTPGroup className="w-full justify-center gap-1.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className="size-10 min-h-11 min-w-10 flex-1 rounded-lg text-base sm:size-11"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              className="text-sm font-medium text-link underline-offset-2 hover:underline"
              onClick={resetToPhoneStep}
            >
              Change number
            </button>
          </div>
          <Button
            variant="default"
            type="button"
            className="h-11 w-full btn-brand-fill"
            onClick={() => void handleVerifyOtp()}
            disabled={loading || otp.length !== 6}
          >
            {loading ? 'Verifying…' : 'Verify and continue'}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </>
      )}
      <div id="recaptcha-container" ref={recaptchaContainerRef} />
    </div>
  );
}
