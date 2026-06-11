import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    // Resolve from frontend so tailwindcss and deps come from frontend/node_modules
    root: process.cwd(),
  },
};

export default nextConfig;
