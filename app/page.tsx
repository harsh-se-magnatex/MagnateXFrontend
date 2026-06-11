'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Footer } from '@/components/shared/Footer';
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
  Dot,
} from 'lucide-react';
import NavBar from './(main)/_components/NavBar';

const TRUST_BAR_ITEMS = [
  'Instagram, Facebook & LinkedIn',
  'Human-reviewed before publishing',
  'Content ready in 24 hours',
  'Setup in under 10 minutes',
] as const;

const SOCIAL_MEDIA_PAIN_POINTS = [
  'Agencies are expensive.',
  'Freelancers are inconsistent.',
  'Scheduling tools still expect you to create all the content yourself.',
  "And doing everything manually takes hours every week that most business owners simply don't have.",
  "The challenge isn't knowing you should post — it's having the time and system to do it consistently.",
] as const;

const PAIN_POINT_CARDS = [
  {
    title: 'Agencies',
    description:
      'Charge ₹15,000–30,000/month for work that is largely automatable.',
  },
  {
    title: 'Freelancers',
    description:
      'Creative but hard to manage. Quality and consistency vary week to week.',
  },
  {
    title: 'Scheduling Tools',
    description:
      'They queue up content — but you still have to write every single post yourself.',
  },
  {
    title: 'Doing It Yourself',
    description:
      "Works until it doesn't. Most people run out of time before they run out of ideas.",
  },
] as const;

const SOLUTION_PILLARS = [
  {
    title: 'Content tailored to your business — not generic templates',
    description:
      'Sociogenie uses your brand profile, industry, tone, and audience context to generate relevant content. What gets created for your account is specific to you.',
  },
  {
    title: 'Every post reviewed by a real person before it goes live',
    description:
      "AI creates at speed. Our review team checks every post for brand alignment, clarity, and quality before it's published. Turnaround: within 24 hours.",
  },
  {
    title: 'Scheduled automatically for the best posting times',
    description:
      'Approved content is published at optimal times without you needing to manage a calendar or log in to schedule anything.',
  },
] as const;

const HUMAN_REVIEW_CHECKS = [
  'Brand alignment — does this match your tone, values, and positioning?',
  'Clarity and readability — is it easy to understand and engaging?',
  "Platform suitability — is the format, length, and style right for where it's being posted?",
  'Quality assurance — grammar, relevance, and overall content standard',
] as const;

