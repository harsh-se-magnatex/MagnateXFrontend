import type { Metadata } from 'next';
import {
  Sora,
  DM_Sans,
  Bricolage_Grotesque,
  Inter,
  Geist_Mono,
  Geist,
} from 'next/font/google';
import { AnalyticsProvider } from '@/components/AnalyticsProvider';
import { CookieBanner } from '@/components/CookieBanner';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const sora = Sora({
  variable: '--font-sora',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});


const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});


const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});


const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});


const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});


const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
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
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#4A8FF6" />
        {/* Explicit tags for Meta crawlers (Sharing Debugger often misses Next metadata alone) */}
        <meta property="og:url" content="https://www.sociogenie.ai/" />
        <meta property="fb:app_id" content="949135284535930" />
      </head>
      <body
        className={`${sora.variable} ${dmSans.variable} ${bricolage.variable} ${inter.variable} ${geistSans.variable} ${geistMono.variable} antialiased text-foreground min-h-screen relative`}
      >
        {children}
        <Toaster />
        <AnalyticsProvider />
        <CookieBanner />
      </body>
    </html>
  );
}
