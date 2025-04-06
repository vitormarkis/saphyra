import { defineConfig } from "tsup"

export default defineConfig({
  entry: {
    index: "src/index.ts",
    react: "react/src/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  shims: true,
  sourcemap: true,
  skipNodeModulesBundle: true,
  clean: true,
  tsconfig: "./tsconfig.json",
  outExtension: ({ format }) => ({
    js: format === "esm" ? ".mjs" : ".cjs",
    dts: format === "esm" ? ".d.ts" : ".d.cts",
  }),
  // minify: true,
})
