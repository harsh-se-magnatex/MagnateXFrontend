import type { Metadata } from 'next';
import NavBar from '../(main)/_components/NavBar';
import { LeadMagnetSection } from '@/components/landing/lead-magnet-section';
import '@/components/landing/landing-3d.css';

export const metadata: Metadata = {
  title: 'Try it — Sociogenie | Free sample post',
  description:
    'Enter your website and email, pick a platform, and get one free sample social post crafted from your brand — no signup required.',
};

export default function TryItPage() {
  return (
    <div className="min-h-screen bg-[#07070c]">
      <NavBar />
      <LeadMagnetSection />
    </div>
  );
}
