import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@poe2-helper/character-context",
    "@poe2-helper/data-sources",
    "@poe2-helper/domain",
    "@poe2-helper/gear-engine",
    "@poe2-helper/passive-engine",
    "@poe2-helper/pob2-calculator",
    "@poe2-helper/scoring-engine",
  ],
  experimental: {
    extensionAlias: {
      ".js": [".ts", ".tsx", ".js"],
    },
  },
};

export default nextConfig;
