'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Footer } from '@/components/shared/Footer';
import { AppGradientBackground } from '@/components/shared/AppGradientBackground';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  BarChart3,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Clock,
  Rocket,
  X,
  Briefcase,
  User,
  Calendar,
  Zap,
  Layers,
  ImageIcon,
  PartyPopper,
  Bolt,
  Send,
  Eye,
  Bot,
} from 'lucide-react';
import NavBar from './(main)/_components/NavBar';
import { HeroDashboard } from '@/components/landing/hero-dashboard';
import { AiHumanWorkflow, HowItWorksFlow } from '@/components/landing/workflow-pipeline';
import { WorkflowStepConnector } from '@/components/landing/workflow-step-connector';
import { LandingPricingCards } from '@/components/landing/landing-pricing-cards';

const TRUST_BAR_ITEMS = [
  'Instagram, Facebook & LinkedIn',
  'Human-reviewed before publishing',
  'Content ready in 24 hours',
  'Setup in under 10 minutes',
] as const;

const PAIN_POINT_CARDS = [
  {
    title: 'Agencies',
    icon: Briefcase,
    description:
      'Charge ₹15,000–30,000/month for work that is largely automatable.',
  },
  {
    title: 'Freelancers',
    icon: User,
    description:
      'Creative but hard to manage. Quality and consistency vary week to week.',
  },
  {
    title: 'Scheduling Tools',
    icon: Calendar,
    description:
      'They queue up content — but you still have to write every single post yourself.',
  },
  {
    title: 'Doing It Yourself',
    icon: Clock,
    description:
      "Works until it doesn't. Most people run out of time before they run out of ideas.",
  },
] as const;

const SOLUTION_PILLARS = [
  {
    title: 'Content tailored to your business — not generic templates',
    icon: Sparkles,
    description:
      'Sociogenie uses your brand profile, industry, tone, and audience context to generate relevant content. What gets created for your account is specific to you.',
  },
  {
    title: 'Every post reviewed by a real person before it goes live',
    icon: Eye,
    description:
      "SocioGenie creates at speed. Our review team checks every post for brand alignment, clarity, and quality before it's published. Turnaround: within 24 hours.",
  },
  {
    title: 'Scheduled automatically for the best posting times',
    icon: Send,
    description:
      'Approved content is published at optimal times without you needing to manage a calendar or log in to schedule anything.',
  },
] as const;

const AUTONOMOUS_FEATURES = [
  {
    title: 'Daily Content Generator',
    icon: Bot,
    description:
      'Strategy-informed posts created every day — structured around your brand profile.',
  },
  {
    title: 'Product Ad Generator',
    icon: ImageIcon,
    description:
      'Upload a product image and receive platform-ready creatives with conversion-focused captions.',
  },
  {
    title: 'Festival & Trend Campaigns',
    icon: PartyPopper,
    description:
      'Culturally relevant content for festivals, events, and trending moments — matched to your brand.',
  },
  {
    title: 'Instant Post Generator',
    icon: Bolt,
    description:
      'Need something published today? Write a prompt and get a ready-to-publish post in seconds.',
  },
] as const;

function isComparisonYes(value: string): boolean {
  return value.trim().toLowerCase().startsWith('yes');
}

function isComparisonNo(value: string): boolean {
  return value.trim().toLowerCase() === 'no';
}

function ComparisonTableCell({ value }: { value: string }) {
  if (isComparisonYes(value)) {
    return (
      <CheckCircle2
        className="mx-auto h-5 w-5 text-emerald-400"
        aria-label={value}
      />
    );
  }
  if (isComparisonNo(value)) {
    return <X className="mx-auto h-5 w-5 text-muted-foreground/50" aria-label="No" />;
  }
  return <span>{value}</span>;
}

const HERO_BADGES = ['Auto Generated', 'Human Reviewed', 'Auto Published'] as const;

const HUMAN_REVIEW_CHECKS = [
  'Brand alignment — does this match your tone, values, and positioning?',
  'Clarity and readability — is it easy to understand and engaging?',
  "Platform suitability — is the format, length, and style right for where it's being posted?",
  'Quality assurance — grammar, relevance, and overall content standard',
] as const;

const PRODUCT_FEATURES = [
  {
    title: 'Daily Auto Generated Content',
    icon: Zap,
    description:
      'Strategy-informed posts created every day — structured around your brand profile. The content reflects your business, not a placeholder version of it.',
  },
  {
    title: 'One Input → Three Platform-Optimised Posts',
    icon: Layers,
    description:
      'Give Sociogenie a topic and get three distinct versions: concise and visual for Instagram, professional and insight-driven for LinkedIn, community-focused for Facebook.',
  },
  {
    title: 'Product Ad Creative Generator',
    icon: ImageIcon,
    description:
      'Upload a product image and receive platform-ready creatives with captions and hooks written for conversion — useful for launches and promotions.',
  },
  {
    title: 'Festival & Trend Campaigns',
    icon: PartyPopper,
    description:
      'Culturally relevant content generated automatically for festivals, events, and trending moments — matched to your brand without requiring your attention.',
  },
  {
    title: 'Instant Post Generator',
    icon: Bolt,
    description:
      'Need something published today? Write a prompt and get a ready-to-publish post in seconds.',
  },
  {
    title: 'Analytics Dashboard',
    icon: BarChart3,
    description:
      "Track performance across platforms, understand what's working, and get recommendations based on your results.",
  },
] as const;

