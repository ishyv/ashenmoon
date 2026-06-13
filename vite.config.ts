import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type UserConfig } from "vite";

export default defineConfig(({ mode }) => {
  const isTest = mode === "test";
  const config: UserConfig & { test: { environment: "jsdom"; include: string[] } } = {
    plugins: [tailwindcss(), sveltekit()],
    server: {
      fs: {
        allow: [".."],
      },
      watch: {
        ignored: ["**/.data/**"],
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
  return config;
});
