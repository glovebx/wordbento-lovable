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
  },
  // 添加 build 配置
  build: {
    rollupOptions: {
      // external: ['fs'], // 告诉 Rollup 忽略 fs 模块
      output: {
        manualChunks: {
          // 核心框架库
          react: [
            'react',
            'react-dom',
            'react-router-dom',
            'react-error-boundary'
          ],
          
          // Radix UI 组件库
          radix: [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-label',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-tooltip',
            'cmdk',
            'vaul'
          ],
          
          // 表单处理
          forms: [
            'react-hook-form',
            '@hookform/resolvers',
            'zod',
            'input-otp',
            'react-select'
          ],
          
          // 状态管理
          state: [
            '@tanstack/react-query'
          ],
          
          // UI 组件 & 图标
          ui: [
            'lucide-react',
            'react-icons',
            'sonner',
            'embla-carousel-react',
            'react-loading-indicators',
            'react-resizable-panels'
          ],
          
          // 工具库
          utils: [
            'axios',
            'class-variance-authority',
            'clsx',
            'date-fns',
            'html-to-image',
            'html2canvas',
            'lodash',
            'lodash-es',
            'tailwind-merge'
          ],
          
          // 主题 & 样式
          theme: [
            'next-themes',
            'tailwindcss-animate'
          ],
          
          // 日期处理
          date: [
            'react-day-picker'
          ],
          
          // 图表库
          charts: [
            'recharts'
          ],
          
          // Tailwind 相关
          tailwind: [
            '@tailwindcss/container-queries',
            '@tailwindcss/forms',
            // '@tailwindcss/postcss'
          ],
          
          // 安全 & 调试
          security: [
            '@fvilers/disable-react-devtools'
          ]
        },
      },
    },
  }  
}));
