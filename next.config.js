/** @type {import('next').NextConfig} */
// Corporate/proxy SSL interception breaks Node HTTPS to Supabase
// (browser Vite fetches worked; Next server components use Node TLS).
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

// OpenNext Cloudflare local-dev bindings (safe no-op outside CF tooling)
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { initOpenNextCloudflareForDev } = require('@opennextjs/cloudflare');
  initOpenNextCloudflareForDev();
} catch {
  /* optional during plain next build */
}
