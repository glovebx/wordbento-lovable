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
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 1234,
  },
  plugins: [
    injectThemeScriptPlugin(),
    react(),
    tailwindcss(),  // ✅ 作为 Vite 插件
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto', // ✅ 确保自动注入 SW 注册代码
      strategies: 'generateSW', // ✅ 明确生成 SW 策略      
      workbox: {
        // ✅ 确保离线缓存正常工作，这是 PWA 必要条件
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
      },      
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        id: 'wordbento-app', // ✅ 添加唯一 ID（PWA 新要求）
        name: 'WordBento',
        short_name: 'WordBento',
        description: 'Your daily dose of words, served fresh.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        // ✅ 添加 categories 提高可安装性评分
        categories: ['education', 'productivity'],
        // ✅ 确保 lang 设置正确
        lang: 'zh-CN', // 或 'en-US' 根据你的应用语言        
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any' // ✅ 明确 purpose
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any' // ✅ 明确 purpose
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        // ✅ 添加 screenshots（帮助浏览器识别为 PWA，并提高安装体验）
        screenshots: [
          {
            src: 'screenshot1.jpg',
            sizes: '1280x720',
            type: 'image/jpeg',
            form_factor: 'wide'
          },
          {
            src: 'screenshot2.png',
            sizes: '650x1352',
            type: 'image/png',
            form_factor: 'narrow'
          }
        ]
      },
      // ✅ 开发环境也启用 PWA 以便测试（可选）
      devOptions: {
        enabled: mode === 'development',
        type: 'module',
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": resolve(_dirname, "./src")
    },
  },
  build: {
    // sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return;

          // ============ 1. Large libraries for lazy-loading ============
          if (id.includes('@react-pdf/renderer')) return 'pdf-renderer';
          if (id.includes('recharts')) return 'charts-recharts';
          if (id.includes('html-to-image')) return 'html-to-image';
          if (id.includes('d3')) return 'charts-d3';

          // ============ 2. Core Framework (stable, long-term caching) ============
          if (id.includes('react-dom')) return 'react-dom';
          if (id.includes('react-router-dom') || id.includes('react-router')) return 'router';
          if (id.includes('react')) return 'react'; // Catches react, scheduler, etc.

          // ============ 3. UI and Component Libraries (consolidated) ============
          if (
            id.includes('@radix-ui/') ||
            id.includes('cmdk') ||
            id.includes('vaul') ||
            id.includes('sonner') ||
            id.includes('input-otp') ||
            id.includes('embla-carousel') ||
            id.includes('react-resizable-panels')
          ) {
            return 'ui-libs';
          }

          // ============ 4. Icons ============
          if (id.includes('lucide-react')) return 'icons-lucide';
          if (id.includes('react-icons')) return 'icons-react';

          // ============ 5. Forms and Date/Time (consolidated) ============
          if (
            id.includes('react-hook-form') ||
            id.includes('zod') ||
            id.includes('@hookform/resolvers') ||
            id.includes('react-select') ||
            id.includes('react-day-picker') ||
            id.includes('date-fns')
          ) {
            return 'form-libs';
          }

          // ============ 6. Common Utilities ============
          if (
            id.includes('lodash') || // Catches lodash and lodash-es
            id.includes('clsx') ||
            id.includes('class-variance-authority') ||
            id.includes('tailwind-merge') ||
            id.includes('axios') ||
            id.includes('buffer') ||
            id.includes('@tanstack/react-query')
          ) {
            return 'utils';
          }

          // ============ 7. Default vendor chunk for everything else ============
          return 'vendor';
        },
      },
    },
  },
}));