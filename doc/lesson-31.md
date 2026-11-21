# 第 31 课 · Next.js 与服务端组件导论

## 学习目标

- 建立 RSC（服务端组件）的心智模型：组件默认在服务器上执行，浏览器收到的是 HTML 结果，不是组件代码。
- 说清 Server Component 与 Client Component 的判定规则，理解 `'use client'` 是一条"水合边界"声明。
- 掌握 App Router 三个最核心的文件约定：`page.tsx` / `layout.tsx` / `loading.tsx`。
- 能把第 3 课的 react-router 路由与 App Router 的"文件即路由"对比出差异。
- 能判断一个 SPA 项目什么时候值得迁移到 Next.js。

## 核心概念

**RSC 改变的是"组件在哪跑"。** 前 30 课的 SPA 里，所有组件代码被打包成 JS 下载到浏览器，在用户电脑上执行。Next.js 的服务端组件反过来：组件函数在 Node 服务器上执行，执行完的 HTML（+ 数据）被流式送给浏览器。这意味着三件事：

1. **可以直接 await 数据**：`async function Page() { const data = await db.query() }` 是合法的组件——因为真的有服务器在跑它。SPA 里不行：你的代码只活在浏览器里，没人帮你提前算。
2. **服务端代码不会泄漏**：`lib/data.ts` 里的"数据库"根本不进客户端 bundle，密码、内网地址随便放。
3. **默认零交互成本**：服务端组件不往浏览器发 JS。需要交互（`useState`、`onClick`）的组件才显式写 `'use client'`，成为 bundle 里的"交互岛"。

**`'use client'` 是边界，不是标签。** 它必须写在文件最顶部，声明"从本文件起（含它 import 的模块）进入客户端世界"。方向是单向的：服务端组件可以 import 客户端组件并把可序列化的 props 传给它；客户端组件不能 import 服务端模块。

**水合（hydration）。** 首屏 HTML 是服务器吐的（秒开、可 SEO），但按钮点了没反应；等客户端 JS 下载并执行，React"接管"已有 DOM，页面才活过来。

### Server / Client Component 判定表

| 判定 | Server Component（默认） | Client Component（`'use client'`） |
|---|---|---|
| 能否 `useState` / `useEffect` / 事件处理器 | ❌ 不能（见下） | ✅ 全部可用 |
| 能否 `async/await` 数据源 | ✅ 直接 await | ❌ 只能用 useEffect / SWR / RSC 传入 props |
| 能否访问数据库 / 密钥 / 文件系统 | ✅（代码不进 bundle） | ❌（代码会发给用户） |
| 渲染时机 | 服务器上，请求时或构建时 | 服务器预渲染 HTML + 客户端水合 |
| 何时选它 | 展示内容、拉数据、SEO 页面 | 任何需要"响应用户"的局部 |

### RSC 为什么不能 useState？

一句话：**没有执行环境。** 服务端组件只在服务器上执行一次——执行完就把 HTML 送给浏览器，然后这个组件实例就不存在了。`useState` 存的状态需要"某个东西持续活着"来记住它并响应变化，但浏览器里根本没有这份组件的 JS 在跑（它没被发送，也不该被发送），服务器上也没有用户正在点击。所以 Hook 体系整体与 RSC 不兼容——不是 React 没实现，是物理上无处安放。需要状态，就在那个局部立一块"客户端岛"。

### App Router 文件约定表

| 文件 | 作用 | 类比第 3 课 |
|---|---|---|
| `page.tsx` | 该路由段的内容，唯一决定"URL 显示什么" | `<Route element>` |
| `layout.tsx` | 包住子路由的共享外壳，切路由时不重渲染 | 自己写一个 `<Layout>` + `<Outlet/>` |
| `loading.tsx` | 同级 page 未就绪时的 Suspense 骨架，自动包 `fallback` | 自己写 `<Suspense>` 或 loading state |
| 嵌套目录 `blog/page.tsx` | 目录即 URL 段（文件即路由） | `<Route path="blog">` |

