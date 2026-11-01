import type { NextConfig } from "next";
import path from "path";

const isGithubActions = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  output: isGithubActions ? "export" : undefined,
  basePath: isGithubActions ? "/neuroscrap" : "",
  assetPrefix: isGithubActions ? "/neuroscrap/" : "",
  env: {
    NEXT_PUBLIC_BASE_PATH: isGithubActions ? "/neuroscrap" : "",
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
