import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import lottie from "astro-integration-lottie";
import svgr from "vite-plugin-svgr";
import node from "@astrojs/node";
import formDebug from "@astro-utils/forms/dist/integration.js";
import sitemap from "@astrojs/sitemap";
import requestNanostores from "@inox-tools/request-nanostores";

import { loadEnv } from "vite";
const { SITE_URL } = loadEnv(process.env.NODE_ENV, process.cwd(), "");
const OUTPUT_MODE = "server";

// https://astro.build/config
export default defineConfig({
  vite: {
    build: {
      sourcemap: "hidden",
    },
    server: {
      watch: {
        usePolling: true,
      },
    },
    ssr: {
      noExternal: [/^d3.*$/, /^@nivo.*$/],
    },
    plugins: [
      svgr({
        include: "**/*.svg?react",
        svgrOptions: {
          plugins: ["@svgr/plugin-svgo", "@svgr/plugin-jsx"],
          svgoConfig: {
            plugins: [
              "preset-default",
              "removeTitle",
              "removeDesc",
              "removeDoctype",
              "cleanupIds",
            ],
          },
          icon: true,
        },
      }),
    ],
  },

  // Note: the sitemap integration cannot generate entries for dynamic
  // routes when Astro is running in SSR (`output: "server"`) mode.
  // See https://docs.astro.build/en/guides/integrations-guide/sitemap/
  site: SITE_URL || "http://localhost:4321",
  base: "",
  output: OUTPUT_MODE,
  trailingSlash: "ignore",
  srcDir: "./src",
  integrations: (() => {
    const list = [
      formDebug,
      react(),
      tailwind(),
      lottie(),
      requestNanostores(),
    ];
    // Only enable sitemap for non-SSR/static output builds. Enabling the
    // integration in `server` mode can cause the integration to receive
    // incomplete route information and crash during `astro build`.
    if (OUTPUT_MODE !== "server") {
      list.push(sitemap());
    }
    return list;
  })(),
  adapter: node({
    mode: "standalone",
  }),
});
