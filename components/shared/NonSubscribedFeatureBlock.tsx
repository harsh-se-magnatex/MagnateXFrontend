import Link from 'next/link';

/** Full-page gate when the user has no active plan (unsubscribed or expired). */
export function NonSubscribedFeatureBlock() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center animate-in fade-in duration-500 pb-20 px-4 text-center">
      <h1 className="text-page-title text-default">
        <span className="block">You are not eligible for this feature.</span>
        <span className="block">
          Please subscribe to a plan to use this feature.
        </span>
      </h1>
      <p className="mt-3 max-w-xl text-base text-secondary">
        You can subscribe to a plan{' '}
        <Link
          href="/settings/billings"
          className="font-semibold text-preview underline underline-offset-2 hover:text-preview"
        >
          here
        </Link>
        .
      </p>
    </div>
  );
}
