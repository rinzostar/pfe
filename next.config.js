/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  output: 'export',
  distDir: 'out',
  trailingSlash: true,
};

module.exports = nextConfig;
