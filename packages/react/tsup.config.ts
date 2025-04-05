import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  shims: true,
  // sourcemap: true,
  skipNodeModulesBundle: true,
  clean: true,
  tsconfig: "./tsconfig.json",
  outDir: "dist",
  outExtension: ({ format }) => ({
    js: format === "esm" ? ".mjs" : ".js",
  }),
  // minify: true,
})
