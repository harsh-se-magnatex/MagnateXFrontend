import type { Metadata } from 'next';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Reset password',
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background selection:bg-primary-blue/20 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-primary-blue/8 blur-[120px] rounded-full sm:w-[900px] sm:h-[900px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-primary-purple/8 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 left-[-10%] w-[400px] h-[400px] bg-primary-purple/5 blur-[100px] rounded-full" />
        <div className="absolute inset-0 pattern-grid opacity-60" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        {children}
      </div>
      <Toaster/>
    </div>
  );
}
