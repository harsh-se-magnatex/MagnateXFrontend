import type { Metadata } from 'next';
import { SigninForm } from '../_components/sign-inForm';

export const metadata: Metadata = {
  title: 'Sign in · SocioGenie',
  description:
    'Log in to SocioGenie to manage AI-generated, human-reviewed social posts.',
};

export default function SigninPage() {
  return (
    <div className="flex min-h-svh flex-col lg:flex-row mt-16">
      <aside className="relative hidden flex-1 flex-col justify-center overflow-hidden border-border lg:flex lg:max-w-[42%] xl:max-w-[45%] lg:border-r">
        <div className="absolute inset-0 bg-accent/15" />
        <div className="absolute top-1/4 left-1/4 h-[320px] w-[320px] rounded-full bg-primary-blue/10 blur-[90px]" />
        <div className="absolute bottom-1/3 right-0 h-[280px] w-[280px] rounded-full bg-primary-purple/10 blur-[80px]" />
        <div className="relative z-10 flex flex-col items-center justify-center gap-6 px-10 py-16 text-center">
          <img src="/logo.png" alt="SocioGenie" className="h-56 w-auto" />
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            AI-generated posts tailored to your brand—reviewed by humans before
            anything goes live.
          </p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col justify-center px-6 lg:px-12 xl:px-20">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <img src="/logo.png" alt="SocioGenie" className="h-24  w-auto" />
          </div>
          <SigninForm />
        </div>
      </div>
    </div>
  );
}
