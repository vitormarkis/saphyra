import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "tailwindcss"
import path from "path"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
  },

  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },

  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5173",
        changeOrigin: true,
      },
    },
  },

  build: {
    rollupOptions: {
      // external: ["@blueprintjs/icons/lib/css/blueprint-icons.css", "normalize.css"],
      output: {
        manualChunks: {
          "@blueprintjs/core": ["@blueprintjs/core"],
        },
      },
    },
  },
})
