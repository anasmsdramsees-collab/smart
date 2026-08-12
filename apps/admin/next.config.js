/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // `standalone` produces the self-contained server the Docker image runs.
  // Vercel builds this app natively and does not want that output mode, so it
  // is left at the default there.
  output: process.env.VERCEL ? undefined : 'standalone',
  poweredByHeader: false,
};

module.exports = nextConfig;
