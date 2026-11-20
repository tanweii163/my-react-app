// 第 25 课 · RoadMap —— 后续路线卡：毕业后的三条方向
//
// 本文件教什么：
// 1. "学完框架之后去哪"的决策框架：三条主流路线各自解决什么问题——
//    框架能力（Next.js/RSC）、平台广度（React Native）、影响力与作品（开源/作品集）；
// 2. 路线介绍永远配"第一个行动"：模糊的方向感没用，
//    能本周就动手的最小行动才有用（每张卡的 action 字段）；
// 3. 数据驱动的卡片布局：三张卡同一结构（badge + 导论 + 行动框），
//    JSX 只 map 一遍——要加第四条路线时只改数据。
const ROUTES = [
  {
    id: 'nextjs',
    tag: '方向一',
    title: 'Next.js 与 React Server Components',
    intro:
      '服务端组件（RSC）是什么：组件在服务器上渲染成 HTML 直接下发，默认不打进浏览器 JS 包——数据获取、重计算、密钥都在服务端完成，浏览器只收"结果"。与 SPA 的区别：你在这门课里写的 SPA 把整棵组件树 + JS 发到浏览器再渲染，首屏要等 JS 下载执行；Next.js 默认"服务端先干活"，需要交互的部分才标 \'use client\' 变回你熟悉的客户端组件（state、hooks、事件全部照旧）。也就是说：React 你已经学完了，Next.js 补的是"渲染发生在哪"与"路由/构建层"的工程能力。',
    action:
      '把本项目用 Next.js 重写首页和前 3 课：App Router 是"文件即路由"，和 main.jsx 的集中式路由表对比一遍，亲手感受两种路由组织；再把第 11 课的手写 fetch 换成服务端组件直连数据。',
  },
  {
    id: 'native',
    tag: '方向二',
    title: 'React Native：一次学习，多端交付',
    intro:
      'React Native 让你用同一套 React 知识（组件、props、state、hooks 全部复用）写 iOS / Android 应用：div/span 换成 View/Text，事件换成 onPress，样式换成 StyleSheet（默认 flex 布局）。心智上只有两件新事：没有 CSS 全部样式属性、以及"原生控件"的交互手感与 Web 不同。React 课的性价比在这里兑现——学一次，Web 和 App 两头用。',
    action:
      '装 Expo（React Native 官方脚手架），把第 1 课的 TodoList 原样搬进手机模拟器：useState、列表渲染、受控 input 一行不用改，只需要替换标签名和样式写法——体验"知识平移"。',
  },
  {
    id: 'portfolio',
    tag: '方向三',
    title: '开源贡献与作品集',
    intro:
      '学完最好的证据是作品，不是结业证书。作品集的第一条目可以就是本项目：这门课程本身（25 个页面 + 配套讲义）按第 24 课的方法 build + 部署上线，就是一份能点开、能交互、有源码的展示。开源贡献是第二步：你已经在第 16–18 课真实用过 TanStack Query、RHF、Zustand——给它们提一个复现良好的 issue、或修一个 docs 错字，都是真实贡献； contribution 的门槛比想象中低，价值在于"公开地、可验证地写出正确的东西"。',
    action:
      '按第 24 课流程给本项目执行 npm run build 并部署到静态托管，让在线地址出现在简历上；然后在 README 里补一段截图 + 功能清单 + 部署链接，作为作品集第一篇。',
  },
]

export default function RoadMap() {
  return (
    <section className="card l25-roadmap">
      <h2>🧭 后续学习路线</h2>
      <p className="hint">
        三条方向不互斥，但别同时走：挑一条，先完成它的"第一个行动"，
        有了手感再决定要不要换道。
      </p>
      <div className="l25-route-grid">
        {ROUTES.map((route) => (
          <article key={route.id} className="l25-route">
            <h3>
              <span className="l25-route-tag">{route.tag}</span>
              {route.title}
            </h3>
            <p className="l25-route-intro">{route.intro}</p>
            <div className="l25-route-action">
              <span className="l25-action-label">第一个行动</span>
              {route.action}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
