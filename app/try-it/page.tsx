import type { Metadata } from 'next';
import NavBar from '../(main)/_components/NavBar';
import { LeadMagnetSection } from '@/components/landing/lead-magnet-section';
import '@/components/landing/landing.css';
import { JsonLd, SOFTWARE_APPLICATION_JSON_LD } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Free AI Social Media Post Generator — No Signup | SocioGenie',
  description:
    'Enter your website and get one finished social post for your brand in about a minute — caption and image. No account, no card. Instagram, Facebook or LinkedIn.',
  alternates: {
    canonical: 'https://www.sociogenie.ai/try-it',
  },
  openGraph: {
  title: 'Free AI Social Media Post Generator — No Signup | SocioGenie',
    description:
      'Enter your website and email, pick a platform, and get one free sample social post crafted from your brand — no signup required.',
    siteName: 'SocioGenie',
    url: 'https://www.sociogenie.ai/try-it',
    images: ['/logo.png'],
    type: 'website',
  },
};

export default function TryItPage() {
  return (
    <div className="min-h-screen bg-screen">
      <JsonLd data={SOFTWARE_APPLICATION_JSON_LD} />
      <NavBar />
      <LeadMagnetSection />
    </div>
  );
}
