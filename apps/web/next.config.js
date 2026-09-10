/** @type {import('next').NextConfig} */
const nextConfig = {
  // Workspace packages ship raw TypeScript (no build step); Next must transpile them.
  transpilePackages: ["@repo/trpc", "@repo/database", "@repo/services", "@repo/logger"],
};

export default nextConfig;
