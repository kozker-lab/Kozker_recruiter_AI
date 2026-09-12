import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
    const backendHost = process.env.BACKEND_URL || process.env.BACKEND_INTERNAL_URL || "http://backend:8000";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendHost.replace(/\/+$/, "")}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

