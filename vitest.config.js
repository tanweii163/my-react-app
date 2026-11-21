// 测试配置：vitest 专用，先讲清它和 vite.config.js 的关系——
//
// 铁律：项目根目录放了 vitest.config.js，vitest 运行时就用【它完全替代】
// vite.config.js，两个文件不会自动合并。所以 react 插件必须在这里再写一遍，
// 否则测试里的 JSX（如 RatingStars.test.jsx）没人负责编译，直接语法报错。
// 想两份配置共用可以用 vite 的 mergeConfig 组合，本课为了"一眼看完"选择独立成文。
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom：在 Node 里模拟出 window / document 等浏览器对象。
    // 组件测试必需——@testing-library/react 要把组件挂到真实 DOM 上才查得到。
    // 只测纯函数（reducer）其实用不到 DOM，但一份配置统一跑所有测试最省心。
    environment: 'jsdom',

    // 前置文件：每个测试文件执行前先跑它，负责给 expect 装上
    // toBeInTheDocument / toHaveClass 这些 jest-dom 匹配器（见 setup.js）。
    setupFiles: ['./src/components/lesson15/setup.js'],

    // globals 故意不开：describe / it / expect 不从"空气里来"，
    // 每个测试文件显式 import，来源清晰、编辑器跳转和补全都更好，
    // 也逼着初学者看清这些函数到底是谁提供的（vitest，不是 JavaScript 内置）。
    globals: false,

    // 第 36 课（Playwright E2E）：e2e/*.spec.js 是 Playwright 的测试文件，
    // 不是 vitest 的——不加这条 exclude，vitest 会把它们也收集进来然后
    // 报 "no tests" 失败（两种测试运行器的 test 函数不是同一个东西）。
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  },
})
