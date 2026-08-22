import type { Metadata } from 'next';
import { Inter, Instrument_Serif } from 'next/font/google';
import { AnalyticsProvider } from '@/components/AnalyticsProvider';
import { ConsentAwareAnalytics } from '@/components/ConsentAwareAnalytics';
import { CookieBanner } from '@/components/CookieBanner';
import { Toaster } from '@/components/ui/sonner';
import { MotionProvider } from '@/components/shared/MotionProvider';
import './globals.css';

// One typeface, the whole app — differentiated by weight rather than by
// mixing families. Inter is the closest open match to SF Pro Text, so it
// carries both display headlines (700–900) and body/UI copy (400–600).
// `--font-sora` / `--font-dm-sans` / `--font-bricolage` / `--font-geist-*`
// are aliased to this same font in globals.css so existing className
// references across the app keep working without a mass find-replace.
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

/**
 * Display face for marketing headlines only — body and UI stay on Inter.
 * Inter is deliberately neutral, which is what makes it excellent for
 * interface text and bland for a hero. A high-contrast serif carries the
 * elegance; the pairing (editorial serif + functional grotesque) is what
 * reads as premium rather than either face alone.
 */
const instrumentSerif = Instrument_Serif({
  variable: '--font-display',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400'],
  style: ['normal', 'italic'],
});


const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ??
  'https://www.sociogenie.ai';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: 'Sociogenie – AI Social Media Management for Small Businesses',
  description:
    'Sociogenie helps small businesses automate social media with AI-generated, human-reviewed content for Instagram, Facebook, and LinkedIn. Setup in under 10 minutes.',
  keywords: [
    'social media management',
    'AI social media',
    'post scheduler',
    'social media automation',
    'content calendar',
    'SocioGenie',
  ],
  authors: [{ name: 'SocioGenie' }],
  alternates: {
    canonical: 'https://www.sociogenie.ai/',
  },
  openGraph: {
    title: 'Sociogenie – AI Social Media Management for Small Businesses',
    description:
      'AI-generated content, human-reviewed before publishing, posted automatically across Instagram, Facebook & LinkedIn.',
    siteName: 'SocioGenie',
    url: 'https://www.sociogenie.ai/',
    images: ['/logo.png'],
    type: 'website',
  },


  facebook: {
    appId: '949135284535930',
  },


  twitter: {
    card: 'summary_large_image',
    title: 'SocioGenie — AI Social Media Management',
    description: 'Schedule, automate, and grow your social presence with AI.',
  },
  robots: {
    index: true,
    follow: true,
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#4A8FF6" />
        {/* Explicit tags for Meta crawlers (Sharing Debugger often misses Next metadata alone) */}
        <meta property="og:url" content="https://www.sociogenie.ai/" />
        <meta property="fb:app_id" content="949135284535930" />
      </head>
      <body className="antialiased text-foreground min-h-screen relative">
        <MotionProvider>{children}</MotionProvider>
        <Toaster />
        <AnalyticsProvider />
        <ConsentAwareAnalytics />
        <CookieBanner />
      </body>
    </html>
  );
}