## 代码导读（next-app/ 子项目）

- `next-app/src/lib/data.ts`：模拟数据库，`getPosts()` 返回 500ms 后 resolve 的 Promise——延迟是故意留的，为了肉眼看见 Suspense 骨架。
- `next-app/src/app/page.tsx`：RSC 主角。`async` 组件直接 `await getPosts()`，注释里写了"这在 SPA 里不行，因为没有服务器帮你跑"；它 import 客户端组件 `LikeButton` 并把 props 传下去。
- `next-app/src/app/loading.tsx`：数据未就绪时被流式推给浏览器的骨架屏。
- `next-app/src/app/LikeButton.tsx`：`'use client'` + `useState`，水合边界上的最小交互岛。
- `next-app/src/app/layout.tsx`：中文 metadata（SEO）+ `<html lang="zh-CN">` 根文档控制。

### 与第 3 课 react-router 的对比

react-router 回答的是"URL 变了该显示哪个组件"——它是运行时配置，路由表写在 JS 里，首次加载仍然要把整个应用（含所有路由的代码）拉下来。App Router 回答的是"URL 对应哪份**服务器资产**"——文件即路由，每个 `page.tsx` 是独立的服务端渲染单元，访问 `/blog` 不需要下载 `/about` 的任何代码；切路由时 Next 向服务器要新的 RSC payload，而不是在浏览器里换组件。两套东西不冲突：理解 react-router 的嵌套/Outlet，迁移到 layout 嵌套时是直译关系。

## 动手试一试

1. 在仓库根执行 `cd next-app && npm install && npm run dev`，打开 http://localhost:3100：刷新页面观察"骨架 → 内容"的 Suspense 流；右键查看网页源代码，确认文章标题直接在 HTML 里。
2. 把 `lib/data.ts` 的 `setTimeout` 改成 3000ms，再刷新：骨架停留更久，交互（LikeButton）不受影响——因为它是客户端岛，水合后独立于服务端数据。
3. 在 `page.tsx` 的服务端组件里试着加 `onClick={() => {}}` 或 `useState`，看 Next 给出的报错信息——读懂它，比记住规则更牢。

## 易错点

- **`'use client'` 不写文件顶部**：它前面只能有注释和 import 之外的空行吗？都不行——必须非常靠顶（前面只允许注释），写在函数中间是无效的普通字符串。
- **把 `'use client'` 当成"只在客户端渲染"**：客户端组件也会在服务器上做 SSR 预渲染（首屏 HTML 里就有它），只是额外需要水合。
- **客户端组件里 import 服务端模块**：直接构建报错。数据要"过界"，只能走 props（可序列化）。
- **在主仓库根安装 next-app 的依赖**：子项目有自己的 package.json / node_modules，`cd next-app && npm install` 才是正确姿势。
- **看不到 loading 骨架**：开发环境太快时骨架一闪而过；把模拟延迟调大即可（生产构建里这不是 bug）。

## 自测题

1. 服务端组件里能写 `async/await` 吗？为什么 SPA 里同样的写法不行？
2. `'use client'` 声明的是什么边界？客户端组件能不能 import `lib/data.ts`？
3. `loading.tsx` 和自己手写 `<Suspense fallback>` 是什么关系？
4. 一个页面 90% 是文章正文、10% 是点赞按钮，用 RSC 方案时浏览器要下载多少组件的 JS？

**答案**：1. 能；因为 RSC 真的在服务器上执行，await 数据源发生在 Node 里，浏览器只收结果；SPA 代码全在浏览器，没有服务器提前跑组件。2. 声明"从本文件起进入客户端 bundle"的水合边界；不能，只能通过可序列化的 props 接收数据。3. Next 自动把它包成同级 page 的 `<Suspense fallback>`，是语法糖。4. 只有 LikeButton 一个客户端组件（连同它的依赖）进 bundle，正文是零 JS 的 HTML。

## 下一课预告

第 32 课将深入 App Router 的数据获取：Server Actions、重新验证与缓存策略——让"服务端写数据库"也像调函数一样自然。
