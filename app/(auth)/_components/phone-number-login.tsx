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
import { cn } from '@/lib/utils';

const IN_PREFIX = '+91';

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export type PhoneNumberLoginProps = {
  intent: 'signin' | 'signup';
  onRecoveryNeeded?: (payload: { deletedDocId: string }) => void | Promise<void>;
  className?: string;
};

export function PhoneNumberLogin({
  intent,
  onRecoveryNeeded,
  className,
}: PhoneNumberLoginProps) {
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const router = useRouter();

  const [localDigits, setLocalDigits] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(
    null
  );

  useEffect(() => {
    if (recaptchaContainerRef.current) {
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
    }
    return () => {
      const w = window as unknown as { recaptchaVerifier?: RecaptchaVerifier };
      if (w.recaptchaVerifier) {
        w.recaptchaVerifier.clear();
        delete w.recaptchaVerifier;
      }
    };
  }, []);

  const e164 = `${IN_PREFIX}${localDigits}`;

  const resetToPhoneStep = () => {
    setStep('phone');
    setOtp('');
    setConfirmation(null);
  };

  const handleSendCode = async () => {
    if (localDigits.length !== 10) {
      toast.error('Enter a valid 10-digit mobile number.');
      return;
    }
    if (intent === 'signup') {
      const trimmed = displayName.trim();
      if (trimmed.length < 2) {
        toast.error('Please enter your name (at least 2 characters).');
        return;
      }
    }

    setLoading(true);
    try {
      const verifier = (
        window as unknown as { recaptchaVerifier?: RecaptchaVerifier }
      ).recaptchaVerifier;
      if (!verifier) {
        toast.error('Verification could not start. Please refresh and try again.');
        return;
      }
      const result = await signInWithPhoneNumber(auth, e164, verifier);
      setConfirmation(result);
      setStep('otp');
      toast.success('Verification code sent.');
    } catch (error: unknown) {
      console.error('Error sending SMS:', error);
      const message = await resolvePhoneAuthErrorForDeletedAccount(
        error,
        e164
      );
      toast.error(
        message.startsWith('Phone number linked')
          ? message
          : `Could not send code: ${message}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6 || !confirmation) {
      toast.error('Enter the 6-digit code.');
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

      const isNewFlag = localStorage.getItem('isNewUser');
      if (isNewFlag === 'true') {
        router.replace('/onBoarding');
        localStorage.removeItem('isNewUser');
        return;
      }
      router.replace('/home');
    } catch (error: unknown) {
      console.error('Phone login error:', error);
      const message = await resolvePhoneAuthErrorForDeletedAccount(
        error,
        e164
      );
      toast.error(message);
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
              <label className="mb-2 block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Full name
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3 h-5 w-5 text-muted-foreground/60" />
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="h-11 w-full rounded-xl border border-border bg-accent/30 py-3 pr-4 pl-10 text-base text-foreground transition-colors outline-none placeholder:text-muted-foreground/50 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20 sm:text-sm"
                />
              </div>
            </div>
          )}
          <div className="relative">
            <label className="mb-2 block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Mobile number
            </label>
            <div className="flex min-h-11 w-full items-stretch gap-2 rounded-xl border border-border bg-accent/30 transition-colors focus-within:border-primary-blue focus-within:ring-2 focus-within:ring-primary-blue/20">
              <span className="flex shrink-0 items-center border-r border-border px-3 text-sm font-medium text-muted-foreground">
                {IN_PREFIX}
              </span>
              <div className="relative flex min-w-0 flex-1 items-center">
                <Smartphone className="pointer-events-none absolute left-0 h-5 w-5 text-muted-foreground/60" />
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  value={localDigits}
                  onChange={(e) => setLocalDigits(digitsOnly(e.target.value))}
                  placeholder="98765 43210"
                  className="h-11 w-full min-w-0 rounded-r-xl bg-transparent py-3 pr-4 pl-9 text-base text-foreground outline-none placeholder:text-muted-foreground/50 sm:text-sm"
                />
              </div>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              India (+91) only · SMS rates may apply
            </p>
          </div>
          <Button
            variant="default"
            size="default"
            type="button"
            className="h-11 w-full bg-gradient-primary text-white hover:shadow-lg hover:shadow-primary-blue/25"
            onClick={() => void handleSendCode()}
            disabled={
              loading ||
              localDigits.length !== 10 ||
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
            <p className="text-sm text-muted-foreground">
              Enter the 6-digit code sent to{' '}
              <span className="font-medium text-foreground">{e164}</span>
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
              className="text-sm font-medium text-primary-blue underline-offset-2 hover:underline"
              onClick={resetToPhoneStep}
            >
              Change number
            </button>
          </div>
          <Button
            variant="default"
            type="button"
            className="h-11 w-full bg-gradient-primary text-white hover:shadow-lg hover:shadow-primary-blue/25"
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
