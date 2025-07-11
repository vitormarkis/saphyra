import { defineConfig } from "vitest/config"
import packageJson from "../../apps/examples/package.json"
import path from "path"

const vitestTestConfig = {
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    name: packageJson.name,
    watch: false,
    typecheck: { enabled: true },
    globals: true,
    environment: "jsdom",
    reporters: ["verbose"],
    testTimeout: 999_999,
    timeout: 999_999,
  },
}

export default defineConfig(vitestTestConfig)
