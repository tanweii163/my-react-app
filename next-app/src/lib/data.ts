// 第 31 课 · lib/data.ts —— 模拟"服务器端数据源"
//
// 本文件教什么：
//   1. 在真实项目里，RSC 的数据通常来自数据库或内网 API——它们运行在服务器上，
//      浏览器根本"看不见"这些代码，所以可以安全地放数据库密码、内网地址；
//   2. 这里用 setTimeout(500ms) 模拟一次有延迟的查询，
//      目的是让下一节 loading.tsx 的 Suspense 流（骨架屏）能被肉眼看到：
//      如果数据是同步返回的，你永远看不到 loading。
//   3. 铁律：这个文件没有任何 'use client'，它就是服务端代码；
//      客户端组件如果 import 它，Next 会直接报错——这正是 RSC 的安全边界。

export interface Post {
  id: number;
  title: string;
  excerpt: string;
}

// 模拟数据库里的三篇文章
const POSTS: Post[] = [
  { id: 1, title: "什么是服务端组件", excerpt: "组件在服务器上渲染成 HTML，浏览器只收到结果，不收到实现。" },
  { id: 2, title: "为什么要区分服务端与客户端", excerpt: "默认服务端：零 JS 成本；需要交互时才显式声明 'use client'。" },
  { id: 3, title: "App Router 的文件约定", excerpt: "page 负责路由内容，layout 负责共享外壳，loading 负责加载骨架。" },
];

// 返回 Promise：RSC 里可以直接 await 它（见 app/page.tsx）。
// 易错点：SPA 里你会写 useEffect + setState 来"等"这个 Promise，
// 因为 SPA 的所有代码都跑在浏览器里，没人帮你提前算好——这正是两者的分水岭。
export function getPosts(): Promise<Post[]> {
  // Promise.withResolvers：比 new Promise((resolve) => …) 更平铺直叙的写法
  const { promise, resolve } = Promise.withResolvers<Post[]>();
  setTimeout(() => resolve(POSTS), 500); // 模拟 500ms 的数据库/网络延迟
  return promise;
}
