import type { NextConfig } from 'next';

// Capacitor butuh static export (output: 'export') untuk webview, tapi mode itu
// menghapus semua API routes — /api/chat tidak akan pernah ada. Jadi export
// HANYA untuk build mobile. Build Vercel (tanpa flag ini) jadi server mode
// yang mengaktifkan /api/chat sebagai serverless function.
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isCapacitorBuild ? { output: 'export' as const } : {}),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
