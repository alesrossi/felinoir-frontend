import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // The share-card route re-encodes its PNG as JPEG with sharp. Keeping sharp
  // external stops webpack bundling a native module and keeps it traced into
  // the standalone output.
  serverExternalPackages: ["sharp"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
