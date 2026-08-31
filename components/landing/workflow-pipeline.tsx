'use client';

import {
  ArrowRight,
  Bot,
  CalendarClock,
  Clock,
  Eye,
  ImagePlus,
  ListChecks,
  Send,
  Sparkles,
} from 'lucide-react';

const SETUP_STEPS = [
  {
    icon: Sparkles,
    title: 'Tell us who you are',
    description:
      'Pull your Business DNA from your website or a catalog PDF, or fill it in by hand. Pick a look and brand colors to match.',
  },
  {
    icon: ListChecks,
    title: 'Answer what your industry asks',
    description:
      'A questionnaire built for your business, not a generic form — with one-tap suggested answers.',
  },
  {
    icon: ImagePlus,
    title: 'Show us what you sell',
    description:
      'Upload product photos, then preview 3 sample posts per platform before you commit.',
  },
  {
    icon: CalendarClock,
    title: 'Connect & configure',
    description:
      'Link Instagram, Facebook and LinkedIn, then set captions, review mode, and posting-time strategy.',
  },
] as const;

const PIPELINE_STEPS = [
  {
    icon: Bot,
    title: 'Generated from your brand',
    description:
      'Built from your Business DNA, questionnaire answers and visual style — never a template.',
  },
  {
    icon: Eye,
    title: 'Reviewed',
    description:
      'By you in Manual Review, or by our in-house team in Auto Approve.',
  },
  {
    icon: Clock,
    title: 'Scheduled at your best time',
    description:
      'Your platform’s proven top hour once you have enough data, your preferred time until then.',
  },
  {
    icon: Send,
    title: 'Published & tracked',
    description:
      'Live on Instagram, Facebook or LinkedIn, feeding straight into your Analytics.',
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
    <article className="flex h-full flex-col rounded-2xl border border-default bg-default p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-purple/10 text-preview ring-1 ring-strong">
          <Icon className="h-5 w-5" />
        </span>
        {step != null ? (
          <span className="text-xs font-bold uppercase tracking-wider text-link">
            Step {step}
          </span>
        ) : null}
      </div>
      <h3 className="mt-4 text-base font-extrabold text-default sm:text-lg">
        {title}
      </h3>
      <p className="mt-2 flex-1 font-(--font-dm-sans) text-sm leading-relaxed text-secondary">
        {description}
      </p>
    </article>
  );
}

function StepRow({
  steps,
}: {
  steps: readonly { icon: typeof Bot; title: string; description: string }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3">
      {steps.map((step, index) => (
        <div key={step.title} className="relative flex min-h-0">
          <StepCard
            icon={step.icon}
            title={step.title}
            description={step.description}
            step={index + 1}
          />
          {index < steps.length - 1 ? (
            <ArrowRight
              className="absolute -right-3 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 icon-quaternary lg:block"
              aria-hidden
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

/**
 * Two real sequences, not one generic one: the one-time brand setup, then
 * the pipeline every single post goes through after that.
 */
export function HowItWorksFlow() {
  return (
    <div className="flex flex-col gap-10">
      <div>
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-secondary">
          Set up once
        </p>
        <StepRow steps={SETUP_STEPS} />
      </div>
      <div>
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-secondary">
          Then, every post
        </p>
        <StepRow steps={PIPELINE_STEPS} />
      </div>
    </div>
  );
}
