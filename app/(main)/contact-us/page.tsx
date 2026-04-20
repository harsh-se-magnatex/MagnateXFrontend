'use client';

import { useAuth } from '@/src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Mail, MessageSquare, HeadphonesIcon } from 'lucide-react';
import Link from 'next/link';

export default function ContactUsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-in fade-in duration-500">
      <header className="mb-10 text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-blue/10 text-primary-blue mb-6 shadow-sm border border-primary-blue/20">
           <HeadphonesIcon className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Get in Touch
        </h1>
        <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Have questions or need assistance? Our team is here to help. Reach out to us through any of the channels below.
        </p>
      </header>
      
      <div className="grid gap-6 sm:grid-cols-2 mt-12">
        <Link href="/support" className="glass-card p-8 rounded-3xl border border-border text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
           <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-purple/10 text-primary-purple mb-5 group-hover:scale-110 transition-transform">
              <MessageSquare className="h-6 w-6" />
           </div>
           <h2 className="text-lg font-bold text-foreground mb-2">Support Tickets</h2>
           <p className="text-sm text-muted-foreground leading-relaxed">
              Open a support ticket for technical assistance or account inquiries.
           </p>
        </Link>
        
        <a href="mailto:support@sociogenie.com" className="glass-card p-8 rounded-3xl border border-border text-center hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
           <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary-blue/10 text-primary-blue mb-5 group-hover:scale-110 transition-transform">
              <Mail className="h-6 w-6" />
           </div>
           <h2 className="text-lg font-bold text-foreground mb-2">Email Us</h2>
           <p className="text-sm text-muted-foreground leading-relaxed">
              Send us an email directly at <span className="font-medium text-foreground">support@sociogenie.com</span>
           </p>
        </a>
      </div>
    </div>
  );
}
