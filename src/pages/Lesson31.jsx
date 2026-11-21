// 第 31 课页面 · Next.js 与服务端组件导论
//
// 本文件教什么：
//   1. 这是课程的"新篇章第一页"：前 30 课你一直在写纯前端 SPA
//      （所有代码下载到浏览器，没有服务器帮你跑组件）；
//      本课引入 Next.js 的 RSC 心智模型——组件默认在服务器上渲染成 HTML，
//      浏览器只收结果。本页面本身仍是我们熟悉的 SPA 页，
//      但它会给你一张"两个世界"的对照地图；
//   2. 页面结构：心智模型对照表 → 怎么跑子项目 → 文件导读 → 迁移判断；
//   3. 回扣第 3 课（react-router）：同样是"路由"，两个框架的答案完全不同。
import './lesson31.css'

// RSC vs SPA 对照表：四个最影响日常开发的维度
const COMPARE = [
  {
    dim: '渲染位置',
    spa: '浏览器：下载全部 JS → 执行组件函数 → 生成 DOM',
    rsc: '服务器：组件在 Node 里执行 → 吐出 HTML 流 → 浏览器直接显示',
  },
  {
    dim: '数据获取',
    spa: 'useEffect + setState + loading 三件套，异步期间白屏/骨架自己写',
    rsc: 'async 组件里直接 await 数据源，Suspense/loading.tsx 自动出骨架',
  },
  {
    dim: '交互成本',
    spa: '所有组件都带 JS，点不点交互都要下载（"人人都是客户端组件"）',
    rsc: '默认零 JS，只有标了 "use client" 的岛才进 bundle（按需水合）',
  },
  {
    dim: '路由方式',
    spa: 'react-router：<Routes> 声明映射，文件随你放，路由是运行时配置',
    rsc: 'App Router：文件即路由（page.tsx），layout/loading 等约定分工',
  },
]

// 本子项目的文件导读：每个文件教一件事
const FILES = [
  { file: 'next-app/src/lib/data.ts', what: '模拟数据库：返回 500ms 后 resolve 的 Promise，纯服务端模块' },
  { file: 'next-app/src/app/page.tsx', what: 'RSC 教学主页：async 组件直接 await 数据，服务端渲染成 HTML' },
  { file: 'next-app/src/app/loading.tsx', what: 'Suspense 骨架：数据未就绪时被流式推给浏览器' },
  { file: 'next-app/src/app/LikeButton.tsx', what: "'use client' 交互岛：useState + 水合边界的最小示例" },
  { file: 'next-app/src/app/layout.tsx', what: '根布局：中文 metadata（SEO）+ 所有路由共享的外壳' },
]

// SPA → Next 的迁移判断：满足任意一条就值得认真考虑
const MIGRATE_SIGNALS = [
  '页面内容主要靠"拉数据再渲染"，首屏一直空着等接口',
  'SEO 重要：希望爬虫直接看到内容，而不是执行 JS 后才看到',
  '大量"纯展示"组件也在付 JS 下载/执行成本，包体积越来越大',
  '需要后端能力：数据库直连、密钥安全、服务端缓存',
]

function Lesson31() {
  return (
    <div className="page">
      <h1 className="page-title">第 31 课 · Next.js 与服务端组件导论</h1>
      <p className="hint">
        前 30 课是 SPA 世界；从本课起看向另一个世界：组件默认跑在服务器上。
        理论看本页，代码看 next-app/ 子项目，动手跑起来见下方命令。
      </p>

      <div className="card">
        <h2>一、RSC vs SPA 心智模型对照表</h2>
        <table className="l31-table">
          <thead>
            <tr>
              <th>维度</th>
              <th>SPA（第 1–30 课）</th>
              <th>Next.js RSC</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE.map((row) => (
              <tr key={row.dim}>
                <td>{row.dim}</td>
                <td>{row.spa}</td>
                <td>{row.rsc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>二、怎么跑本课的 next-app 子项目</h2>
        <p>
          next-app 是仓库根下的<strong>独立子项目</strong>，有自己的 package.json 和
          node_modules，<strong>不在主项目的 package.json 里</strong>——不要在仓库根 npm install
          它的依赖，也不要从主项目的 import 它的代码。
        </p>
        <pre className="l31-code">cd next-app{'\n'}npm install{'\n'}npm run dev   # 默认 3000 端口，npm run dev -- -p 3100 可换端口</pre>
        <p className="hint">
          打开 http://localhost:3100 实测三件事：① 刷新页面，先闪 loading 骨架再出文章
          （服务端重新 fetch + Suspense 流）；② 右键"查看网页源代码"能直接看到文章标题
          （SSR 的证据，SPA 里源码只有空 div）；③ 点 LikeButton，点赞数 +1（水合后才有交互）。
        </p>
      </div>

      <div className="card">
        <h2>三、子项目文件导读</h2>
        <ul className="l31-files">
          {FILES.map((f) => (
            <li key={f.file}>
              <code>{f.file}</code> —— {f.what}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>四、SPA 什么时候该迁 Next？</h2>
        <p>不是所有项目都要迁。出现以下信号时，迁移收益才开始大于成本：</p>
        <ul className="l31-signals">
          {MIGRATE_SIGNALS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="hint">
          反过来，纯工具型应用（本地优先、无 SEO 需求、交互极重，比如编辑器/画板）
          留在 SPA 世界往往更省心——RSC 的红利主要在"内容型"页面。
        </p>
      </div>
    </div>
  )
}

export default Lesson31
