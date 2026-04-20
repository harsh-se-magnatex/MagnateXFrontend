import { ScrollText } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto pt-10 mb-20 animate-in fade-in duration-500">
      <header className="mb-10 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-6 shadow-sm border border-indigo-100">
          <ScrollText className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
          Last updated: March 2026
        </p>
      </header>
      <div className="glass-card rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm bg-white prose prose-slate max-w-none">
        <p>
          <strong>1.</strong> Introduction We are committed to protecting your
          privacy.
        </p>
        <br />
        <p>
          <strong>2.</strong> Data We Collect Personal: name, email, phone
          Business: brand data Social media data Usage data (IP, device,
          behavior).
        </p>
        <br />
        <p>
          <strong>3.</strong> Legal Basis (GDPR) We process data based on:
          Consent Contract necessity Legitimate interest.
        </p>
        <br />
        <p>
          <strong>4.</strong> How We Use Data Provide services Generate content
          Publish posts Improve platform and AI systems. We may use cookies and
          tracking technologies to improve AI performance and user experience.
        </p>
        <br />
        <p>
          <strong>5.</strong> AI Processing Your data may be processed by AI
          systems. We may use anonymized data for improvement.
        </p>
        <p>
          <br />
          <strong>6.</strong> Human Review Content may be reviewed only for
          quality purposes.
        </p>
        <br />
        <p>
          <strong>7.</strong> Data Sharing We do not sell data. We may share
          with: Payment providers Hosting providers Legal authorities.
        </p>
        <br />
        <p>
          <strong>8.</strong> International Transfers Data may be processed
          globally with safeguards.
        </p>
        <br />
        <p>
          <strong>9.</strong> Data Retention Data retained as long as necessary.
        </p>
        <br />
        <p>
          <strong>10.</strong>
          Your Rights You can: Access Update Delete data Withdraw consent
          Contact: support@sociogenie.app
        </p>
        <br />
        <p>
          <strong>11.</strong>
          Security We use industry-standard protections.
        </p>
        <br />
        <p>
          <strong>12.</strong>
          Cookies We use cookies for: Functionality Analytics AI improvement
          Personalization
        </p>
        <br />
        <p>
          <strong>13.</strong>
          Children’s Privacy Not for users under 18.
        </p>
        <br />
        <p>
          <strong>14.</strong>
          Changes Policy may be updated anytime.
        </p>
        <br />
        <p>
          <strong>15.</strong>
          Contact Email: contact@sociogenie.app Website: https://sociogenie.app
        </p>
      </div>
    </div>
  );
}
