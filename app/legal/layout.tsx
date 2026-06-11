import { LegalBackNav } from './legal-back-nav';
import './legal.css';

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_42%,#eef2ff_100%)]">
      <div
        className="pointer-events-none absolute inset-0 pattern-grid opacity-60"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-indigo-300/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-[28%] -left-24 h-72 w-72 rounded-full bg-violet-300/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-sky-200/20 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10">
        <LegalBackNav />
        {children}
      </div>
    </div>
  );
}
