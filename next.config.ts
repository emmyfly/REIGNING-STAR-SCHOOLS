import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
  // Keep @react-pdf/renderer on the server-side bundle only (avoids canvas/browser-API issues)
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
