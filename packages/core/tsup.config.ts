import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/db/index.ts",
    "src/ai/index.ts",
  ],
  format: ["esm"],
  dts: true,
  target: "node22",
  clean: true,
  sourcemap: true,
  splitting: true,
  outDir: "dist",
});
