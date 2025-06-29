import js from "@eslint/js"
import globals from "globals"
import tseslint from "typescript-eslint"
import pluginReact from "eslint-plugin-react"
import { defineConfig } from "eslint/config"
import reactRefresh from "eslint-plugin-react-refresh"
import importPlugin from "eslint-plugin-import"

export default defineConfig([
  {
    ignores: ["**/dist/**"],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: { js },
    extends: ["js/recommended"],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    languageOptions: { globals: globals.browser },
  },
  tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,

  // Configuration for docs project (Next.js)
  {
    files: ["apps/docs/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    settings: {
      "import/resolver": {
        typescript: {
          project: "./apps/docs/tsconfig.json",
        },
        node: {
          paths: ["apps/docs/src"],
          extensions: [".js", ".jsx", ".ts", ".tsx"],
        },
      },
    },
    rules: {
      "react-refresh/only-export-components": "off", // Next.js doesn't need this
      "@typescript-eslint/no-explicit-any": "off",
      "no-debugger": "off",
      "import/no-unresolved": ["error"],
    },
    plugins: {
      "react-refresh": reactRefresh,
      "import": importPlugin,
    },
  },

  // Configuration for saphyra package
  {
    files: ["packages/saphyra/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    settings: {
      "import/resolver": {
        typescript: {
          project: "./packages/saphyra/tsconfig.json",
        },
        node: {
          paths: ["packages/saphyra/src"],
          extensions: [".js", ".jsx", ".ts", ".tsx"],
        },
      },
    },
    rules: {
      "react-refresh/only-export-components": "off", // Library doesn't need this
      "@typescript-eslint/no-explicit-any": "off",
      "no-debugger": "off",
      "import/no-unresolved": ["error"],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { ignoreRestSiblings: true, argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-this-alias": [
        "error",
        {
          allowedNames: ["self"],
        },
      ],
    },
    plugins: {
      import: importPlugin,
    },
  },
])
