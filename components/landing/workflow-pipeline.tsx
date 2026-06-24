'use client';

import { cn } from '@/lib/utils';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Eye,
  Send,
  Sparkles,
} from 'lucide-react';

const PIPELINE_STEPS = [
  {
    icon: Bot,
    label: 'AI Generated',
    description: 'Daily content created from your brand DNA',
  },
  {
    icon: Eye,
    label: 'Human Review',
    description: 'Every post checked for quality & alignment',
  },
  {
    icon: CheckCircle2,
    label: 'Brand Approved',
    description: 'Content matches your tone and standards',
  },
  {
    icon: Send,
    label: 'Published',
    description: 'Posted automatically at optimal times',
  },
] as const;

const HOW_IT_WORKS_STEPS = [
  {
    icon: Sparkles,
    title: 'Fill in your brand details',
    description: 'Onboard your business, upload assets, and build your AI Memory Layer.',
  },
  {
    icon: Bot,
    title: 'SocioGenie Creates Content',
    description: 'Daily posts generated for Instagram, Facebook, and LinkedIn.',
  },
  {
    icon: Eye,
    title: 'Human Review',
    description: 'Our team checks every post before it goes live.',
  },
  {
    icon: Send,
    title: 'Auto Publish',
    description: 'Approved content is scheduled and published automatically.',
  },
] as const;

function StepCard({
  icon: Icon,
  title,
  description,
  step,
}: {
  icon: typeof Bot;
  title: string;
  description: string;
  step?: number;
}) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-purple/10 text-primary-purple ring-1 ring-primary-purple/25">
          <Icon className="h-5 w-5" />
        </span>
        {step != null ? (
          <span className="text-xs font-bold uppercase tracking-wider text-primary-blue">
            Step {step}
          </span>
        ) : null}
      </div>
      <h3 className="mt-4 text-base font-extrabold text-foreground sm:text-lg">{title}</h3>
      <p className="mt-2 flex-1 font-(--font-dm-sans) text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </article>
  );
}

export function HowItWorksFlow() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
      {HOW_IT_WORKS_STEPS.map((step, index) => (
        <div key={step.title} className="relative flex min-h-0">
          <StepCard
            icon={step.icon}
            title={step.title}
            description={step.description}
            step={index + 1}
          />
          {index < HOW_IT_WORKS_STEPS.length - 1 ? (
            <ArrowRight
              className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 text-muted-foreground/50 lg:block"
              aria-hidden
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function AiHumanWorkflow() {
  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-2">
      {PIPELINE_STEPS.map((step, index) => (
        <div key={step.label} className="flex flex-col items-center sm:flex-row sm:gap-2">
          <div className="flex w-full min-w-0 flex-col items-center rounded-2xl border border-border/50 bg-card px-4 py-5 text-center sm:w-[min(100%,200px)]">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-purple/10 text-primary-purple ring-1 ring-primary-purple/25">
              <step.icon className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-bold text-foreground">{step.label}</p>
            <p className="mt-1 font-(--font-dm-sans) text-xs leading-relaxed text-muted-foreground">
              {step.description}
            </p>
          </div>
          {index < PIPELINE_STEPS.length - 1 ? (
            <ArrowRight
              className={cn(
                'my-1 h-5 w-5 shrink-0 text-muted-foreground/40',
                'rotate-90 sm:rotate-0'
              )}
              aria-hidden
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
