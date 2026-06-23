import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    "plates-kinds-restoration-ranger.trycloudflare.com",
    "*.trycloudflare.com"
  ]
};

export default nextConfig;
