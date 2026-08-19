import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {
    browserToTerminal: "error",
    incomingRequests: {
      ignore: [
        /\/privacy-policy(?:\?|$)/,
        /\/__clerk(?:\/|$)/,
        /\/favicon\.ico(?:\?|$)/,
        /\/icon\.svg(?:\?|$)/,
      ],
    },
  },
};

export default nextConfig;
