import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// 第 34 课（Tailwind CSS）使用 @tailwindcss/vite 插件；
// 课程讲义刻意不引入 preflight 全局重置，只允许 utilities 层，避免污染其他课的样式。
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
