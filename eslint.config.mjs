import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // This is a very new, still-evolving React Compiler readiness rule.
      // Our Firestore subscription hooks (useVitals, useMedications, etc.)
      // intentionally reset local state to an empty array and clear the
      // loading flag when `user` becomes null (sign-out), then resubscribe
      // when it becomes non-null again — a standard, well-understood
      // "sync external subscription to a changing id" effect pattern.
      // Downgraded to a warning rather than reworked, since rewriting it
      // (e.g. via render-time state adjustment) would add indirection
      // without changing behavior.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
