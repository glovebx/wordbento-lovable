import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const _dirname = typeof __dirname !== 'undefined'
  ? __dirname
  : dirname(fileURLToPath(import.meta.url));

// Read the theme initialization script content
const themeScript = fs.readFileSync(resolve(_dirname, 'src/theme-init.ts'), 'utf-8');

// Plugin to inject the script into the <head>
const injectThemeScriptPlugin = () => {
  return {
    name: 'inject-theme-script',
    transformIndexHtml(html: string) {
      return html.replace(
        '</head>',
        `  <script>${themeScript}</script>\n</head>`
      );
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 1234,
  },
  plugins: [
    injectThemeScriptPlugin(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'WordBento',
        short_name: 'WordBento',
        description: 'An intelligent English word learning app.',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": resolve(_dirname, "./src"),
    },
  },
});