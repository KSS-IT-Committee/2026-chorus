import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained build output (.next/standalone + a minimal server.js) so the
  // Docker image ships only traced runtime deps; the runner uses
  // `node server.js` instead of `next start`.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
};

export default nextConfig;
