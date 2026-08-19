import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["modules/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@clerk/nextjs",
              message:
                "Domain modules must not import Clerk. Use lib/auth instead.",
            },
            {
              name: "@clerk/nextjs/server",
              message:
                "Domain modules must not import Clerk. Use lib/auth instead.",
            },
            {
              name: "@clerk/nextjs/webhooks",
              message:
                "Domain modules must not import Clerk. Use lib/auth instead.",
            },
            {
              name: "@aws-sdk/client-s3",
              message:
                "Domain modules must not import object storage SDKs. Use lib/storage instead.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "generated/**",
  ]),
]);

export default eslintConfig;
