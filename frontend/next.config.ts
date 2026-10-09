import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async rewrites() {
    return [{
      source: "/api/py/:path*",
      destination: `${process.env.AUTOINSPECT_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000"}/api/:path*`,
    }];
  },
};

export default nextConfig;
