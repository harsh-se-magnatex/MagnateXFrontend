'use client';

import { useAuth } from '@/src/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Bell, Mail, Activity, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function NotificationsSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [loading, user, router]);

  if (loading) return null;
  if (!user) return null;

  const AlertItem = ({
    label,
    description,
    icon: Icon,
    href
  }: {
    label: string;
    description?: string;
    icon: any;
    href: string;
  }) => (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="group flex w-full items-start gap-4 py-5 hover:bg-slate-50/80 px-4 -mx-4 rounded-2xl transition-colors text-left"
    >
      <div className={cn(
        "p-2 rounded-lg transition-colors mt-0.5",
        "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100"
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-slate-900">{label}</p>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      <div className="self-center text-slate-300 group-hover:text-slate-400">
        <span className="inline-block h-5 w-5">↗</span>
      </div>
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Notifications
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Control how and when you receive alerts from SocioGenie.
        </p>
      </div>

      <div className="space-y-8">
        <section className="glass-card rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-2 border-b border-slate-100 pb-4">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Bell className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Alerts</h2>
          </div>
          
          <div className="divide-y divide-slate-100/80">
            <AlertItem
              icon={Mail}
              label="Account alerts"
              description="View critical account updates, billing info, and security alerts directly in SocioGenie."
              href="/alerts/email"
            />
            <AlertItem
              icon={Activity}
              label="Post success alerts"
              description="See when your scheduled campaigns are published successfully in your in-app alerts."
              href="/alerts/postSuccess"
            />
            <AlertItem
              icon={AlertCircle}
              label="Post failure alerts"
              description="Review alerts when an error prevents a post from publishing."
              href="/alerts/postFailure"
            />
            <AlertItem
              icon={Sparkles}
              label="New releases"
              description="Catch up on new features, AI models, and SocioGenie news inside the app."
              href="/alerts/newReleases"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
