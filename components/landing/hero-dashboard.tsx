'use client';

import {
  ActivityStatusIcon,
  HomeStatBox,
  PlatformIcon,
  formatPlatformLabel,
  type ActivityScheduleState,
} from '@/components/home/dashboard-ui';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  CalendarClock,
  Share2,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';

const QUICK_SUGGESTIONS = [
  'Generate a post',
  'Build a week of content',
  'Schedule this campaign',
] as const;

const ACTIVITY_ITEMS: {
  platform: string;
  description: string;
  time: string;
  state: ActivityScheduleState;
}[] = [
  {
    platform: 'instagram',
    description: 'Product Ads · Awaiting your review',
    time: '2:30 PM',
    state: 'pending',
  },
  {
    platform: 'linkedin',
    description: 'AI Engine · Scheduled for 4:00 PM',
    time: '4:00 PM',
    state: 'approved',
  },
  {
    platform: 'facebook',
    description: 'Holiday & Festival Posts · Scheduled for 6:15 PM',
    time: '6:15 PM',
    state: 'approved',
  },
];

export function HeroDashboard() {
  return (
    <div className="relative w-full max-w-xl mx-auto lg:mx-0 lg:max-w-none">
      <div className="absolute -inset-4 rounded-3xl bg-primary-blue/8 blur-3xl pointer-events-none" />
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-black/30',
          'pointer-events-none select-none'
        )}
        aria-hidden
      >
        <div className="p-4 sm:p-5 space-y-6">
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">Good morning, Alex</span>
            <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight text-balance leading-tight">
              What do you want to create today?
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-sm p-1.5 flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="h-11 flex-1 rounded-xl border border-border/50 bg-muted px-4 flex items-center text-sm text-muted-foreground">
              Describe a post, campaign, or idea…
            </div>
            <div className="h-11 shrink-0 rounded-xl bg-primary px-5 flex items-center justify-center gap-2 text-sm font-medium text-primary-foreground">
              <Sparkles className="size-4" />
              Create
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <HomeStatBox
              label="Upcoming"
              sublabel="Today and future"
              icon={CalendarClock}
              value={12}
            />
            <HomeStatBox
              label="Analytics"
              sublabel="Growth overview · avg across platforms"
              icon={TrendingUp}
              value={
                <span className="text-emerald-500 dark:text-emerald-400">+18%</span>
              }
            />
            <HomeStatBox
              label="Credits"
              sublabel="AI credits remaining"
              icon={Zap}
              value={80}
            />
            <HomeStatBox
              label="Platforms"
              sublabel="Connected profiles"
              icon={Share2}
              value={3}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Quick suggestions
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_SUGGESTIONS.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center rounded-full border border-border bg-muted px-3.5 py-1.5 text-sm font-medium text-foreground"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-base font-semibold text-foreground">Today&apos;s activity</p>
              <span className="text-sm font-medium text-primary">View all</span>
            </div>
            <Card className="rounded-2xl border-border overflow-hidden py-0 gap-0">
              <div className="divide-y divide-border/40">
                {ACTIVITY_ITEMS.map((item) => (
                  <div
                    key={`${item.platform}-${item.time}`}
                    className="flex items-center gap-3 p-4 sm:px-5"
                  >
                    <PlatformIcon platform={item.platform} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground text-pretty leading-snug">
                        {item.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatPlatformLabel(item.platform)} · {item.time}
                      </p>
                    </div>
                    <ActivityStatusIcon state={item.state} />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
