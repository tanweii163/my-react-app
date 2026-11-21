// 第 31 课 · app/loading.tsx —— Suspense 流的"骨架"
//
// 本文件教什么：
//   1. 文件约定：与 page.tsx 同级的 loading.tsx 会被 Next 自动包进
//      <Suspense fallback={…}>——不用你手写 Suspense；
//   2. 当 page.tsx（async 服务端组件）还在 await 数据时，Next 先把这个
//      骨架【流式】推给浏览器：用户 0ms 就看到页面形状，而不是白屏；
//   3. 体验方式：刷新页面，先闪现骨架 → 500ms 后文章列表补齐。
//      把 lib/data.ts 的 setTimeout 调大（如 3000）可以看得更清楚。

export default function Loading() {
  return (
    <main style={{ maxWidth: 640, margin: "48px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif" }}>
      <h1>加载中…（Suspense 骨架，服务端流式推送）</h1>
      <div style={{ height: 16, background: "#eee", borderRadius: 4, marginBottom: 12 }} />
      <div style={{ height: 16, background: "#eee", borderRadius: 4, width: "80%", marginBottom: 12 }} />
      <div style={{ height: 16, background: "#eee", borderRadius: 4, width: "60%" }} />
    </main>
  );
}
