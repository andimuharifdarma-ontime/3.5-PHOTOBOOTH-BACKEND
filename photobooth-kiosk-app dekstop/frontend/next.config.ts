import type { NextConfig } from "next";
import path from "path";

const frontendRoot = __dirname;

const nextConfig: NextConfig = {
  output: "standalone",
  // Prevent Next from picking ~/package-lock.json as monorepo root.
  turbopack: {
    root: frontendRoot,
  },
  outputFileTracingRoot: frontendRoot,
};

export default nextConfig;
