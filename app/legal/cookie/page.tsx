import { Cookie } from 'lucide-react';

export default function CookiePolicyPage() {
  return (
    <div className="max-w-4xl mx-auto pt-10 mb-20 animate-in fade-in duration-500">
      <header className="mb-10 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-6 shadow-sm border border-indigo-100">
          <Cookie className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Cookie Policy
        </h1>
        <p className="mt-4 text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
          Last updated: March 2026
        </p>
      </header>

      <div className="glass-card rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm bg-white prose prose-slate max-w-none">
        <p>
          <strong>1.</strong>
          Introduction We use cookies to improve user experience and platform
          performance.
        </p>
        <br />
        <p>
          <strong>2.</strong>
          What Are Cookies Small files stored on your device.
        </p>
        <br />
        <p>
          <strong>3.</strong>
          Types of Cookies Essential: Required for platform functionality
          Analytics: Improve performance Functional: Store preferences
          Marketing: Ads and tracking
        </p>
        <br />
        <p>
          <strong>4.</strong>
          Third-Party Cookies May include Google, Meta, etc.
        </p>
        <br />
        <p>
          <strong>5.</strong>
          Legal Basis Essential: Legitimate interest Others: Consent
        </p>
        <br />
        <p>
          <strong>6.</strong> Managing Cookies Users can control via: Browser
          settings Cookie banner
        </p>
        <br />
        <p>
          <strong>7.</strong> Consent Users can accept, reject, or customize
          cookies.
        </p>
        <br />
        <p>
          <strong>8.</strong> Data Retention Session or persistent cookies.
        </p>
        <p>
          <br />
          <strong>9.</strong> Updates Policy may change.
        </p>
        <br />
        <p>
          <strong>10.</strong> Contact Email: support@sociogenie.app
        </p>
      </div>
    </div>
  );
}
