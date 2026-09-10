import js from "@eslint/js";
import globals from "globals";
import { config as baseConfig } from "./base.js";

/**
 * ESLint configuration for Node.js / TypeScript packages and apps
 * (everything that is not the Next.js web app).
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const config = [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    ignores: ["dist/**", "drizzle/**", ".turbo/**"],
  },
];
