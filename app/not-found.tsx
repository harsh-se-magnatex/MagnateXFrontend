import Link from 'next/link';
import { Home, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-6 py-16 text-foreground">
      <div className="mx-auto flex max-w-lg flex-col items-center text-center">
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-muted text-muted-foreground ring-1 ring-border">
          <SearchX className="h-9 w-9" aria-hidden />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          Error 404
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Page not found
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or was moved. Check
          the URL, or head back to the homepage.
        </p>
        <Button asChild className="mt-10 rounded-xl">
          <Link href="/" className="gap-2">
            <Home className="h-4 w-4" aria-hidden />
            Back to home
          </Link>
        </Button>
      </div>
    </div>
  );
}
