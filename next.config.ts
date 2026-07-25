import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
