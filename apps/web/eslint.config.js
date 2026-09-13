import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    // Static assets served as-is — not source, never linted (the vendored
    // pdfjs worker in particular is a minified bundle, not hand-written code).
    ignores: ["public/**"],
  },
];
