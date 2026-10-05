/** @type {import('next').NextConfig} */
// Corporate/proxy SSL interception breaks Node HTTPS to Supabase
// (browser Vite fetches worked; Next server components use Node TLS).
if (process.env.NODE_ENV !== 'production' || process.env.CONED_RELAX_TLS === '1') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
};

module.exports = nextConfig;
