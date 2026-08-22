import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
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
