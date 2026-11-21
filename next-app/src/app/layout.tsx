// 第 31 课 · app/layout.tsx —— 根布局：所有路由共享的"外壳"
//
// 本文件教什么：
//   1. App Router 的文件约定：layout.tsx 包住 page.tsx（以及所有子路由），
//      路由切换时 layout 不重新渲染、不丢状态——对比第 3 课 react-router：
//      那里"布局"要你自己用 <Outlet/> 拼进一个普通组件里；
//   2. layout 是导出 metadata 的地方：title/description 会被 Next 注入
//      <head>——SSR/SSG 的 SEO 能力，纯 SPA（craco 的 index.html 写死）给不了；
//   3. <html lang="zh-CN">：RSC 输出完整 HTML 文档，所以你能控制根标签。
import type { Metadata } from "next";
import "./globals.css";

// 中文 metadata：浏览器标签页标题 + SEO 描述（对比 SPA：index.html 里写死）
// oxlint-disable-next-line react/only-export-components -- Next.js 官方约定：metadata 与 layout 同文件导出
export const metadata: Metadata = {
  title: "第 31 课 · Next.js 与服务端组件导论",
  description: "用一个最小 Next.js 子项目理解 RSC：服务端渲染、Suspense 流、水合边界。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
