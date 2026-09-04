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
  productionBrowserSourceMaps: false,
  experimental: {
    webpackMemoryOptimizations: true,
    cpus: 1,
    optimizePackageImports: ["lucide-react"],
  },
  async rewrites() {
    const backendHost = process.env.BACKEND_URL || "http://localhost:8000";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendHost}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

