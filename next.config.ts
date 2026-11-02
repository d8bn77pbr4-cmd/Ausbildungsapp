import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Das Entwickler-Symbol überdeckt sonst im Dev-Modus die Tab-Leiste unten links.
  devIndicators: false,
};

export default nextConfig;
