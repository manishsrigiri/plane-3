import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/lib.ts"],
  outDir: "dist",
  format: ["esm", "cjs"],
  copy: ["src/styles"],
  exports: false, 
  dts: true,
  clean: true,
  ignoreWatch: ["**/.turbo/**", "**/dist/**", "**/node_modules/**"],
});