import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    "plates-kinds-restoration-ranger.trycloudflare.com",
    "*.trycloudflare.com"
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    webpackMemoryOptimizations: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://localhost:8000/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;

