import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin must stay external so Next.js doesn't bundle it.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
