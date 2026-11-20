// 第 12 课页面：代码分割与懒加载
//
// 本文件教什么：
// 默认情况下，构建工具把所有页面、组件、第三方库打进一个 JS 文件（bundle），
// 用户必须把整个文件下载并解析完才能看到首屏——代码越多，白屏越久。
//
// React.lazy(() => import('./X')) 提供了另一种选择：
// 把某个组件单独拆成一个 chunk，推迟到它"第一次被渲染"时才下载；
// 下载期间由 <Suspense fallback={...}> 顶住界面。
//
// 本页三个演示区：
// 1. "一个 bundle 的代价"——问题的本质，以及什么样的代码值得拆出去；
// 2. LazySection——亲手点按钮，在 Network 里看着 chunk 凭空出现；
// 3. 速记卡——lazy/Suspense 的四条规则 + fallback 与 loading 状态的区别
//    （详细展开在 doc/lesson-12.md）。
//
// 页面组件本身没有任何 state/effect：分割逻辑全部封装在 LazySection 里，
// 页面只负责排版。这是刻意的——"哪里 lazy"应该离"哪里用"最近，
// 页面层只需要知道有这么一个按需加载的区块。

import LazySection from '../components/lesson12/LazySection.jsx'
// 专属样式放本文件 import（骨架屏动画、图表容器），与第 10 课的 lesson10.css 同一惯例；
// 通用布局仍复用 App.css / index.css
import './lesson12.css'

function Lesson12() {
  return (
    <div className="page">
      <header>
        <h1>第 12 课：代码分割与懒加载</h1>
        <p>
          默认所有代码打进一个 bundle，首屏变慢；
          <code>React.lazy</code> 让组件在首次渲染时才下载自己的 chunk，
          <code>Suspense</code> 的 fallback 接住加载期。讲义见{' '}
          <code>doc/lesson-12.md</code>。
        </p>
      </header>
      <main>
        <section className="card">
          <h2>① 一个 bundle 的代价</h2>
          <p>
            本项目 14 个课页面在 <code>main.jsx</code> 里全部静态 import，
            构建后它们全在同一个 chunk 里；真实项目再加上图表、编辑器这类重型依赖，
            主包轻松上 MB——用户等的是"首屏根本用不到的代码"。
          </p>
          <p>
            判断标准：<strong>首屏用不到、且只有部分用户会用</strong>的代码，
            才值得拆出去（重组件、低频页面）。代码分割不减少总下载量，
            只改变"什么时候下载"。
          </p>
        </section>

        <section className="card">
          <h2>② 点按钮，看着 chunk 凭空出现</h2>
          <p className="hint">
            操作顺序：F12 打开 DevTools → Network 面板 → 过滤 JS → 刷新页面 →
            点下面的按钮。观察三点：点之前网络里没有 HeavyChart；点击瞬间它出现；
            卸载后再加载，不再有新请求、也不再有骨架屏。
          </p>
          <LazySection />
        </section>

        <section className="card">
          <h2>③ 速记卡</h2>
          <p>
            <strong>四条规则：</strong>
            ① <code>lazy()</code> 写在模块顶层，参数是"返回 Promise&lt;模块&gt;"的函数；
            ② 被拆的模块必须 <code>default export</code>；
            ③ lazy 组件必须包在 <code>&lt;Suspense&gt;</code> 里；
            ④ chunk 只下载一次，之后渲染零开销。
          </p>
          <p>
            <strong>fallback ≠ loading 状态：</strong>
            loading 是你自己 <code>useState</code> 的布尔值、自己写 if 分支（第 2 课的
            fetch 四件套），适合数据请求、能保留旧数据；
            fallback 是 React 在渲染暂停时自动接住的机制，没有任何 state，
            适合"组件还没到"（lazy chunk）。前者你管理过程，后者 React 管理机制。
          </p>
          <p className="hint">
            路由级分割（每个页面一个 chunk）收益最大——写法见{' '}
            <code>doc/lesson-12.md</code> 对 <code>main.jsx</code> 的讲解
            （该文件由父代理统一维护，本课只讲不改）。
          </p>
        </section>
      </main>
    </div>
  )
}

export default Lesson12
