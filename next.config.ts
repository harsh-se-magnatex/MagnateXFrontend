import type { NextConfig } from 'next';
import { WORKSPACE_LEGACY_PATH_REDIRECTS } from './lib/workspace-nav';

const legacyRedirects = () =>
  Object.entries(WORKSPACE_LEGACY_PATH_REDIRECTS).flatMap(
    ([source, destination]) => [
      { source, destination, permanent: true },
      {
        source: `${source}/:path*`,
        destination: `${destination}/:path*`,
        permanent: true,
      },
    ]
  );

const nextConfig: NextConfig = {
  turbopack: {
    // Resolve from frontend so tailwindcss and deps come from frontend/node_modules
    root: process.cwd(),
  },
  experimental: {
    // Avoid background disk-cache compaction during local development.
    // Production build caching keeps its existing defaults.
    turbopackFileSystemCacheForDev: false,
    // Soft target for the Rust compiler cache, not a total process RAM cap.
    turbopackMemoryLimit:
      process.env.NODE_ENV === 'development' ? 1536 * 1024 * 1024 : undefined,
  },
  async redirects() {
    return [
      // The free post generator was retired; its traffic and ranking go to
      // the homepage. Permanent, so search engines transfer the URL's signals.
      { source: '/try-it', destination: '/', permanent: true },
      { source: '/try-it/:path*', destination: '/', permanent: true },
      ...legacyRedirects(),
    ];
  },
};

export default nextConfig;
