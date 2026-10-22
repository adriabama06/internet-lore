import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  base: "./",
  publicDir: join(root, "..", "public"),
  build: {
    outDir: join(root, "..", "dist"),
    emptyOutDir: true,
  },
});
