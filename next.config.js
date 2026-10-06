/** @type {import('next').NextConfig} */
// Corporate/proxy SSL interception can break Node HTTPS to Supabase locally.
// Do not set CONED_RELAX_TLS on Vercel production.
if (process.env.NODE_ENV !== 'production' || process.env.CONED_RELAX_TLS === '1') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

module.exports = nextConfig;
