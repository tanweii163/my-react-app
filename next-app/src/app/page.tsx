// 第 31 课 · app/page.tsx —— 服务端组件（RSC）教学 demo
//
// 本文件教什么：
//   1. 这个组件【没有】'use client'——所以它是服务端组件，运行在 Node 里；
//   2. RSC 可以直接写 async/await：await getPosts() 就发生在服务器上，
//      浏览器收到的已经是"数据 + HTML"的成品——
//      【这在 SPA 里不行】：SPA 的所有代码都跑在浏览器，没有服务器帮你提前跑
//      组件函数，所以只能 useEffect + setState + loading 状态三件套（第 21 课）；
//   3. 服务端组件里可以直接 import lib/data.ts（含"数据库"）而不用担心泄漏——
//      这段代码根本不会进客户端 bundle；
//   4. 异步期间 Next 会展示 loading.tsx（Suspense 骨架），流式推给浏览器。
import { getPosts } from "@/lib/data";
// 注意：下面这个 import 是客户端组件。RSC 可以直接把客户端组件当子元素用，
// 甚至把服务端拿到的数据作为 props 传给它——但不能反过来（客户端组件不能
// import 服务端模块，也不能接收"函数/类实例"这类不可序列化的 props）。
import LikeButton from "./LikeButton";

// async 组件：React 19 支持直接渲染 Promise（配合 Suspense 流式输出）
export default async function Home() {
  const posts = await getPosts(); // 直接在组件体里等数据——RSC 专属能力

  return (
    <main style={{ maxWidth: 640, margin: "48px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>第 31 课 · Next.js 服务端组件</h1>
      <p>
        你现在看到的这段文字和列表，是 Node 服务器执行本组件后吐出的 HTML。
        查看&ldquo;网页源代码&rdquo;（⌘U）能直接看到文章标题——纯 SPA 里源代码只有一个空 div。
      </p>

      <section>
        <h2>文章列表（服务端直接 await 数据）</h2>
        <ul>
          {posts.map((post) => (
            <li key={post.id} style={{ margin: "12px 0" }}>
              <strong>{post.title}</strong>
              <p style={{ color: "#666", margin: "4px 0 0" }}>{post.excerpt}</p>
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: 32, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
        <h2>交互岛（客户端组件）</h2>
        {/* 服务端组件把初始数据/静态内容传给客户端组件 */}
        <LikeButton initialLabel="点我试试水合" />
      </section>
    </main>
  );
}
