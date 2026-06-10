import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    alias: {
      "$shared/bridge-types": "./src/lib/shared/bridge-types.ts",
      "$shared/embed-config": "./src/lib/shared/embed-config.ts",
      "$shared/script-docs": "./src/lib/shared/documentation.json",
    },
  },
};

export default config;
