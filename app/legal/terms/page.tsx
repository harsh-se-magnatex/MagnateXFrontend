import { Scale } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="max-w-4xl pt-10 mx-auto mb-20 animate-in fade-in duration-500">
      <header className="mb-10 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-6 shadow-sm border border-indigo-100">
          <Scale className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-4 text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
          Last updated: March 2026
        </p>
      </header>

      <div className="glass-card rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm bg-white prose prose-slate max-w-none ">
        <div>
          <p>
            <strong>1.</strong> Acceptance of Terms By accessing or using
            Sociogenie (“Platform”, “we”, “our”, “us”), you agree to be legally
            bound by these Terms. If you do not agree, you must not use the
            Platform.
          </p>
          <br />
          <p>
            <strong>2.</strong> Description of Services Sociogenie provides
            AI-powered social media automation tools including content
            generation, optimization, scheduling, and publishing. Some features
            may include human-assisted review strictly for quality purposes
            only. We reserve the right to modify, suspend, or discontinue any
            feature at any time without liability.
          </p>
          <br />
          <p>
            <strong>3.</strong> Eligibility You must be at least 18 years old
            and capable of entering a legally binding agreement.
          </p>
          <br />
          <p>
            <strong>4.</strong> Account Responsibilities You are responsible
            for: Maintaining account confidentiality All activities under your
            account Ensuring compliance with applicable laws.
          </p>
          <br />
          <p>
            <strong>5.</strong> AI-Generated Content Disclaimer Content
            generated through the Platform: May contain inaccuracies Is not
            guaranteed to be legally compliant or factually correct Human review
            is limited to formatting, clarity, and brand alignment and does NOT
            constitute legal or factual verification. You are solely responsible
            for reviewing content before publishing.
          </p>
          <br />
          <p>
            <strong>6.</strong> Automation & Posting By connecting your
            accounts, you authorize Sociogenie to publish content on your
            behalf. We are not responsible for: Account bans or restrictions
            Platform policy violations Performance or engagement.
          </p>
          <br />
          <p>
            <strong>7.</strong> Third-Party Services We integrate with platforms
            like Meta and LinkedIn. We are not responsible for their outages or
            policy changes.
          </p>
          <br />
          <p>
            <strong>8.</strong> Subscription & Billing Subscription required
            Billed in advance Non-refundable unless required by law.
          </p>
          <br />
          <p>
            <strong>9.</strong> Credit System Non-transferable Non-refundable
            Expire after validity.
          </p>
          <br />
          <p>
            <strong>10.</strong> Intellectual Property We own all platform
            technology. You retain ownership of your content.
          </p>
          <br />
          <p>
            <strong>11.</strong> Prohibited Use You may not: Use for illegal
            purposes Generate harmful or misleading content Exploit the
            platform.
          </p>
          <br />
          <p>
            <strong>12.</strong> Data Protection We comply with applicable laws
            including: India DPDP Act GDPR (where applicable).
          </p>
          <br />
          <p>
            <strong>13.</strong> Service Availability We do not guarantee
            uninterrupted service.
          </p>
          <br />
          <p>
            <strong>14.</strong> Limitation of Liability We are not liable for
            indirect or consequential damages. Liability is limited to the last
            billing amount.
          </p>
          <br />
          <p>
            <strong>15.</strong> Indemnification You agree to indemnify us
            against claims arising from your use or content.
          </p>
          <br />
          <p>
            <strong>16.</strong> Termination We may suspend accounts for
            violations.
          </p>
          <br />
          <p>
            <strong>17.</strong> Force Majeure We are not liable for events
            beyond our control.
          </p>
          <br />
          <p>
            <strong>18.</strong> Governing Law Governed by laws of India.
            Jurisdiction: Ahmedabad, Gujarat.
          </p>
        </div>
      </div>
    </div>
  );
}
