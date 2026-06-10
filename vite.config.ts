import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  const isTest = mode === "test";
  return {
    plugins: [tailwindcss(), sveltekit()],
    server: {
      fs: {
        allow: [".."],
      },
    },
    ...(isTest && {
      resolve: {
        conditions: ["browser"],
      },
    }),
    test: {
      environment: "jsdom",
      include: ["src/**/*.test.ts"],
    },
  };
});
