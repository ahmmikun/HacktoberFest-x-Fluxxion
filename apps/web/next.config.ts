import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Separate output dirs so `next build` can never overwrite the chunks of a running `next dev`
  // (that clobbering surfaces as MODULE_NOT_FOUND / HTTP 500 in the dev server).
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@reposage/shared"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
