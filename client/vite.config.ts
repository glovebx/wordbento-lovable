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
          // if (id.includes('node_modules')) {
          //   if (id.includes('recharts')) {
          //       return 'charts';
          //   }
          //   if (id.includes('d3')) {
          //       return 'd3';
          //   }
          //   if (id.includes('react-router-dom')) {
          //       return 'router';
          //   }
          //   // 1. React 核心（不含 DOM 渲染器）
          //   if (id.includes('/react/') || id.includes('/react/index')) {
          //     return 'react-core';
          //   }
          //   // 2. React DOM 渲染器（体积较大）
          //   if (id.includes('/react-dom/')) {
          //     return 'react-dom';
          //   }
          //   // 3. 调度器（通常随 react-dom 引入，但也可独立观察）
          //   if (id.includes('/scheduler/')) {
          //     return 'scheduler';
          //   }            
          //   // 5. 路由
          //   if (id.includes('react-router-dom') || id.includes('react-router')) {
          //     return 'router';
          //   }
          //   // if (id.includes('react') || id.includes('react-dom')) {
          //   //   return 'react';
          //   // }
          //   if (id.includes('@react-pdf/renderer')) {
          //     return 'pdf';
          //   }
          //   return 'vendor';
          // }
          // 仅处理 node_modules 中的模块
          if (!id.includes('node_modules')) return;

          // ============ 1. 超大体积独立库（强制按需加载） ============
          // PDF 渲染器 —— 除非首页必须，否则配合动态 import 使用效果最佳
          if (id.includes('@react-pdf/renderer')) {
            return 'pdf-renderer';
          }

          // ============ 2. 图表与可视化（体积大、更新频率低） ============
          if (id.includes('recharts')) {
            return 'charts-recharts';
          }
          if (id.includes('d3')) {
            // d3 通常作为 recharts 的依赖引入，单独分包避免重复
            return 'charts-d3';
          }

          // ============ 3. 核心框架层（确保稳定、独立缓存） ============
          // React 核心 API (极小块，独立缓存几乎永久有效)
          if (id.includes('/react/') || id.includes('/react/index')) {
            return 'react-core';
          }
          // React DOM 渲染器 (体积较大，但稳定)
          if (id.includes('/react-dom/')) {
            return 'react-dom';
          }
          // 调度器 (内部依赖，随 react-dom 加载)
          if (id.includes('/scheduler/')) {
            return 'scheduler';
          }
          // 路由 (相对独立，更新不频繁)
          if (id.includes('react-router-dom') || id.includes('react-router')) {
            return 'router';
          }
          // 数据请求缓存层
          if (id.includes('@tanstack/react-query')) {
            return 'data-query';
          }

          // ============ 4. UI 组件库分组 ============
          // Radix UI 系列（数量多但单个极小，合并成一个 chunk 避免请求爆炸）
          if (id.includes('@radix-ui/')) {
            return 'ui-radix';
          }
          // 其他 UI 组件 (如 cmdk, vaul, sonner 等)
          if (
            id.includes('cmdk') ||
            id.includes('vaul') ||
            id.includes('sonner') ||
            id.includes('input-otp')
          ) {
            return 'ui-components';
          }
          // 轮播图 (embla-carousel)
          if (id.includes('embla-carousel')) {
            return 'ui-carousel';
          }

          // ============ 5. 图标库（重点优化区域） ============
          // 强烈建议代码层面对图标使用动态导入，否则此处可将它们单独拆分
          if (id.includes('lucide-react')) {
            return 'icons-lucide';
          }
          if (id.includes('react-icons')) {
            return 'icons-react';
          }

          // ============ 6. 表单与校验 ============
          if (
            id.includes('react-hook-form') ||
            id.includes('zod') ||
            id.includes('@hookform/resolvers')
          ) {
            return 'form-lib';
          }
          if (id.includes('react-select')) {
            return 'form-select';
          }
          if (id.includes('react-day-picker') || id.includes('date-fns')) {
            return 'form-date';
          }

          // ============ 7. 通用工具库（高频、小块、合并） ============
          if (
            id.includes('lodash') ||
            id.includes('clsx') ||
            id.includes('class-variance-authority') ||
            id.includes('tailwind-merge') ||
            id.includes('html-to-image') ||
            id.includes('axios') ||
            id.includes('buffer')
          ) {
            return 'utils';
          }

          // ============ 8. 剩余第三方依赖 ============
          // 确保 vendor 包不会过大（通常 < 200KB）
          return 'vendor';
        },
      },
    },
  },
}));