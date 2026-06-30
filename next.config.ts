import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The editorial design is hand-built; we skip lint during builds so a missing
  // ESLint config never blocks a demo build. Type-checking stays on.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
