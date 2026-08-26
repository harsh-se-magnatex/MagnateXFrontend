import type { NextConfig } from 'next';
import { WORKSPACE_LEGACY_PATH_REDIRECTS } from './lib/workspace-nav';

const legacyRedirects = () =>
  Object.entries(WORKSPACE_LEGACY_PATH_REDIRECTS).flatMap(
    ([source, destination]) => [
      { source, destination, permanent: true },
      { source: `${source}/:path*`, destination: `${destination}/:path*`, permanent: true },
    ]
  );

const nextConfig: NextConfig = {
  turbopack: {
    // Resolve from frontend so tailwindcss and deps come from frontend/node_modules
    root: process.cwd(),
  },
  async redirects() {
    return legacyRedirects();
  },
  async headers() {
    return [
      {
        source: '/frames-webp-1440/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/frames-webp-mobile/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
