import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Emits .next/standalone with a server.js and only the modules actually
  // reached at runtime — a ~120 MB image instead of ~600 MB, which matters on a
  // 1 GB VM. nginx handles /api routing, so no rewrites are needed here.
  output: 'standalone',

  // The version banner is free reconnaissance for an attacker.
  poweredByHeader: false,
};

export default nextConfig;
