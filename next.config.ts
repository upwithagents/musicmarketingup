import type { NextConfig } from "next";

// Single source of truth for the basePath: the portal proxies
// /musicmarketingup/* to this app, and NEXT_PUBLIC_BASE_PATH lets client
// code prefix raw fetch() calls that Next does not rewrite automatically.
const BASE_PATH = "/musicmarketingup";

const nextConfig: NextConfig = {
  // Pin the project root: sibling lockfiles in the multi-repo workspace
  // otherwise make Next infer the wrong root for build artifacts.
  turbopack: { root: __dirname },
  basePath: BASE_PATH,
  env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH },
};

export default nextConfig;
