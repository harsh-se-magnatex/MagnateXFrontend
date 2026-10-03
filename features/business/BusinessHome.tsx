'use client';

import { useEffect, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import { PageLoadingState } from '@/components/shared/PageLoadingState';
import { Button } from '@/components/ui/button';
import DigitalProductHome from '@/features/digital-product/Home';
import PhysicalProductHome from '@/features/physical-product/Home';
import ServiceHome from '@/features/service/Home';
import { useBusiness } from './BusinessProvider';
import type { BusinessType } from './types';

const homes: Record<BusinessType, ComponentType> = {
  digital_product: DigitalProductHome,
  physical_product: PhysicalProductHome,
  service: ServiceHome,
};

export function BusinessHome() {
  const { businessType, onboarded, loading, error, refresh } = useBusiness();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !error && !onboarded) router.replace('/onBoarding');
  }, [loading, error, onboarded, router]);

  if (error)
    return (
      <div
        role="alert"
        className="mx-auto max-w-lg space-y-4 py-12 text-center"
      >
        <p>{error}</p>
        <Button onClick={() => void refresh()}>Try again</Button>
      </div>
    );
  if (loading || !onboarded) return <PageLoadingState />;
  if (!businessType) return <div className="min-h-[50vh]" />;
  const Home = homes[businessType];
  return <Home />;
}