const OUTCOME_CARDS = [
  'Replace most of your manual content creation and scheduling workload',
  'Maintain daily posting consistency across up to 3 platforms',
  'Reduce social media costs significantly compared to an agency or freelancer',
  'Free up several hours every week for work only you can do',
] as const;

const COMPARISON_TABLE_COLUMNS = [
  'Agencies',
  'Freelancers',
  'Scheduling Tools',
  'Sociogenie',
] as const;

const COMPARISON_TABLE_ROWS = [
  {
    criterion: 'Creates content',
    values: ['Yes', 'Yes', 'No', 'Yes'],
  },
  {
    criterion: 'Strategy included',
    values: ['Sometimes', 'Sometimes', 'No', 'Yes'],
  },
  {
    criterion: 'Human review',
    values: ['Yes', 'Varies', 'No', 'Yes — every post'],
  },
  {
    criterion: 'Auto publishing',
    values: ['No', 'No', 'Partial', 'Yes'],
  },
  {
    criterion: 'Platform-specific',
    values: ['Sometimes', 'Sometimes', 'No', 'Yes'],
  },
  {
    criterion: 'Affordable',
    values: ['No', 'Moderate', 'Yes', 'Yes'],
  },
  {
    criterion: 'Works without daily input',
    values: ['No', 'No', 'No', 'Yes, after setup'],
  },
] as const;

type StepBlock =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: readonly string[] }
  | { kind: 'h'; text: string };

