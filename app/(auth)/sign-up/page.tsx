import type { Metadata } from 'next';
import Link from 'next/link';
import { SignupForm } from '@/app/(auth)/_components/sign-upForm';

export const metadata: Metadata = {
  title: 'Sign up · SocioGenie',
  description:
    'Create your free SocioGenie account—AI social content with human review.',
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-svh flex-col lg:flex-row">
      <aside className="relative flex flex-1 flex-col justify-center border-b border-default bg-hover px-6 py-12 lg:max-w-[50%] lg:border-b-0 lg:border-r lg:px-10 xl:px-14">
        <div className="absolute inset-0 bg-primary-blue/[0.06]" />
        <div className="absolute bottom-0 left-0 h-[240px] w-[240px] rounded-full bg-primary-purple/8 blur-[72px]" />
        <div className="relative z-10 mx-auto max-w-lg lg:mx-0">
          <Link
            href="/"
            className="group mb-8 inline-flex items-center gap-4"
            aria-label="SocioGenie home"
          >
            <img
              src="/logo.png"
              alt="SocioGenie"
              className="h-20 w-20 shrink-0 rounded-3xl transition-transform duration-300 sm:h-24 sm:w-24"
            />
            <span className="font-[family-name:var(--font-bricolage)] text-3xl font-bold tracking-[-0.03em] text-default sm:text-4xl">
              Socio<span className="bg-gradient-primary-text">Genie</span>
            </span>
          </Link>
          <h1 className="text-page-title text-default mb-4 xl:">
            Automate Your Social Media with AI + Human Review
          </h1>
          <p className="mb-8 text-base leading-relaxed text-secondary">
            Set up in under 10 minutes. Content ready within 24 hours.
          </p>
          <ul className="mb-10 space-y-3 text-sm leading-relaxed text-default">
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-link" aria-hidden>
                ✓
              </span>
              <span>AI-generated content tailored to your brand</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-link" aria-hidden>
                ✓
              </span>
              <span>Human-reviewed before every post goes live</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-link" aria-hidden>
                ✓
              </span>
              <span>Instagram, Facebook &amp; LinkedIn supported</span>
            </li>
          </ul>
          <div>
            <h2 className="text-section text-default mb-3 uppercase tracking-wider">
              What happens next
            </h2>
            <ol className="list-inside list-decimal space-y-2 text-sm leading-relaxed text-secondary marker:text-link">
              <li>Build your brand profile</li>
              <li>Connect your platforms</li>
              <li>Get your first content batch within 24 hours</li>
            </ol>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-12 xl:px-16">
        <div className="mx-auto w-full max-w-md">
          <SignupForm />
        </div>
      </div>
    </div>
  );
}
