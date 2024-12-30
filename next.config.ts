/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config: any ) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.fs = false;
    return config;
  },
};

module.exports = nextConfig;