import Link from 'next/link';
import {
  Brain,
  CloudLightning,
  ImagePlus,
  CalendarSync,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

const createFlows = [
  {
    title: 'Quick create',
    description: 'Generate posts one at a time with full control over copy and visuals.',
    href: '/instant-generation',
    icon: Brain,
    gradient: 'from-primary-blue to-blue-400',
  },
  {
    title: 'Batch workflow',
    description: 'Create multiple posts in one run for your content calendar.',
    href: '/batch-generation',
    icon: CloudLightning,
    gradient: 'from-primary-purple to-violet-400',
  },
  {
    title: 'Product ads',
    description: 'Turn product shots into polished ad creatives.',
    href: '/product-advert',
    icon: ImagePlus,
    gradient: 'from-amber-500 to-orange-400',
  },
  {
    title: 'Seasonal & festive',
    description: 'Timed campaigns and holiday-ready content.',
    href: '/festive-post',
    icon: CalendarSync,
    gradient: 'from-emerald-500 to-teal-400',
  },
  {
    title: 'AI tools',
    description: 'Advanced generation and experimentation.',
    href: '/ai-engine',
    icon: Sparkles,
    gradient: 'from-rose-500 to-pink-400',
  },
] as const;

export default function CreatePage() {
  return (
    <div className="max-w-5xl mx-auto page-enter pb-16 space-y-10">
      <header className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Create
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          What are you making?
        </h1>
        <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
          Pick a workflow. Everything here is part of one content workspace—not
          separate products.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {createFlows.map((flow) => (
          <Link key={flow.href} href={flow.href} className="group block">
            <Card className="glass-card h-full rounded-2xl border-border/40 p-6 flex flex-col gap-4 transition-all duration-300 hover:border-primary-blue/25 hover:shadow-lg hover:shadow-primary-blue/5 hover:-translate-y-0.5">
              <div
                className={`rounded-xl bg-linear-to-br ${flow.gradient} p-2.5 w-fit text-white shadow-sm transition-transform group-hover:scale-105`}
              >
                <flow.icon className="size-5" />
              </div>
              <div className="space-y-1.5 min-w-0">
                <h2 className="font-bold text-foreground text-lg">{flow.title}</h2>
                <p className="text-sm text-muted-foreground leading-snug">
                  {flow.description}
                </p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-primary">
                Open
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
