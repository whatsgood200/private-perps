/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs:     false,
        crypto: false,
        stream: false,
        buffer: require.resolve("buffer/"),
      };
    }
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ["@coral-xyz/anchor"],
  },
};

module.exports = nextConfig;
