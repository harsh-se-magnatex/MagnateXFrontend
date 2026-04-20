import type { Metadata } from 'next';
import { SignupForm } from '@/app/(auth)/_components/sign-upForm';

export const metadata: Metadata = {
  title: 'Sign up · SocioGenie',
  description:
    'Create your free SocioGenie account—AI social content with human review.',
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-svh flex-col lg:flex-row mt-16">
      <aside className="relative flex flex-1 flex-col justify-center border-b border-border bg-accent/10 px-6 py-12 lg:max-w-[50%] lg:border-b-0 lg:border-r lg:px-10 xl:px-14">
        <div className="absolute inset-0 bg-primary-blue/[0.06]" />
        <div className="absolute bottom-0 left-0 h-[240px] w-[240px] rounded-full bg-primary-purple/8 blur-[72px]" />
        <div className="relative z-10 mx-auto max-w-lg lg:mx-0">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary-blue">
            SocioGenie
          </p>
          <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight text-foreground xl:text-4xl">
            Automate Your Social Media with AI + Human Review
          </h1>
          <p className="mb-8 text-base leading-relaxed text-muted-foreground">
            Set up in under 10 minutes. Content ready within 24 hours.
          </p>
          <ul className="mb-10 space-y-3 text-sm leading-relaxed text-foreground">
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-primary-blue" aria-hidden>
                ✓
              </span>
              <span>AI-generated content tailored to your brand</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-primary-blue" aria-hidden>
                ✓
              </span>
              <span>Human-reviewed before every post goes live</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-primary-blue" aria-hidden>
                ✓
              </span>
              <span>Instagram, Facebook &amp; LinkedIn supported</span>
            </li>
          </ul>
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              What happens next
            </h2>
            <ol className="list-inside list-decimal space-y-2 text-sm leading-relaxed text-muted-foreground marker:text-primary-blue">
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
