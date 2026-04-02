import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from '@tailwindcss/postcss'  // v4 方式
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
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },  
  resolve: {
    alias: {
      "@": resolve(_dirname, "./src")
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) {
                return 'charts';
            }
            if (id.includes('d3')) {
                return 'd3';
            }
            if (id.includes('react-router-dom')) {
                return 'router';
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react';
            }
            if (id.includes('html-to-image')) {
                return 'image';
            }
            if (id.includes('embla-carousel-react')) {
                return 'player';
            }
            if (id.includes('@dnd-kit')) {
                return 'dnd';
            }
            if (id.includes('@radix-ui')) {
              return 'radix';
            }
            if (id.includes('react-hook-form') || id.includes('zod')) {
              return 'forms';
            }
            if (id.includes('lucide-react')) {
              return 'ui';
            }
            if (id.includes('axios') || id.includes('date-fns')) {
                return 'utils';
            }
            return 'vendor';
          }
        },
      },
    },
  }
}));
