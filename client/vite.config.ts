import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
// import { resolve } from "path";
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentTagger } from "lovable-tagger";

const _dirname = typeof __dirname !== 'undefined'
  ? __dirname
  : dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 1234,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": resolve(_dirname, "./src")
    },
  }
}));
