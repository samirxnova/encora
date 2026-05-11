import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true",
  },
  eslint: {
    ignoreDuringBuilds: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true",
  },
  webpack: config => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    // Stub missing React Native dep from MetaMask SDK
    config.resolve.alias["@react-native-async-storage/async-storage"] = false;
    // Suppress ox/tempo dynamic require warning
    config.module.exprContextCritical = false;
    return config;
  },
};

module.exports = nextConfig;
