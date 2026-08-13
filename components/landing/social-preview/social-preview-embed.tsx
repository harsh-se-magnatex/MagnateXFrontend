'use client';

import { useMemo, useState } from 'react';
import { BrandSwitcher } from '@/components/landing/social-preview/brand-switcher';
import { PlatformSwitcher } from '@/components/landing/social-preview/platform-switcher';
import { PreviewDeviceFrame } from '@/components/landing/social-preview/preview-device-frame';
import { InstagramPageMockup } from '@/components/landing/social-preview/instagram-page-mockup';
import { FacebookPageMockup } from '@/components/landing/social-preview/facebook-page-mockup';
import { LinkedInPageMockup } from '@/components/landing/social-preview/linkedin-page-mockup';
import type { PreviewPlatform } from '@/components/landing/social-preview/constants';
import {
  DEFAULT_SHOWCASE_BRAND_ID,
  type ShowcaseBrandId,
} from '@/components/landing/social-preview/showcase-brands';
import {
  getShowcaseBrand,
  getShowcasePostsForPlatform,
} from '@/components/landing/social-preview/showcase-data';

export function SocialPreviewDisclaimer() {
  return (
    <p className="mx-auto max-w-2xl text-center text-xs leading-relaxed text-muted-foreground font-(--font-dm-sans)">
      Illustrative previews only. Platform interfaces shown are mockups for demonstration
      and are not official Meta or LinkedIn products. SocioGenie is not affiliated with,
      endorsed by, or sponsored by Meta Platforms, Inc. or LinkedIn Corporation.
    </p>
  );
}

/** Interactive IG / FB / LI showcase — embeddable without page chrome. */
export function SocialPreviewEmbed() {
  const [brandId, setBrandId] = useState<ShowcaseBrandId>(DEFAULT_SHOWCASE_BRAND_ID);
  const [platform, setPlatform] = useState<PreviewPlatform>('facebook');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const brand = useMemo(() => getShowcaseBrand(brandId), [brandId]);
  const posts = useMemo(
    () => getShowcasePostsForPlatform(brandId, platform),
    [brandId, platform]
  );

  const handleBrandChange = (next: ShowcaseBrandId) => {
    setBrandId(next);
    setSelectedPostId(null);
  };

  const handlePlatformChange = (next: PreviewPlatform) => {
    setPlatform(next);
    setSelectedPostId(null);
  };

  return (
    <div className="w-full">
      <BrandSwitcher active={brandId} onChange={handleBrandChange} />
      <div className="mt-6">
        <PlatformSwitcher active={platform} onChange={handlePlatformChange} />
      </div>
      <div className="mt-8">
        <PreviewDeviceFrame platform={platform} nestedScroll>
          {platform === 'facebook' && (
            <FacebookPageMockup
              brand={brand}
              posts={posts}
              selectedPostId={selectedPostId}
              onSelectPost={setSelectedPostId}
              onClosePost={() => setSelectedPostId(null)}
            />
          )}
          {platform === 'instagram' && (
            <InstagramPageMockup
              brand={brand}
              posts={posts}
              selectedPostId={selectedPostId}
              onSelectPost={setSelectedPostId}
              onClosePost={() => setSelectedPostId(null)}
            />
          )}
          {platform === 'linkedin' && (
            <LinkedInPageMockup
              brand={brand}
              posts={posts}
              selectedPostId={selectedPostId}
              onSelectPost={setSelectedPostId}
              onClosePost={() => setSelectedPostId(null)}
            />
          )}
        </PreviewDeviceFrame>
      </div>
      <div className="mt-6">
        <SocialPreviewDisclaimer />
      </div>
    </div>
  );
}
