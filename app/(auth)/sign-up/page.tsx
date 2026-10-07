import type { Metadata } from 'next';
import { AuthShowcase } from '@/components/auth/AuthShowcase';
import { SignupForm } from '@/app/(auth)/_components/sign-upForm';

export const metadata: Metadata = {
  title: 'Sign up · SocioGenie',
  description:
    'Create your free SocioGenie account—AI social content with human review.',
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-svh flex-col lg:flex-row">
      <aside className="relative hidden flex-1 border-default bg-hover lg:block lg:max-w-[46%] lg:border-r">
        {/* Scrolls on its own and stays put while the form scrolls. */}
        <div className="[scrollbar-width:thin] lg:sticky lg:top-22 lg:max-h-[calc(100svh-5.5rem)] lg:overflow-y-auto">
          <AuthShowcase />
        </div>
      </aside>

      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-12 xl:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <img src="/logo.png" alt="SocioGenie" className="h-24 w-auto" />
          </div>
          <SignupForm />
        </div>
      </div>
    </div>
  );
}
