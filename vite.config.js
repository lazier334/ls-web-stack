import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  base: '/stack/',
  build: {
    outDir: 'dist/stack'
  },
  plugins: [vue()],
  server: {
    proxy: {
      // 将前端请求的 /system/* 转发到 https://localhost:3031/system/*
      '/system': {
        target: 'http://localhost:3030',  // 后端服务地址
        changeOrigin: true,                // 修改请求头中的 host 为目标地址
        rewrite: (path) => path,           // 可选：重写路径，这里保持原样
        // 如果你的后端没有正确的 HTTPS 证书，可以加下面这行（不推荐生产用）
        // secure: false,
      }
    }
  }
})
