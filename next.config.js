/** @type {import('next').NextConfig} */
const isGithubActions = process.env.GITHUB_ACTIONS || false;

let repo = '';
if (isGithubActions && process.env.GITHUB_REPOSITORY) {
  repo = process.env.GITHUB_REPOSITORY.replace(/.*?\//, ''); // จะได้ค่า 'EDUDashboard'
}

const nextConfig = {
  reactStrictMode: true,

  // 1. สั่งให้ Next.js Export เป็น Static HTML/CSS/JS สำหรับ GitHub Pages
  output: 'export',

  // 2. กำหนด Path สำหรับ GitHub Pages (https://obecreports.github.io/EDUDashboard/)
  basePath: isGithubActions ? `/${repo}` : '',
  assetPrefix: isGithubActions ? `/${repo}/` : '',

  // 3. ปิดการ Optimization รูปภาพ (Static Export ไม่รองรับ Image Server ของ Next.js)
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
};

module.exports = nextConfig;