import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
            return 'vendor';
          }
        },
      },
    },
  },
}));