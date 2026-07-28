'use client';

import { useMemo, useState } from 'react';
import { PlatformSwitcher } from '@/components/landing/social-preview/platform-switcher';
import { PreviewDeviceFrame } from '@/components/landing/social-preview/preview-device-frame';
import { InstagramPageMockup } from '@/components/landing/social-preview/instagram-page-mockup';
import { FacebookPageMockup } from '@/components/landing/social-preview/facebook-page-mockup';
import { LinkedInPageMockup } from '@/components/landing/social-preview/linkedin-page-mockup';
import type { PreviewPlatform } from '@/components/landing/social-preview/constants';
import { getShowcasePostsForPlatform } from '@/components/landing/social-preview/showcase-data';

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
  const [platform, setPlatform] = useState<PreviewPlatform>('instagram');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const posts = useMemo(
    () => getShowcasePostsForPlatform(platform),
    [platform]
  );

  const handlePlatformChange = (next: PreviewPlatform) => {
    setPlatform(next);
    setSelectedPostId(null);
  };

  return (
    <div className="w-full">
      <PlatformSwitcher active={platform} onChange={handlePlatformChange} />
      <div className="mt-8">
        <PreviewDeviceFrame platform={platform} nestedScroll>
          {platform === 'instagram' && (
            <InstagramPageMockup
              posts={posts}
              selectedPostId={selectedPostId}
              onSelectPost={setSelectedPostId}
              onClosePost={() => setSelectedPostId(null)}
            />
          )}
          {platform === 'facebook' && (
            <FacebookPageMockup
              posts={posts}
              selectedPostId={selectedPostId}
              onSelectPost={setSelectedPostId}
              onClosePost={() => setSelectedPostId(null)}
            />
          )}
          {platform === 'linkedin' && (
            <LinkedInPageMockup
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
