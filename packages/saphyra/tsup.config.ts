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
  noExternal: ["@saphyra/common"],
  outExtension: ({ format }) => ({
    js: format === "esm" ? ".mjs" : ".js",
  }),
  // minify: true,
})
