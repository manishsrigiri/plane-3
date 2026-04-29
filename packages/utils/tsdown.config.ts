import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ["esm", "cjs"],
  exports: false,
  dts: true,
  clean: true,
  sourcemap: true,
  target: "esnext",
  ignoreWatch: ["**/.turbo/**", "**/dist/**", "**/node_modules/**"],
});
