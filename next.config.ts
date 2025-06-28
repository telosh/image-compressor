import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  httpAgentOptions: {
    keepAlive: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;
