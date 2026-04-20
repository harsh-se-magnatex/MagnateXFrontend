import type { Metadata } from 'next';
import { Sora, DM_Sans, Geist_Mono, Geist } from 'next/font/google';
import { CookieBanner } from '@/components/CookieBanner';
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

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
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
    canonical: 'https://sociogenie.in/',
  },
  openGraph: {
    title: 'Sociogenie – AI Social Media Management for Small Businesses',
    description:
      'AI-generated content, human-reviewed before publishing, posted automatically across Instagram, Facebook & LinkedIn.',
    siteName: 'SocioGenie',
    images: ['/logo.png'],
    type: 'website',
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
        <link rel="icon" href="/logo.png" type="image/png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#4A8FF6" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen relative`}
      >
        <div className="fixed inset-0 z-[-1] bg-background pattern-grid opacity-60" />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
