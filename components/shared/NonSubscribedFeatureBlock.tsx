import Link from 'next/link';

/** Full-page gate when the user has no active plan (unsubscribed or expired). */
export function NonSubscribedFeatureBlock() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center animate-in fade-in duration-500 pb-20 px-4 text-center">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        <span className="block">You are not eligible for this feature.</span>
        <span className="block">
          Please subscribe to a plan to use this feature.
        </span>
      </h1>
      <p className="mt-3 max-w-xl text-base text-slate-600">
        You can subscribe to a plan{' '}
        <Link
          href="/settings/billings"
          className="font-semibold text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
        >
          here
        </Link>
        .
      </p>
    </div>
  );
}