const PRODUCT_FEATURES = [
  {
    title: 'Daily AI-Generated Content',
    description:
      'Strategy-informed posts created every day — structured around your brand profile. The content reflects your business, not a placeholder version of it.',
  },
  {
    title: 'One Input → Three Platform-Optimised Posts',
    description:
      'Give Sociogenie a topic and get three distinct versions: concise and visual for Instagram, professional and insight-driven for LinkedIn, community-focused for Facebook.',
  },
  {
    title: 'Product Ad Creative Generator',
    description:
      'Upload a product image and receive platform-ready creatives with captions and hooks written for conversion — useful for launches and promotions.',
  },
  {
    title: 'Festival & Trend Campaigns',
    description:
      'Culturally relevant content generated automatically for festivals, events, and trending moments — matched to your brand without requiring your attention.',
  },
  {
    title: 'Instant Post Generator',
    description:
      'Need something published today? Write a prompt and get a ready-to-publish post in seconds.',
  },
  {
    title: 'Analytics Dashboard (Elite & Legacy)',
    description:
      "Track performance across platforms, understand what's working, and get AI-powered content recommendations based on your results.",
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
        text: 'Once logged in, the platform guides users through the onboarding and brand setup process to personalize the AI system according to the business identity.',
      },
    ],
  },
  {
    title: 'Brand Onboarding & AI Setup',
    summary:
      'Build the foundation of your business\u2019s AI Brand DNA from your existing assets.',
    body: [
      {
        kind: 'p',
        text: 'During onboarding, Sociogenie collects and builds the foundation of the business\u2019s AI Brand DNA.',
      },
      { kind: 'h', text: 'Users can:' },
      {
        kind: 'list',
        items: [
          'Enter their business website',
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
        text: 'If a website is provided, Sociogenie automatically analyzes and extracts:',
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
        text: 'This information is stored within the platform\u2019s AI Memory Layer and becomes the foundation for future content generation.',
      },
    ],
  },
  {
    title: 'AI Memory Layer',
    summary:
      'Teach the AI your brand personality, tone, audience, and positioning.',
    body: [
      {
        kind: 'p',
        text: 'After onboarding, users complete the AI Memory Layer setup.',
      },
      {
        kind: 'p',
        text: 'The AI asks additional questions to better understand:',
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
        text: 'This allows Sociogenie to continuously generate content that remains aligned with the business identity instead of producing generic AI-generated posts.',
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
      { kind: 'p', text: '\u2026over time.' },
    ],
  },
  {
    title: 'Upload Products & Brand Assets',
    summary:
      'Add product images, marketing references, and brand visuals to your Media Library.',
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
        text: 'These assets are securely stored in the Media Library and are used across:',
      },
      {
        kind: 'list',
        items: [
          'Product advertisements',
          'AI-generated posts',
          'Campaign creatives',
          'Social media marketing workflows',
        ],
      },
      {
        kind: 'p',
        text: 'This helps the AI create more personalized and visually accurate content.',
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
      'Customize exactly how the AI behaves before activating automation.',
    body: [
      {
        kind: 'p',
        text: 'Users can customize how the AI behaves before activating automation.',
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
          'Auto-approval preferences',
          'Timezone settings',
          'Analytics-based scheduling preferences',
        ],
      },
      {
        kind: 'p',
        text: 'These preferences help the AI adapt content generation according to each business\u2019s branding and marketing style.',
      },
    ],
  },
  {
    title: 'Activate the AI Engine',
    summary:
      'Turn on the autonomous social media manager that runs in the background.',
    body: [
      {
        kind: 'p',
        text: 'The AI Engine is the core automation system of Sociogenie.',
      },
      {
        kind: 'p',
        text: 'Once activated, the AI Engine operates continuously in the background as an autonomous social media manager for the business.',
      },
      {
        kind: 'p',
        text: 'Unlike traditional scheduling tools that require users to manually upload content every day, the AI Engine automatically:',
      },
      {
        kind: 'list',
        items: [
          'Researches the user\u2019s industry',
          'Understands the business niche',
          'Analyzes engagement-focused content strategies',
          'Identifies effective marketing angles',
          'Generates branded creatives',
          'Writes optimized captions',
          'Schedules posts intelligently',
          'Publishes content automatically',
        ],
      },
      {
        kind: 'p',
        text: 'The AI Engine generates daily content without requiring constant manual prompts from the user.',
      },
      {
        kind: 'p',
        text: 'The goal is to allow businesses to maintain a consistent and professional social media presence with minimal operational effort.',
      },
    ],
  },
  {
    title: 'AI Content Strategy Generation',
    summary:
      'Diverse content types automatically crafted for your industry and engagement goals.',
    body: [
      {
        kind: 'p',
        text: 'The AI Engine automatically creates different types of content based on the business industry and engagement strategy.',
      },
      { kind: 'p', text: 'Generated content may include:' },
      {
        kind: 'list',
        items: [
          'Engagement-focused posts',
          'Educational content',
          'Brand awareness campaigns',
          'Product-focused marketing',
          'Promotional creatives',
          'Trust-building content',
          'Industry-relevant campaigns',
          'Audience interaction posts',
        ],
      },
      {
        kind: 'p',
        text: 'The AI continuously varies content styles and creative approaches to maintain engagement and avoid repetitive posting behavior.',
      },
    ],
  },
  {
    title: 'Bulk Create (AI Engine Preview System)',
    summary:
      'Preview and pre-generate upcoming AI Engine posts before they go live.',
    body: [
      {
        kind: 'p',
        text: 'Bulk Create is designed as a preview and pre-generation system for the AI Engine.',
      },
      {
        kind: 'p',
        text: 'Instead of waiting for the AI Engine to generate content automatically day-by-day, users can generate upcoming AI Engine posts beforehand.',
      },
      { kind: 'p', text: 'This allows users to:' },
      {
        kind: 'list',
        items: [
          'Preview future AI-generated posts',
          'Review upcoming campaigns',
          'Regenerate content if required',
          'Understand what the AI plans to publish',
        ],
      },
      {
        kind: 'p',
        text: 'Bulk Create acts as a transparency and confidence layer for automation.',
      },
      {
        kind: 'p',
        text: 'Even if users do not use Bulk Create, the AI Engine will still continue generating and posting content automatically.',
      },
    ],
  },
  {
    title: 'Quick Create (Manual AI Generation)',
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
        text: 'This feature gives businesses creative flexibility whenever they need custom or time-sensitive content outside the automated AI workflow.',
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
      { kind: 'p', text: 'The AI then generates:' },
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
      { kind: 'p', text: 'The AI automatically handles:' },
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
      'Hybrid AI + human review with two approval modes to suit your control level.',
    body: [
      {
        kind: 'p',
        text: 'Sociogenie uses a hybrid AI + human review approval system to maintain content quality before publishing.',
      },
      {
        kind: 'p',
        text: 'Users can choose between two approval modes.',
      },
      { kind: 'h', text: 'User Approval Mode' },
      { kind: 'p', text: 'In User Approval Mode:' },
      {
        kind: 'list',
        items: [
          'The AI Engine generates posts automatically',
          'Generated posts enter the review queue',
          'The user manually reviews and approves content',
          'Only approved posts are published',
        ],
      },
      {
        kind: 'p',
        text: 'This mode is ideal for businesses that want full content oversight.',
      },
      { kind: 'h', text: 'Managed Approval Mode' },
      { kind: 'p', text: 'In Managed Approval Mode:' },
      {
        kind: 'list',
        items: [
          'The AI Engine generates content automatically',
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
          'Formats captions',
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
      {
        kind: 'p',
        text: 'Future roadmap updates will include AI feedback learning where the AI Engine continuously improves content generation using real engagement analytics.',
      },
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
        text: 'Base Credits are included with subscription plans and are used for AI-powered generation workflows.',
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
      'Our in-house review team checks every post before it goes live — for brand alignment, clarity, platform suitability, and quality. Standard turnaround is within 24 hours. You can also review and approve posts yourself if you prefer direct control.',
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

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col font-(--font-sora) selection:bg-primary-blue/20 overflow-hidden relative">
      {/* Background */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-primary-blue/8 blur-[120px] rounded-full sm:w-[900px] sm:h-[900px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-primary-purple/8 blur-[120px] rounded-full" />
        <div className="absolute top-1/2 left-[-10%] w-[400px] h-[400px] bg-primary-purple/5 blur-[100px] rounded-full" />
      </div>

      <NavBar />

      <main className="flex-1 relative z-10 flex flex-col">
        {/* Hero */}
        <section className="px-6 pt-24 text-center relative">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="mx-auto max-w-5xl relative z-10"
          >
            <motion.div variants={fadeIn} className="mb-8 flex justify-center">
              <span className="inline-flex items-center rounded-full border border-primary-blue/20 bg-primary-blue/5 px-5 py-2 text-xs font-bold text-primary-blue shadow-sm gap-2">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Powered by AI
              </span>
            </motion.div>
            <motion.h1
              variants={fadeIn}
              className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-[1.1]"
            >
              <span className="bg-gradient-primary-text">
                Automate Your Social Media
              </span>
              <br className="" />
              with AI + Human Review{' '}
            </motion.h1>
            <motion.p
              variants={fadeIn}
              className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed font-(--font-dm-sans)"
            >
              Sociogenie plans, creates, reviews, and publishes content for
              Instagram, Facebook, and LinkedIn — helping your brand stay active
              without the weekly content grind.
            </motion.p>
            <motion.p
              variants={fadeIn}
              className="mx-auto mt-4 max-w-2xl text-base text-foreground/90 font-(--font-dm-sans)"
            >
              A smarter alternative to hiring an agency, managing a freelancer,
              or doing it all yourself.
            </motion.p>
            <motion.div
              variants={fadeIn}
              className="mt-10 flex flex-wrap justify-center gap-4"
            >
              <Link
                href="/sign-up"
                className="group flex items-center rounded-2xl bg-gradient-primary px-8 py-4 text-sm font-bold text-white overflow-hidden relative transition-all hover:shadow-2xl hover:shadow-primary-blue/30 active:scale-95 duration-300"
              >
                <span className="relative z-10 flex items-center">
                  Get Started
                  <Rocket className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 duration-200" />
                </span>
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
              </Link>
              <Link
                href="#how-it-works"
                className="group flex items-center rounded-2xl border border-border bg-card px-8 py-4 text-sm font-semibold text-foreground transition-all hover:bg-accent hover:shadow-lg duration-300"
              >
                See How It Works
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 duration-200" />
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Trust bar */}
        <section
          aria-label="Trust and platform highlights"
          className="border-b border-border/40 px-6 pb-8 pt-8"
        >
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="mx-auto max-w-full"
          >
            <p className="text-center text-pretty text-sm font-(--font-dm-sans) leading-relaxed text-muted-foreground sm:text-base">
              <span className="text-foreground/90">
                {TRUST_BAR_ITEMS.join(' \u00a0·\u00a0 ')}
              </span>
            </p>
          </motion.div>
        </section>

        {/* What Is Sociogenie? */}
        <section
          id="about"
          className="scroll-mt-24 border-y border-border/30 bg-accent/10 px-6 py-10"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
            className="mx-auto max-w-full text-center"
          >
            <motion.p
              variants={fadeIn}
              className="text-pretty text-2xl font-extrabold leading-[1.2] tracking-tight text-foreground sm:text-3xl sm:leading-snug"
            >
              Sociogenie is an{' '}
              <span className="bg-gradient-primary-text">AI-powered</span>{' '}
              social media management system for small businesses
            </motion.p>
            <motion.p
              variants={fadeIn}
              className="mt-5 max-w-2xl text-pretty font-(--font-dm-sans) text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg mx-auto"
            >
              Combining automated content generation with human review and
              publishing.
            </motion.p>
          </motion.div>
        </section>

        {/* Problem */}
        <section className="px-6 py-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-48px' }}
            variants={stagger}
            className="mx-auto max-w-3xl"
          >
            <motion.h2
              variants={fadeIn}
              className="mb-4 text-pretty text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              Why social media is hard for most small businesses
            </motion.h2>
            <ul
              role="list"
              className="divide-y divide-border/50 overflow-hidden  px-4 sm:px-6"
            >
              {SOCIAL_MEDIA_PAIN_POINTS.map((text) => (
                <motion.li
                  key={text}
                  variants={fadeIn}
                  className="flex gap-3.5 py-2 tracking-tight font-(--font-dm-sans)"
                >
                  <span
                    className="relative mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center"
                    aria-hidden
                  >
                    <span className="absolute h-5 w-5 rounded-full bg-primary-blue/18" />
                    <span className="relative h-2 w-2 rounded-full bg-linear-to-br from-primary-blue to-primary-purple" />
                  </span>
                  <span className="min-w-0 text-pretty text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                    {text}
                  </span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </section>

        {/* Pain point cards */}
        <section
          aria-label="Common approaches and their drawbacks"
          className="px-6 pb-10 pt-2 sm:pb-14"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-48px' }}
            variants={stagger}
            className="mx-auto max-w-6xl"
          >
            <ul
              role="list"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5"
            >
              {PAIN_POINT_CARDS.map((card) => (
                <motion.li
                  key={card.title}
                  variants={fadeIn}
                  className="min-h-0"
                >
                  <article className="flex h-full flex-col rounded-2xl border border-border/50 bg-card/50 p-5 shadow-sm backdrop-blur-sm transition-shadow duration-300 hover:shadow-md sm:p-6">
                    <h3 className="text-base font-extrabold tracking-tight text-foreground sm:text-lg">
                      {card.title}
                    </h3>
                    <p className="mt-3 flex-1 text-pretty font-(--font-dm-sans) text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                      {card.description}
                    </p>
                  </article>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </section>

        {/* Comparison: more than a scheduling tool */}
        <section
          aria-labelledby="comparison-scheduling-heading"
          className="border-t border-border/40 bg-accent/10 px-6 py-10 sm:py-14"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-48px' }}
            variants={stagger}
            className="mx-auto max-w-3xl"
          >
            <motion.h2
              id="comparison-scheduling-heading"
              variants={fadeIn}
              className="text-pretty text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              More than a scheduling tool
            </motion.h2>
            <motion.div
              variants={fadeIn}
              className="mt-6 space-y-5 font-(--font-dm-sans) text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              <p className="text-pretty">
                Scheduling Tools help you publish content — but they still
                depend on you to decide what to post, write it, and maintain
                consistency every week.
              </p>
              <p className="text-pretty">
                Unlike scheduling tools that rely on content you create
                yourself, Sociogenie generates, reviews, and publishes content
                for you. It handles the parts of social media that actually take
                time: the strategy, the writing, the quality check, and the
                publishing — all built around your specific business.
              </p>
              <p className="text-pretty">
                If you&apos;re already using a scheduling tool and still
                spending hours on content every week, this is the layer that was
                missing.
              </p>
            </motion.div>
          </motion.div>
        </section>

        {/* Solution — AI + human review + publishing */}
        <section
          aria-labelledby="solution-pillars-heading"
          className="border-t border-border/40 px-6 py-10 sm:py-14"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-48px' }}
            variants={stagger}
            className="mx-auto max-w-6xl"
          >
            <motion.h2
              id="solution-pillars-heading"
              variants={fadeIn}
              className="mx-auto max-w-3xl text-pretty text-center text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              AI-generated content, human-reviewed before publishing
            </motion.h2>
            <motion.p
              variants={fadeIn}
              className="mx-auto mt-5 max-w-3xl text-pretty text-center font-(--font-dm-sans) text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg"
            >
              Sociogenie helps small businesses handle the hardest parts of
              social media: deciding what to post, creating the content,
              reviewing it for quality, and publishing it consistently — all in
              one system tailored to your brand.
            </motion.p>
            <ul
              role="list"
              className="mt-10 grid grid-cols-1 gap-4 md:mt-12 md:grid-cols-3 md:gap-5 lg:gap-6"
            >
              {SOLUTION_PILLARS.map((pillar, index) => (
                <motion.li
                  key={pillar.title}
                  variants={fadeIn}
                  className="min-h-0"
                >
                  <article className="flex h-full flex-col rounded-2xl border border-border/50 bg-card/55 p-5 shadow-sm backdrop-blur-sm transition-shadow duration-300 hover:shadow-md sm:p-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary-blue">
                      Pillar {index + 1}
                    </p>
                    <h3 className="mt-3 text-pretty text-base font-extrabold leading-snug tracking-tight text-foreground sm:text-lg">
                      {pillar.title}
                    </h3>
                    <p className="mt-3 flex-1 text-pretty font-(--font-dm-sans) text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                      {pillar.description}
                    </p>
                  </article>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </section>

        {/* How It Works — full 17-step walkthrough */}
        <section
          id="how-it-works"
          aria-labelledby="how-it-works-heading"
          className="scroll-mt-24 px-6 pt-10 pb-12 sm:pt-12 sm:pb-16 border-y border-border/30 bg-accent/10"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mx-auto max-w-6xl"
          >
            <motion.h2
              id="how-it-works-heading"
              variants={fadeIn}
              className="text-2xl font-extrabold text-foreground sm:text-3xl mb-4"
            >
              Set up once. Your content runs from there.{' '}
            </motion.h2>
            <motion.p
              variants={fadeIn}
              className="max-w-3xl text-pretty font-(--font-dm-sans) text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              Sociogenie is an{' '}
              <span className="font-semibold text-foreground">
                AI-powered social media operating system
              </span>{' '}
              — combining brand memory, AI generation, human review, and
              publishing infrastructure into a single workflow. Tap{' '}
              <span className="font-semibold text-foreground">View more</span>{' '}
              on any step to see the full detail.
            </motion.p>
            <ul
              role="list"
              className="mt-10 grid grid-cols-1 gap-4 md:mt-12 md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-6"
            >
              {HOW_IT_WORKS_STEPS.map((step, index) => (
                <motion.li
                  key={step.title}
                  variants={fadeIn}
                  className="min-h-0"
                >
                  <article className="flex h-full flex-col rounded-2xl border border-border/50 bg-card/55 p-5 shadow-sm backdrop-blur-sm transition-shadow duration-300 hover:shadow-md sm:p-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary-blue">
                      Step {index + 1}
                    </p>
                    <h3 className="mt-3 text-pretty text-base font-extrabold leading-snug tracking-tight text-foreground sm:text-lg">
                      {step.title}
                    </h3>
                    <p className="mt-3 flex-1 text-pretty font-(--font-dm-sans) text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                      {step.summary}
                    </p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          className="group/view mt-5 inline-flex items-center gap-1 self-start rounded-sm font-(--font-dm-sans) text-sm font-semibold text-primary-blue underline decoration-primary-blue/60 decoration-2 underline-offset-4 transition-colors hover:text-primary-purple hover:decoration-primary-purple cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-blue/40"
                        >
                          View more
                          <ArrowRight
                            className="h-3.5 w-3.5 transition-transform group-hover/view:translate-x-0.5"
                            aria-hidden
                          />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
                        <DialogHeader className="border-b border-border/50 px-6 pt-6 pb-4 pr-12 text-left sm:px-8 sm:pt-8 sm:pb-5">
                          <p className="text-xs font-bold uppercase tracking-wider text-primary-blue">
                            Step {index + 1}
                          </p>
                          <DialogTitle className="mt-2 text-pretty text-xl font-extrabold leading-snug tracking-tight text-foreground sm:text-2xl">
                            {step.title}
                          </DialogTitle>
                          <DialogDescription className="text-pretty font-(--font-dm-sans) text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                            {step.summary}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="overflow-y-auto px-6 py-5 sm:px-8 sm:py-6">
                          <StepDialogContent blocks={step.body} />
                        </div>
                      </DialogContent>
                    </Dialog>
                  </article>
                </motion.li>
              ))}
            </ul>
            <motion.p
              variants={fadeIn}
              className="mt-10 text-foreground font-(--font-dm-sans)"
            >
              Fully hands-free after setup — with creative control whenever you
              need it.
            </motion.p>
            <motion.div
              variants={fadeIn}
              className="mt-6 flex justify-center"
            >
              <Link
                href="/sign-up"
                className="group flex items-center rounded-2xl bg-gradient-primary px-8 py-4 text-sm font-bold text-white overflow-hidden relative transition-all hover:shadow-2xl hover:shadow-primary-blue/30 active:scale-95 duration-300 max-w-fit"
              >
                <span className="relative z-10 flex items-center">
                  Get Started
                  <Rocket className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 duration-200" />
                </span>
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Human Review Explainer */}
        <section
          aria-labelledby="human-review-explainer-heading"
          className="px-6 pt-10 pb-4 sm:pb-6"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-48px' }}
            variants={stagger}
            className="mx-auto max-w-3xl"
          >
            <motion.h2
              id="human-review-explainer-heading"
              variants={fadeIn}
              className="text-pretty text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              What &quot;human-reviewed&quot; actually means
            </motion.h2>
            <motion.div
              variants={fadeIn}
              className="mt-5 space-y-4 font-(--font-dm-sans) text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg"
            >
              <p className="text-pretty">
                Every post Sociogenie generates goes through a structured review
                before it reaches your audience.
              </p>
              <p className="text-pretty font-semibold text-foreground">
                Our team checks:
              </p>
            </motion.div>
            <motion.ul
              variants={fadeIn}
              role="list"
              className="mt-4 space-y-3 font-(--font-dm-sans) sm:mt-5"
            >
              {HUMAN_REVIEW_CHECKS.map((line) => (
                <li key={line} className="flex gap-3 text-pretty">
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-primary-blue"
                    aria-hidden
                  />
                  <span className="text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                    {line}
                  </span>
                </li>
              ))}
            </motion.ul>
            <motion.div
              variants={fadeIn}
              className="mt-8 space-y-4 font-(--font-dm-sans) text-base leading-relaxed text-muted-foreground sm:mt-10 sm:text-lg"
            >
              <p className="text-pretty">
                <strong className="text-foreground">
                  Standard review time:
                </strong>{' '}
                within 24 hours.
              </p>
              <p className="text-pretty">
                You can also choose to review and approve posts yourself before
                they go live.
              </p>
            </motion.div>
            <motion.aside
              variants={fadeIn}
              className="mt-8 rounded-2xl border border-primary-blue/25 bg-linear-to-br from-primary-blue/8 via-card/80 to-primary-purple/8 p-5 shadow-sm sm:mt-10 sm:p-6"
            >
              <p className="text-pretty font-(--font-dm-sans) text-sm leading-relaxed text-foreground sm:text-base">
                This is the core difference between Sociogenie and AI tools that
                publish content without any checks.
              </p>
            </motion.aside>
          </motion.div>
        </section>

        {/* Features */}
        <section
          id="features"
          aria-labelledby="product-features-heading"
          className="border-t border-border/40 px-6 py-10 sm:py-14"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-48px' }}
            variants={stagger}
            className="mx-auto max-w-6xl"
          >
            <motion.h2
              id="product-features-heading"
              variants={fadeIn}
              className="mx-auto max-w-3xl text-pretty text-center text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              Everything your social media needs, in one system
            </motion.h2>
            <ul
              role="list"
              className="mt-10 grid grid-cols-1 gap-4 md:mt-12 md:grid-cols-2 md:gap-5 lg:gap-6"
            >
              {PRODUCT_FEATURES.map((feature, index) => (
                <motion.li
                  key={feature.title}
                  variants={fadeIn}
                  className="min-h-0"
                >
                  <article className="flex h-full flex-col rounded-2xl border border-border/50 bg-card/50 p-5 shadow-sm backdrop-blur-sm transition-shadow duration-300 hover:shadow-md sm:p-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary-blue">
                      Feature {index + 1}
                    </p>
                    <h3 className="mt-3 text-pretty text-base font-extrabold leading-snug tracking-tight text-foreground sm:text-lg">
                      {feature.title}
                    </h3>
                    <p className="mt-3 flex-1 text-pretty font-(--font-dm-sans) text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                      {feature.description}
                    </p>
                  </article>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </section>

        {/* Outcomes / Proof */}
        <section
          aria-labelledby="outcomes-proof-heading"
          className="border-t border-border/40 bg-accent/10 px-6 py-10 sm:py-10"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-48px' }}
            variants={stagger}
            className="mx-auto max-w-4xl"
          >
            <motion.h2
              id="outcomes-proof-heading"
              variants={fadeIn}
              className="text-pretty text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              What changes when you stop managing content manually
            </motion.h2>
            <motion.p
              variants={fadeIn}
              className="mt-5 max-w-3xl text-pretty font-(--font-dm-sans) text-base leading-relaxed text-muted-foreground sm:mt-6 sm:text-lg"
            >
              Most small business owners who manage social media themselves
              spend 5–10 hours a week on content creation alone — before
              accounting for strategy, scheduling, and review. Sociogenie
              replaces most of that workload.
            </motion.p>
            <ul
              role="list"
              className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5"
            >
              {OUTCOME_CARDS.map((text) => (
                <motion.li key={text} variants={fadeIn} className="min-h-0">
                  <article className="flex h-full items-start gap-3 rounded-2xl border border-border/50 bg-card/60 p-5 shadow-sm backdrop-blur-sm transition-shadow duration-300 hover:shadow-md sm:p-6">
                    <TrendingUp
                      className="mt-0.5 h-5 w-5 shrink-0 text-primary-blue"
                      aria-hidden
                    />
                    <p className="text-pretty font-(--font-dm-sans) text-sm leading-snug text-foreground sm:text-[15px]">
                      {text}
                    </p>
                  </article>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </section>

        {/* Comparison table */}
        <section
          id="compare"
          aria-labelledby="comparison-table-heading"
          className="scroll-mt-24 border-t border-border/40 px-6 py-10 sm:py-14"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-48px' }}
            variants={stagger}
            className="mx-auto max-w-5xl"
          >
            <motion.h2
              id="comparison-table-heading"
              variants={fadeIn}
              className="text-pretty text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              How Sociogenie compares
            </motion.h2>
            <motion.div
              variants={fadeIn}
              className="mt-8 overflow-x-auto rounded-2xl border border-border/50 bg-card/40 shadow-sm [-webkit-overflow-scrolling:touch]"
            >
              <table className="w-full min-w-[640px] border-collapse text-left font-(--font-dm-sans) text-sm">
                <caption className="sr-only">
                  Comparison of Sociogenie with agencies, freelancers, and
                  scheduling tools across content, strategy, review, and
                  publishing.
                </caption>
                <thead>
                  <tr className="border-b border-border/60 bg-accent/30">
                    <th
                      scope="col"
                      className="sticky top-0 z-10 w-[min(28%,220px)] px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-muted-foreground sm:px-5 sm:py-4 sm:text-sm sm:normal-case sm:tracking-normal"
                    >
                      <span className="sr-only">Criterion</span>
                    </th>
                    {COMPARISON_TABLE_COLUMNS.map((col, colIndex) => (
                      <th
                        key={col}
                        scope="col"
                        className={cn(
                          'sticky top-0 z-10 px-3 py-3.5 text-center text-xs font-bold text-foreground sm:px-4 sm:py-4 sm:text-sm',
                          colIndex === COMPARISON_TABLE_COLUMNS.length - 1 &&
                            'bg-primary-blue/12 text-primary-blue'
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
                        className="w-[min(28%,220px)] px-4 py-3 text-[13px] font-semibold leading-snug text-foreground sm:px-5 sm:py-3.5 sm:text-sm"
                      >
                        {row.criterion}
                      </th>
                      {row.values.map((cell, i) => (
                        <td
                          key={`${row.criterion}-${COMPARISON_TABLE_COLUMNS[i]}`}
                          className={cn(
                            'px-3 py-3 text-center text-[13px] leading-snug text-muted-foreground sm:px-4 sm:py-3.5 sm:text-sm',
                            i === row.values.length - 1 &&
                              'bg-primary-blue/8 text-foreground'
                          )}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
            <motion.p
              variants={fadeIn}
              className="mt-6 max-w-3xl text-pretty font-(--font-dm-sans) text-sm leading-relaxed text-muted-foreground sm:mt-8 sm:text-base"
            >
              Scheduling tools are excellent at publishing content you&apos;ve
              already created. Sociogenie creates, reviews, and publishes it —{' '}
              it&apos;s a different category.
            </motion.p>
          </motion.div>
        </section>

        <section
          id="faq"
          className="scroll-mt-24 px-6 py-10 border-b border-border/30 bg-background"
        >
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mx-auto max-w-4xl"
          >
            <motion.h2
              variants={fadeIn}
              className="text-2xl font-extrabold text-foreground sm:text-3xl mb-6"
            >
              Common questions
            </motion.h2>
            <motion.div variants={fadeIn}>
              <Accordion
                type="single"
                collapsible
                className="rounded-xl border border-border/50 bg-accent/5 font-(--font-dm-sans) divide-y divide-border/40 overflow-hidden "
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
                    <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-4 pt-0 sm:text-[0.9375rem]">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </motion.div>
        </section>
        {/* Final CTA */}
        <section className="px-6 py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-br from-primary-blue/5 to-primary-purple/5 pointer-events-none" />
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mx-auto max-w-4xl text-center relative z-10"
          >
            <motion.h2
              variants={fadeIn}
              className="text-2xl font-extrabold text-foreground sm:text-4xl mb-4"
            >
              Start with 10 days of Elite — free
            </motion.h2>
            <motion.p
              variants={fadeIn}
              className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto font-(--font-dm-sans)"
            >
              Set up your brand profile in under 10 minutes. Your content will
              be reviewed and ready within 24 hours. Subscribe to Elite from
              Billing after you sign up — your first 10 days are free before
              the monthly charge applies.
            </motion.p>
            <motion.div
              variants={fadeIn}
              className="flex flex-col items-center gap-4"
            >
              <Link
                href="/sign-up"
                className="group inline-flex items-center rounded-2xl bg-gradient-primary px-10 py-4 text-base font-bold text-white overflow-hidden relative transition-all hover:shadow-2xl hover:shadow-primary-blue/30 active:scale-95 duration-300"
              >
                <span className="relative z-10 flex items-center">
                  Get Started Free
                  <Rocket className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1 duration-200" />
                </span>
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
              </Link>
              <p className="text-sm text-muted-foreground font-(--font-dm-sans)">
                10-day free trial on Elite · Cancel anytime before you&apos;re charged
              </p>
            </motion.div>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
//
