import { BadgeDollarSign } from 'lucide-react';

export default function RefundPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto pt-10 mb-20 animate-in fade-in duration-500">
      <header className="mb-10 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-6 shadow-sm border border-indigo-100">
          <BadgeDollarSign className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Refund Policy
        </h1>
        <p className="mt-4 text-base text-slate-500 max-w-xl mx-auto leading-relaxed">
          Last updated: March 2026
        </p>
      </header>

      <div className="glass-card rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm bg-white prose prose-slate max-w-none">
        <p>
          <strong>1.</strong> General All payments are final unless stated
          otherwise.
        </p>
        <br />
        <p>
          <strong>2.</strong> Subscriptions No refunds after activation
          Cancellation stops future billing.
        </p>
        <br />
        <p>
          <strong>3.</strong> Credits Non-refundable Expire after validity.
        </p>
        <br />
        <p>
          <strong>4.</strong> Exceptions Refunds may be granted at our sole
          discretion for: Duplicate payments Technical failures.
        </p>
        <br />
        <p>
          <strong>5.</strong> Chargebacks May result in account suspension.
        </p>
        <br />
        <p>
          <strong>6.</strong> Processing Refunds processed within 7–10 business
          days.
        </p>
        <br />
        <p>
          <strong>7.</strong> Contact Email: support@sociogenie.app
        </p>
      </div>
    </div>
  );
}