const HOW_IT_WORKS_STEPS: ReadonlyArray<{
  title: string;
  summary: string;
  body: readonly StepBlock[];
}> = [
    {
      title: 'Create Your Account',
      summary:
        'Sign up, pick a subscription plan, and start the guided onboarding flow.',
      body: [
        {
          kind: 'p',
          text: 'Users begin by creating a Sociogenie account and selecting a subscription plan.',
        },
        {
          kind: 'p',
          text: 'Once logged in, the platform guides users through the onboarding and brand setup process to personalize the  system according to the business identity.',
        },
      ],
    },
    {
      title: 'Brand Onboarding & Setup',
      summary:
        'Build the foundation of your business\u2019s Brand DNA from your existing assets.',
      body: [
        {
          kind: 'p',
          text: 'During onboarding, Sociogenie collects and builds the foundation of the business\u2019s Brand DNA.',
        },
        { kind: 'h', text: 'Users can:' },
        {
          kind: 'list',
          items: [
            'Enter their business website or upload a catalog PDF',
            'Upload brand logos',
            'Configure brand colors',
            'Add hashtags',
            'Add business descriptions',
            'Configure contact information',
            'Define social media preferences',
          ],
        },
        {
          kind: 'h',
          text: 'If a website or catalog PDF is provided, Sociogenie automatically analyzes and extracts:',
        },
        {
          kind: 'list',
          items: [
            'Business name',
            'Industry category',
            'Slogans',
            'Brand colors',
            'Logo references',
            'Contact details',
            'Website information',
            'Brand descriptions',
          ],
        },
        {
          kind: 'p',
          text: 'This information is stored within the platform\u2019s Memory Layer and becomes the foundation for future content generation.',
        },
      ],
    },
    {
      title: 'Memory Layer',
      summary:
        'Teach Sociogenie your brand personality, tone, audience, and positioning.',
      body: [
        {
          kind: 'p',
          text: 'After onboarding, users complete the Memory Layer setup.',
        },
        {
          kind: 'p',
          text: 'Sociogenie asks additional questions to better understand:',
        },
        {
          kind: 'list',
          items: [
            'Brand personality',
            'Communication tone',
            'Target audience',
            'Marketing direction',
            'Preferred style',
            'Business positioning',
          ],
        },
        {
          kind: 'p',
          text: 'This allows Sociogenie to continuously generate content that remains aligned with the business identity instead of producing generic generated posts.',
        },
        { kind: 'p', text: 'The Memory Layer ensures:' },
        {
          kind: 'list',
          items: [
            'Branding consistency',
            'Smarter caption generation',
            'Better visual alignment',
            'Industry-relevant content creation',
          ],
        },
      ],
    },
    {
      title: 'Upload Products & Brand Assets',
      summary:
        'Add product images, marketing references, and brand visuals to Memory Layer.',
      body: [
        { kind: 'p', text: 'Users can upload:' },
        {
          kind: 'list',
          items: [
            'Product images',
            'Media assets',
            'Marketing references',
            'Brand visuals',
            'Product descriptions',
          ],
        },
        {
          kind: 'p',
          text: 'These assets are securely stored in the Memory Layer and are used across:',
        },
        {
          kind: 'list',
          items: [
            'Product advertisements',
            'Auto generated posts',
            'Campaign creatives',
            'Social media marketing workflows',
          ],
        },
        {
          kind: 'p',
          text: 'This helps Sociogenie create more personalized and visually accurate content.',
        },
      ],
    },
    {
      title: 'Connect Social Media Accounts',
      summary:
        'Securely link Instagram, Facebook, and LinkedIn for automated publishing.',
      body: [
        { kind: 'p', text: 'Sociogenie integrates directly with:' },
        { kind: 'list', items: ['Instagram', 'Facebook', 'LinkedIn'] },
        {
          kind: 'p',
          text: 'Users securely connect their business accounts to enable:',
        },
        {
          kind: 'list',
          items: [
            'Automated posting',
            'Scheduling',
            'Publishing',
            'Analytics tracking',
            'Platform-specific optimization',
          ],
        },
        {
          kind: 'p',
          text: 'Once connected, Sociogenie can manage publishing workflows directly from the platform.',
        },
      ],
    },
    {
      title: 'Configure Automation Preferences',
      summary:
        'Customize exactly how Sociogenie behaves before activating automation.',
      body: [
        {
          kind: 'p',
          text: 'Users can customize how Sociogenie behaves before activating automation.',
        },
        { kind: 'p', text: 'Settings include:' },
        {
          kind: 'list',
          items: [
            'Caption length preferences',
            'Emoji usage',
            'Logo placement',
            'Contact information visibility',
            'Preferred posting behavior',
            'Auto-approval preferences (AI plans only)',
            'Timezone settings',
            'Analytics-based scheduling preferences',
          ],
        },
        {
          kind: 'p',
          text: 'These preferences help Sociogenie adapt content generation according to each business\u2019s branding and marketing style.',
        },
      ],
    },
    {
      title: 'Bulk Create',
      summary:
        'Preview and pre-generate upcoming auto generated posts before they go live.',
      body: [
        {
          kind: 'p',
          text: 'Bulk Create is designed as a preview and pre-generation system for the AI Engine.',
        },
        {
          kind: 'p',
          text: 'Instead of waiting for Sociogenie to generate content automatically day-by-day, users can generate upcoming auto generated posts beforehand.',
        },
        { kind: 'p', text: 'This allows users to:' },
        {
          kind: 'list',
          items: [
            'Preview future Generated posts',
            'Review upcoming campaigns',
            'Regenerate content if required',
            'Understand what Sociogenie plans to publish',
          ],
        },
        {
          kind: 'p',
          text: 'Bulk Create acts as a transparency and confidence layer for automation.',
        },
        {
          kind: 'p',
          text: 'Even if users do not use Bulk Create, Sociogenie will still continue generating and posting content automatically (AI plans only).',
        },
      ],
    },
    {
      title: 'Quick Create',
      summary:
        'Generate instant manual posts from a prompt or reference image.',
      body: [
        {
          kind: 'p',
          text: 'Quick Create is designed for instant manual generation.',
        },
        { kind: 'p', text: 'Users can:' },
        {
          kind: 'list',
          items: [
            'Enter prompts',
            'Upload references',
            'Create one-off campaigns',
            'Generate instant social posts',
            'Request specific marketing styles',
          ],
        },
        {
          kind: 'p',
          text: 'This feature gives businesses creative flexibility whenever they need custom or time-sensitive content outside the automated workflow.',
        },
      ],
    },
    {
      title: 'Product Advert Generator',
      summary:
        'Turn product details into promotional ads and sales-focused creatives.',
      body: [
        {
          kind: 'p',
          text: 'The Product Advert system focuses on product-centered marketing campaigns.',
        },
        { kind: 'p', text: 'Users can upload:' },
        {
          kind: 'list',
          items: [
            'Product images',
            'Product descriptions',
            'Marketing information',
          ],
        },
        { kind: 'p', text: 'The Sociogenie then generates:' },
        {
          kind: 'list',
          items: [
            'Promotional advertisements',
            'Product campaigns',
            'Social media marketing creatives',
            'Sales-focused content',
          ],
        },
        {
          kind: 'p',
          text: 'This workflow allows users to maintain more direct creative control over product-specific campaigns.',
        },
      ],
    },
    {
      title: 'Festival Post Generator',
      summary:
        'Semi-automated festival and seasonal posts in a few clicks.',
      body: [
        {
          kind: 'p',
          text: 'Festival Posts are semi-automated workflows designed for event and seasonal marketing.',
        },
        { kind: 'p', text: 'Users simply:' },
        {
          kind: 'list',
          items: [
            'Select festivals/events',
            'Generate content',
            'Schedule or publish',
          ],
        },
        { kind: 'p', text: 'Sociogenie automatically handles:' },
        {
          kind: 'list',
          items: [
            'Design generation',
            'Caption creation',
            'Brand adaptation',
            'Formatting',
          ],
        },
        {
          kind: 'p',
          text: 'This helps businesses quickly participate in important seasonal marketing opportunities without manually designing festive creatives.',
        },
      ],
    },
    {
      title: 'Approval Workflow System',
      summary:
        'Manual Approval (Studio plans) + Auto Approval (AI plans) with two approval modes to suit your control level.',
      body: [
        {
          kind: 'p',
          text: 'Sociogenie uses a manual approval (Studio plans) + auto approval (AI plans) system to maintain content quality before publishing.',
        },
        {
          kind: 'p',
          text: 'Users can choose between manual approval (Studio plans) + auto approval (AI plans).',
        },
        { kind: 'h', text: 'Manual Approval Mode' },
        { kind: 'p', text: 'In Manual Approval Mode:' },
        {
          kind: 'list',
          items: [
            'The User generates posts manually',
            'Generated posts enter the approval queue',
            'The user manually reviews and approves content',
            'Only approved posts are published',
          ],
        },
        {
          kind: 'p',
          text: 'This mode is ideal for businesses that want full content oversight.',
        },
        { kind: 'h', text: 'Auto Approval Mode' },
        { kind: 'p', text: 'In Auto Approval Mode:' },
        {
          kind: 'list',
          items: [
            'The Sociogenie generates content automatically',
            'The Sociogenie social media team reviews the generated posts',
          ],
        },
        { kind: 'p', text: 'The team checks:' },
        {
          kind: 'list',
          items: [
            'Branding consistency',
            'Caption quality',
            'Creative presentation',
            'Posting readiness',
          ],
        },
        {
          kind: 'p',
          text: 'Once approved internally by the Sociogenie team, the posts are automatically published.',
        },
        {
          kind: 'p',
          text: 'This allows businesses to experience hands-free social media automation while still maintaining professional human quality control.',
        },
      ],
    },
    {
      title: 'Automated Scheduling & Publishing',
      summary:
        'Approved content is scheduled and published across platforms automatically.',
      body: [
        { kind: 'p', text: 'Once approved, Sociogenie automatically:' },
        {
          kind: 'list',
          items: [
            'Schedules posts',
            'Publishes creatives',
            'Uploads media',
            'Manages platform-specific posting',
          ],
        },
        {
          kind: 'p',
          text: 'The platform handles publishing across connected platforms without requiring manual uploads.',
        },
      ],
    },
    {
      title: 'Analytics & Insights',
      summary:
        'Track performance and get AI-powered posting suggestions over time.',
      body: [
        {
          kind: 'p',
          text: 'Sociogenie tracks social media performance using built-in analytics tools.',
        },
        { kind: 'p', text: 'Users can monitor:' },
        {
          kind: 'list',
          items: [
            'Reach',
            'Impressions',
            'Engagement',
            'Audience interaction',
            'Content performance',
            'Posting activity',
          ],
        },
        { kind: 'p', text: 'The platform also provides:' },
        {
          kind: 'list',
          items: [
            'AI-based posting suggestions',
            'Recommended posting times',
            'Engagement-focused insights',
            'Performance monitoring tools',
          ],
        },
        // {
        //   kind: 'p',
        //   text: 'Future roadmap updates will include AI feedback learning where the AI Engine continuously improves content generation using real engagement analytics.',
        // },
      ],
    },
    {
      title: 'AI Chatbot Assistant',
      summary:
        'An integrated AI assistant that already knows your brand and workflows.',
      body: [
        {
          kind: 'p',
          text: 'Sociogenie includes an integrated AI chatbot assistant that understands:',
        },
        {
          kind: 'list',
          items: [
            'The user\u2019s business',
            'Brand memory',
            'Platform settings',
            'Content strategy',
            'Marketing workflows',
          ],
        },
        { kind: 'p', text: 'Users can ask:' },
        {
          kind: 'list',
          items: [
            'Campaign ideas',
            'Content suggestions',
            'Marketing strategy questions',
            'Platform usage questions',
            'Workflow assistance',
          ],
        },
        {
          kind: 'p',
          text: 'The chatbot acts as an AI-powered marketing assistant built directly into the platform.',
        },
      ],
    },
    {
      title: 'Subscription & Credit System',
      summary:
        'Subscription plans, Base Credits, and Top-Up Credits to scale AI usage.',
      body: [
        { kind: 'p', text: 'Sociogenie operates using:' },
        {
          kind: 'list',
          items: ['Subscription plans', 'Base credits', 'Top-up credits'],
        },
        {
          kind: 'p',
          text: 'Users must maintain an active subscription to access most AI-powered platform features.',
        },
        { kind: 'h', text: 'Base Credits' },
        {
          kind: 'p',
          text: 'Base Credits are included with subscription plans and are used for auto generation workflows.',
        },
        { kind: 'p', text: 'These credits:' },
        {
          kind: 'list',
          items: [
            'Reset with subscription renewals',
            'Expire when the subscription expires',
          ],
        },
        { kind: 'h', text: 'Top-Up Credits' },
        {
          kind: 'p',
          text: 'Users can additionally purchase Top-Up Credits for extra AI usage.',
        },
        { kind: 'p', text: 'Top-Up Credits:' },
        {
          kind: 'list',
          items: [
            'Expire 1 month after purchase',
            'Require an active subscription to use',
            'Function as additional scalable AI capacity',
          ],
        },
        {
          kind: 'p',
          text: 'This system allows businesses to scale content generation according to their operational needs.',
        },
      ],
    },
  ];

