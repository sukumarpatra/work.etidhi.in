import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  async headers() {
    return [
      {
        // Always revalidate HTML/document + data routes so a new deploy shows
        // up immediately. Excludes /_next/ so hashed JS/CSS keep long caching.
        source: "/((?!_next/).*)",
        headers: [
          { key: "Cache-Control", value: "no-cache, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
