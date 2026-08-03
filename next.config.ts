import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid streaming-metadata hydration mismatches in browsers
  // (MetadataWrapper <div hidden> vs whitespace).
  htmlLimitedBots: /.*/,
  serverExternalPackages: ["@myriaddreamin/typst-ts-node-compiler"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
