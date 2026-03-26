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
      output: {
        manualChunks(id: string) {
          // 核心框架库
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom') || id.includes('react-error-boundary')) {
            return 'react';
          }
          
          // Radix UI 组件库
          if (id.includes('@radix-ui/') || id.includes('cmdk') || id.includes('vaul')) {
            return 'radix';
          }
          
          // 表单处理
          if (id.includes('react-hook-form') || id.includes('@hookform/') || id.includes('zod') || id.includes('input-otp') || id.includes('react-select')) {
            return 'forms';
          }
          
          // 状态管理
          if (id.includes('@tanstack/react-query')) {
            return 'state';
          }
          
          // UI 组件 & 图标
          if (id.includes('lucide-react') || id.includes('react-icons') || id.includes('sonner') || 
              id.includes('embla-carousel-react') || id.includes('react-loading-indicators') || 
              id.includes('react-resizable-panels')) {
            return 'ui';
          }
          
          // 工具库
          if (id.includes('axios') || id.includes('class-variance-authority') || id.includes('clsx') || 
              id.includes('date-fns') || id.includes('html-to-image') || id.includes('html2canvas') || 
              id.includes('lodash') || id.includes('tailwind-merge')) {
            return 'utils';
          }
          
          // 主题 & 样式
          if (id.includes('next-themes') || id.includes('tailwindcss-animate')) {
            return 'theme';
          }
          
          // 日期处理
          if (id.includes('react-day-picker')) {
            return 'date';
          }
          
          // 图表库
          if (id.includes('recharts')) {
            return 'charts';
          }
          
          // Tailwind 相关
          if (id.includes('@tailwindcss/')) {
            return 'tailwind';
          }
          
          // 安全 & 调试
          if (id.includes('@fvilers/disable-react-devtools')) {
            return 'security';
          }
          
          // 其他 node_modules 放入 vendor
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  }
}));
