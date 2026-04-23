import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginAstro from "eslint-plugin-astro";
import reactHooks from "eslint-plugin-react-hooks";
import eslintConfigPrettier from "eslint-config-prettier";
import cssPlugin from "@eslint/css";
import jsonPlugin from "@eslint/json";
import markdownPlugin from "@eslint/markdown";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      ".astro/**",
      "coverage/**",
      ".env*",
      "public/mockServiceWorker.js",
      "*.config.mjs",
      "*.config.js",
    ],
  },
  // Base JS config - restricted to JS-like files
  {
    files: ["src/**/*.{js,mjs,cjs,jsx,tsx,ts,mts,cts,astro}"],
    ...js.configs.recommended,
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  // TypeScript-ESLint base config - returns an array that we spread
  ...tseslint.configs.recommended,
  // Astro plugin - already array
  ...pluginAstro.configs.recommended,
  // TypeScript parser for TS files
  {
    files: ["src/**/*.{ts,mts,cts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        sourceType: "module",
      },
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // React Hooks
  {
    files: ["src/**/*.{jsx,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  // Environment variable declaration file
  {
    files: ["src/env.d.ts"],
    rules: {
      "@typescript-eslint/triple-slash-reference": "off",
    },
  },
  // CSS Language Plugin
  {
    files: ["src/**/*.css"],
    plugins: { css: cssPlugin },
    language: "css/css",
    extends: ["css/recommended"],
  },
  // JSON Language Plugin
  {
    files: ["src/**/*.json"],
    ignores: ["src/**/package-lock.json"],
    plugins: { json: jsonPlugin },
    language: "json/json",
    extends: ["json/recommended"],
  },
  // JSONC Language Plugin
  {
    files: ["src/**/*.jsonc"],
    plugins: { json: jsonPlugin },
    language: "json/jsonc",
    extends: ["json/recommended"],
  },
  // Markdown Language Plugin
  {
    files: ["src/**/*.md"],
    plugins: { markdown: markdownPlugin },
    extends: ["markdown/recommended"],
  },
  // Prettier compatibility (must be last)
  eslintConfigPrettier,
]);
