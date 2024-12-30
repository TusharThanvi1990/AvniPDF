/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    appDir: true,
  },
  webpack: (config: any) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.fs = false;
    return config;
  },
};

module.exports = nextConfig;
