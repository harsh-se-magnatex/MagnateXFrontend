'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { getAdditionalUserInfo } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { ArrowRight, Smartphone } from 'lucide-react';
import { verifyToken } from '@/src/service/api/verifyToken';

export function PhoneNumberLogin() {
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState('');

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

  const handleSignInWithPhoneNumber = async () => {
    setLoading(true);
    try {
      const verifier = (
        window as unknown as { recaptchaVerifier?: RecaptchaVerifier }
      ).recaptchaVerifier;
      if (!verifier) {
        console.error('reCAPTCHA verifier not initialized.');
        return;
      }
      const confirmation = await signInWithPhoneNumber(
        auth,
        phoneNumber,
        verifier
      );
      const code = window.prompt(
        'Please enter the verification code sent to your phone.'
      );
      if (!code) {
        return;
      }
      const userCredential = await confirmation.confirm(code);
      const token = await userCredential.user.getIdToken();
      await verifyToken(token);
      const additionalUserInfo = getAdditionalUserInfo(userCredential);
      if (additionalUserInfo?.isNewUser) {
        router.replace('/onBoarding');
        return;
      }
      router.replace('/home');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error during phone sign-in:', error);
      alert(`Sign-in error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <label className="mb-2 block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Phone Number
        </label>
        <div className="relative flex items-center">
          <Smartphone className="absolute left-3 h-5 w-5 text-muted-foreground/60" />
          <input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+1 (555) 000-0000"
            className="w-full rounded-xl border border-border bg-accent/30 py-3 pr-4 pl-10 text-foreground transition-colors outline-none placeholder:text-muted-foreground/50 focus:border-primary-blue focus:ring-2 focus:ring-primary-blue/20"
          />
        </div>
      </div>
      <Button
        variant="default"
        size="default"
        type="button"
        className="h-10 w-full bg-gradient-primary text-white hover:shadow-lg hover:shadow-primary-blue/25"
        onClick={() => void handleSignInWithPhoneNumber()}
        disabled={loading || !phoneNumber}
      >
        {loading ? 'Sending Code...' : 'Continue with Phone'}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </Button>
      <div id="recaptcha-container" ref={recaptchaContainerRef} />
    </div>
  );
}
