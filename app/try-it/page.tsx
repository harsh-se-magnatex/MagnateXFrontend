import type { Metadata } from 'next';
import NavBar from '../(main)/_components/NavBar';
import { LeadMagnetSection } from '@/components/landing/lead-magnet-section';
import '@/components/landing/landing.css';

export const metadata: Metadata = {
  title: 'Try it — Sociogenie | Free sample post',
  description:
    'Enter your website and email, pick a platform, and get one free sample social post crafted from your brand — no signup required.',
  alternates: {
    canonical: 'https://www.sociogenie.ai/try-it',
  },
  openGraph: {
    title: 'Try it — Sociogenie | Free sample post',
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
      <NavBar />
      <LeadMagnetSection />
    </div>
  );
}
