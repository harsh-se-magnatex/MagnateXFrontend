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