function StepDialogContent({ blocks }: { blocks: readonly StepBlock[] }) {
  return (
    <div className="space-y-4 font-(--font-dm-sans) text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
      {blocks.map((block, index) => {
        if (block.kind === 'p') {
          return (
            <p key={index} className="text-pretty">
              {block.text}
            </p>
          );
        }
        if (block.kind === 'list') {
          return (
            <ul key={index} role="list" className="space-y-2 pl-1">
              {block.items.map((item) => (
                <li key={item} className="flex gap-2.5 text-pretty">
                  <span
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-linear-to-br from-primary-blue to-primary-purple"
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.kind === 'h') {
          return (
            <h4
              key={index}
              className="pt-2 text-[15px] font-bold leading-snug text-foreground sm:text-base"
            >
              {block.text}
            </h4>
          );
        }
        return null;
      })}
    </div>
  );
}

const LANDING_FAQ_ITEMS = [
  {
    question: 'How is Sociogenie different from other Scheduling Tools?',
    answer:
      "They schedule content you've already written. Sociogenie creates the content, has it reviewed by a human, and publishes it for you. It handles the creation and strategy layer, not just the scheduling step.",
  },
  {
    question: "Who reviews my content before it's published?",
    answer:
      'It depends on your plan. On Studio plans, you review and approve every post before it goes live. On AI plans, our in-house review team checks each post for brand alignment, clarity, platform suitability, and quality before publishing — typically within 24 hours.',
  },
  {
    question: 'Is the content specific to my business, or is it generic?',
    answer:
      "It's built from your brand profile — your industry, tone of voice, and business context. What gets generated for your account is specific to your setup, not pulled from a shared template bank.",
  },
  {
    question: 'What platforms does Sociogenie support?',
    answer:
      'Instagram, Facebook, and LinkedIn. Additional platforms are on the roadmap.',
  },
  {
    question: 'How long does setup take?',
    answer:
      'Most users complete setup in under 10 minutes. Your first content batch is reviewed and ready within 24 hours.',
  },
  {
    question: 'What happens to unused credits?',
    answer:
      'Credits are valid for 30 days. Your daily automated posts run independently — they continue regardless of your credit balance.',
  },
  {
    question: 'Can I pause or cancel my subscription?',
    answer:
      'Yes. No long-term contracts. Cancel at any time from your account settings.',
  },
  {
    question:
      'Is Sociogenie suitable for a business with no social media presence yet?',
    answer:
      "Yes — Sociogenie handles the strategy, so you don't need to know what to post or when. It's well-suited to businesses that want to build a consistent presence without hiring someone to manage it.",
  },
] as const;

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-purple mb-3">
      {children}
    </p>
  );
}

function LandingCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        'flex h-full flex-col rounded-2xl border border-border/50 bg-card p-5 shadow-sm transition-shadow duration-300 hover:shadow-md hover:border-border sm:p-6',
        className
      )}
    >
      {children}
    </article>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col font-(--font-sora) selection:bg-primary-blue/20 overflow-hidden relative">
      <AppGradientBackground variant="vivid" />

      <NavBar />

      <main className="flex-1 relative z-10 flex flex-col">
        {/* Hero — split layout */}
        <section className="px-6 pt-28 pb-12 sm:pt-32 sm:pb-16">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16"
          >
            <div className="text-center lg:text-left">
              <motion.h1
                variants={fadeIn}
                className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] leading-[1.08]"
              >
                Your Entire Social Media Department,{' '}
                <span className="bg-gradient-primary-text">Running 24/7</span>
              </motion.h1>
              <motion.p
                variants={fadeIn}
                className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground font-(--font-dm-sans) mx-auto lg:mx-0"
              >
                Sociogenie generates daily content,
                has every post reviewed by a human, and publishes automatically
                across Instagram, Facebook &amp; LinkedIn.
              </motion.p>
              <motion.div
                variants={fadeIn}
                className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start"
              >
                <Link
                  href="/sign-up"
                  className="group inline-flex items-center rounded-xl bg-gradient-primary px-7 py-3.5 text-sm font-bold text-white transition-all hover:shadow-xl hover:shadow-primary-purple/25 active:scale-[0.98]"
                >
                  Get Started Free
                  <Rocket className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="#how-it-works"
                  className="group inline-flex items-center rounded-xl border border-border/80 bg-transparent px-7 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                >
                  See How It Works
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </motion.div>
              <motion.ul
                variants={fadeIn}
                className="mt-8 flex flex-wrap justify-center gap-2 lg:justify-start"
                role="list"
              >
                {HERO_BADGES.map((badge) => (
                  <li
                    key={badge}
                    className="rounded-full border border-border/60 bg-card/60 px-3.5 py-1.5 text-xs font-semibold text-muted-foreground"
                  >
                    {badge}
                  </li>
                ))}
              </motion.ul>
              {/* Trust bar */}
              <section
                aria-label="Trust and platform highlights"
                className="border-y border-border/40 bg-card/30 px-6 py-5"
              >
                <motion.ul
                  initial="hidden"
                  animate="visible"
                  variants={fadeIn}
                  className="mx-auto flex flex-wrap items-center justify-start gap-x-6 gap-y-3 font-(--font-dm-sans) text-sm text-muted-foreground"
                  role="list"
                >
                  {TRUST_BAR_ITEMS.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </motion.ul>
              </section>
            </div>
            <motion.div variants={scaleIn} className="relative">
              <HeroDashboard />
            </motion.div>
          </motion.div>
        </section>


        {/* 15-step callout */}
        <section className="px-6 py-10 sm:py-12">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="mx-auto max-w-4xl rounded-2xl border border-primary-purple/30 bg-linear-to-br from-primary-purple/10 via-card to-primary-blue/5 p-8 text-center sm:p-10"
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-purple">
              The Complete System
            </p>
            <h2 className="mt-3 text-2xl font-extrabold text-foreground sm:text-3xl">
              Sociogenie&apos;s 15-step AI workflow
            </h2>
            <p className="mt-4 font-(--font-dm-sans) text-base leading-relaxed text-muted-foreground">
              Takes your brand from setup to fully autonomous publishing — brand
              onboarding, AI memory, content generation, human review, and
              automated scheduling in one integrated system.
            </p>
            <Link
              href="#fifteen-steps"
              className="mt-6 inline-flex items-center rounded-xl bg-gradient-primary px-6 py-3 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-primary-purple/20"
            >
              Explore the 15 Steps
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </motion.div>
        </section>

        {/* Problem */}
        <section id="about" className="scroll-mt-24 px-6 py-10 sm:py-14">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-48px' }}
            variants={stagger}
            className="mx-auto max-w-6xl"
          >
            <motion.div variants={fadeIn} className="mx-auto max-w-3xl text-center">
              <SectionEyebrow>The Problem</SectionEyebrow>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                Why social media is hard for most small businesses
              </h2>
            </motion.div>
            <ul
              role="list"
              className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              {PAIN_POINT_CARDS.map((card) => (
                <motion.li key={card.title} variants={fadeIn}>
                  <LandingCard>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-purple/10 text-primary-purple ring-1 ring-primary-purple/20">
                      <card.icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 text-base font-extrabold text-foreground sm:text-lg">
                      {card.title}
                    </h3>
                    <p className="mt-2 flex-1 font-(--font-dm-sans) text-sm leading-relaxed text-muted-foreground">
                      {card.description}
                    </p>
                  </LandingCard>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </section>

        {/* How Sociogenie compares */}
        <section
          id="compare"
          aria-labelledby="comparison-table-heading"
          className="scroll-mt-24 border-t border-border/40 bg-card/20 px-6 py-10 sm:py-14"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-48px' }}
            variants={stagger}
            className="mx-auto max-w-6xl"
          >
            <motion.div variants={fadeIn} className="text-center">
              <SectionEyebrow>Compare</SectionEyebrow>
              <h2
                id="comparison-table-heading"
                className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
              >
                How Sociogenie compares
              </h2>
            </motion.div>
            <motion.div
              variants={fadeIn}
              className="mt-10 overflow-x-auto rounded-2xl border border-border/50 bg-card [-webkit-overflow-scrolling:touch]"
            >
              <table className="w-full min-w-[720px] border-collapse text-left font-(--font-dm-sans) text-sm">
                <caption className="sr-only">
                  Comparison of Sociogenie with agencies, freelancers, and
                  scheduling tools.
                </caption>
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="w-[min(28%,220px)] px-5 py-3.5 text-left font-semibold text-muted-foreground">
                      Feature
                    </th>
                    {COMPARISON_TABLE_COLUMNS.map((col, colIndex) => (
                      <th
                        key={col}
                        scope="col"
                        className={cn(
                          'px-4 py-3.5 text-center text-xs font-bold sm:text-sm',
                          colIndex === COMPARISON_TABLE_COLUMNS.length - 1
                            ? 'bg-primary-purple/10 text-primary-purple'
                            : 'text-foreground'
                        )}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_TABLE_ROWS.map((row) => (
                    <tr
                      key={row.criterion}
                      className="border-b border-border/40 last:border-b-0"
                    >
                      <th
                        scope="row"
                        className="px-5 py-3.5 text-left font-medium text-foreground"
                      >
                        {row.criterion}
                      </th>
                      {row.values.map((cell, i) => (
                        <td
                          key={`${row.criterion}-${COMPARISON_TABLE_COLUMNS[i]}`}
                          className={cn(
                            'px-4 py-3.5 text-center text-[13px] text-muted-foreground sm:text-sm',
                            i === row.values.length - 1 &&
                              'bg-primary-purple/5 font-medium text-foreground'
                          )}
                        >
                          <ComparisonTableCell value={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          </motion.div>
        </section>

        {/* Solution */}
        <section
          aria-labelledby="solution-pillars-heading"
          className="px-6 py-10 sm:py-14"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-48px' }}
            variants={stagger}
            className="mx-auto max-w-6xl"
          >
            <motion.div variants={fadeIn} className="mx-auto max-w-3xl text-center">
              <SectionEyebrow>The Solution</SectionEyebrow>
              <h2
                id="solution-pillars-heading"
                className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
              >
                Auto Generated content, human-reviewed before publishing
              </h2>
              <p className="mt-4 font-(--font-dm-sans) text-base leading-relaxed text-muted-foreground sm:text-lg">
                Sociogenie handles the hardest parts of social media in one
                system tailored to your brand.
              </p>
            </motion.div>
            <ul
              role="list"
              className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3"
            >
              {SOLUTION_PILLARS.map((pillar) => (
                <motion.li key={pillar.title} variants={fadeIn}>
                  <LandingCard>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-purple/10 text-primary-purple ring-1 ring-primary-purple/20">
                      <pillar.icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 text-base font-extrabold leading-snug text-foreground sm:text-lg">
                      {pillar.title}
                    </h3>
                    <p className="mt-2 flex-1 font-(--font-dm-sans) text-sm leading-relaxed text-muted-foreground">
                      {pillar.description}
                    </p>
                  </LandingCard>
                </motion.li>
              ))}
            </ul>
                <motion.ul variants={fadeIn} className="mt-10 grid gap-3 sm:grid-cols-2" role="list">
              {HUMAN_REVIEW_CHECKS.map((line) => (
                <li key={line} className="flex gap-2.5 font-(--font-dm-sans) text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  {line}
                </li>
              ))}
            </motion.ul>
          </motion.div>
        </section>

        {/* How It Works — 4-step flow */}
        <section
          id="how-it-works"
          aria-labelledby="how-it-works-heading"
          className="scroll-mt-24 border-y border-border/40 bg-card/20 px-6 py-10 sm:py-14"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mx-auto max-w-6xl"
          >
            <motion.div variants={fadeIn}>
              <SectionEyebrow>How It Works</SectionEyebrow>
              <h2
                id="how-it-works-heading"
                className="text-2xl font-extrabold text-foreground sm:text-3xl"
              >
                Set up once. Your content runs from there.
              </h2>
              <p className="mt-4 max-w-3xl font-(--font-dm-sans) text-base leading-relaxed text-muted-foreground">
                Four steps from brand setup to fully autonomous publishing.
              </p>
            </motion.div>
            <motion.div variants={fadeIn} className="mt-10">
              <HowItWorksFlow />
            </motion.div>
          </motion.div>
        </section>

        {/* 15-step grid */}
        <section
          id="fifteen-steps"
          className="scroll-mt-24 px-6 py-12 sm:py-16"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mx-auto max-w-6xl"
          >
            <motion.div variants={fadeIn} className="text-center">
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                The 15-Step System
              </h2>
              <p className="mt-4 mx-auto max-w-2xl font-(--font-dm-sans) text-base text-muted-foreground sm:text-lg">
                A complete AI-powered workflow to run your social media on autopilot.
              </p>
            </motion.div>
            <div id="fifteen-step-grid" className="relative mt-12 sm:mt-14">
              <WorkflowStepConnector stepCount={HOW_IT_WORKS_STEPS.length} />
              <ul
                role="list"
                className="relative z-10 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4"
              >
                {HOW_IT_WORKS_STEPS.map((step, index) => (
                  <motion.li key={step.title} variants={fadeIn}>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          data-step-index={index}
                          className="workflow-step-card flex h-full w-full flex-col rounded-xl p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-purple/40"
                        >
                          <span className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5">
                              <Sparkles
                                className="h-3.5 w-3.5 text-violet-300/80"
                                aria-hidden
                              />
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {index + 1}
                            </span>
                          </span>
                          <span className="mt-4 text-sm font-semibold leading-snug text-foreground">
                            {step.title}
                          </span>
                        </button>
                      </DialogTrigger>
                      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
                        <DialogHeader className="border-b border-border/50 px-6 pt-6 pb-4 pr-12 text-left sm:px-8 sm:pt-8 sm:pb-5">
                          <p className="text-xs font-bold uppercase tracking-wider text-primary-purple">
                            Step {index + 1}
                          </p>
                          <DialogTitle className="mt-2 text-xl font-extrabold text-foreground sm:text-2xl">
                            {step.title}
                          </DialogTitle>
                          <DialogDescription className="font-(--font-dm-sans) text-sm text-muted-foreground">
                            {step.summary}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="overflow-y-auto px-6 py-5 sm:px-8 sm:py-6">
                          <StepDialogContent blocks={step.body} />
                        </div>
                      </DialogContent>
                    </Dialog>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </section>

        {/* Fully Autonomous System */}
        <section className="border-t border-border/40 bg-card/20 px-6 py-10 sm:py-14">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mx-auto max-w-6xl"
          >
            <motion.div variants={fadeIn} className="text-center">
              <SectionEyebrow>Automation</SectionEyebrow>
              <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">
                Fully Autonomous System
              </h2>
            </motion.div>
            <ul
              role="list"
              className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              {AUTONOMOUS_FEATURES.map((feature) => (
                <motion.li key={feature.title} variants={fadeIn}>
                  <LandingCard>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-purple/10 text-primary-purple ring-1 ring-primary-purple/20">
                      <feature.icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 text-base font-extrabold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="mt-2 font-(--font-dm-sans) text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </LandingCard>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </section>

        {/* Features */}
        <section
          id="features"
          aria-labelledby="product-features-heading"
          className="border-t border-border/40 bg-card/20 px-6 py-10 sm:py-14"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-48px' }}
            variants={stagger}
            className="mx-auto max-w-6xl"
          >
            <motion.div variants={fadeIn} className="text-center">
              <SectionEyebrow>Features</SectionEyebrow>
              <h2
                id="product-features-heading"
                className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
              >
                Everything you need to grow on social media
              </h2>
            </motion.div>
            <ul
              role="list"
              className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
            >
              {PRODUCT_FEATURES.map((feature) => (
                <motion.li key={feature.title} variants={fadeIn}>
                  <LandingCard>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-purple/10 text-primary-purple ring-1 ring-primary-purple/20">
                      <feature.icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 text-base font-extrabold leading-snug text-foreground">
                      {feature.title}
                    </h3>
                    <p className="mt-2 flex-1 font-(--font-dm-sans) text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </LandingCard>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </section>

        {/* Outcomes */}
        <section
          aria-labelledby="outcomes-proof-heading"
          className="px-6 py-10 sm:py-14"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-48px' }}
            variants={stagger}
            className="mx-auto max-w-4xl"
          >
            <motion.div variants={fadeIn}>
              <SectionEyebrow>Results</SectionEyebrow>
              <h2
                id="outcomes-proof-heading"
                className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
              >
                What changes when you stop managing content manually
              </h2>
              <p className="mt-4 font-(--font-dm-sans) text-base leading-relaxed text-muted-foreground">
                Most small business owners spend 5–10 hours a week on content
                alone. Sociogenie replaces most of that workload.
              </p>
            </motion.div>
            <ul
              role="list"
              className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              {OUTCOME_CARDS.map((text) => (
                <motion.li key={text} variants={fadeIn}>
                  <div className="flex h-full items-start gap-3 rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
                    <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-primary-purple" />
                    <p className="font-(--font-dm-sans) text-sm leading-snug text-foreground">
                      {text}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </section>

        {/* Pricing */}
        <section
          id="pricing"
          className="scroll-mt-24 border-t border-border/40 px-6 py-10 sm:py-14"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mx-auto max-w-6xl"
          >
            <motion.div variants={fadeIn} className="text-center">
              <SectionEyebrow>Pricing</SectionEyebrow>
              <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">
                Simple, transparent pricing
              </h2>
              <p className="mt-4 font-(--font-dm-sans) text-muted-foreground">
                Start with 10 days of Elite free. No contracts — cancel anytime.
              </p>
            </motion.div>
            <motion.div variants={fadeIn} className="mt-10">
              <LandingPricingCards />
            </motion.div>
          </motion.div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          className="scroll-mt-24 border-t border-border/40 px-6 py-10 sm:py-14"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mx-auto max-w-4xl"
          >
            <motion.div variants={fadeIn}>
              <SectionEyebrow>FAQ</SectionEyebrow>
              <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl mb-6">
                Common questions
              </h2>
            </motion.div>
            <motion.div variants={fadeIn}>
              <Accordion
                type="single"
                collapsible
                className="rounded-2xl border border-border/50 bg-card font-(--font-dm-sans) divide-y divide-border/40 overflow-hidden"
              >
                {LANDING_FAQ_ITEMS.map((item, i) => (
                  <AccordionItem
                    key={item.question}
                    value={`faq-${i}`}
                    className="border-0 px-4 sm:px-5"
                  >
                    <AccordionTrigger className="py-4 text-sm font-semibold text-foreground hover:no-underline sm:text-[0.9375rem] cursor-pointer">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-4 pt-0">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </motion.div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden px-6 py-20 sm:py-24">
          <div className="absolute inset-0 bg-linear-to-br from-primary-purple/10 via-transparent to-primary-blue/10 pointer-events-none" />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="relative z-10 mx-auto max-w-3xl text-center"
          >
            <motion.h2
              variants={fadeIn}
              className="text-3xl font-extrabold text-foreground sm:text-4xl"
            >
              Still doing social media manually?
            </motion.h2>
            <motion.p
              variants={fadeIn}
              className="mt-4 text-lg text-muted-foreground font-(--font-dm-sans)"
            >
              Set up in under 10 minutes. Your first content batch is reviewed
              and ready within 24 hours.
            </motion.p>
            <motion.div variants={fadeIn} className="mt-8 flex flex-col items-center gap-3">
              <Link
                href="/sign-up"
                className="group inline-flex items-center rounded-xl bg-gradient-primary px-10 py-4 text-base font-bold text-white transition-all hover:shadow-xl hover:shadow-primary-purple/25 active:scale-[0.98]"
              >
                Get Started Free
                <Rocket className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <p className="text-sm text-muted-foreground font-(--font-dm-sans)">
                10-day free trial on Elite · Cancel anytime
              </p>
            </motion.div>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
