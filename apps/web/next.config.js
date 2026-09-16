import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Workspace packages ship raw TypeScript (no build step); Next must transpile them.
  transpilePackages: ["@repo/trpc", "@repo/database", "@repo/services", "@repo/logger"],
  // Self-contained server bundle for the Docker image (see apps/web/Dockerfile).
  output: "standalone",
  // transpilePackages reach outside apps/web (into packages/*); Next's file tracer needs
  // the monorepo root to find them, or standalone output silently omits their files.
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
};

export default nextConfig;
