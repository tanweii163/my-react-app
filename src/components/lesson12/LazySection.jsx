// 本文件教什么：React.lazy + Suspense 的标准用法，以及"lazy 生效的时机"。
//
// 三个关键事实，对应下面三处代码：
// 1. lazy(import()) 写在模块顶层：创建这个 lazy 包装几乎零成本——
//    此时并没有任何网络请求，import() 只是"被登记"了，还没被调用；
// 2. show=false 时 <HeavyChart /> 根本不在 JSX 树里 → import() 不被调用 →
//    网络里没有这个 chunk（开 DevTools → Network → 过滤 JS，亲自验证）；
// 3. 首次渲染时 chunk 还没下载完，渲染会"暂停"（suspense），
//    最近的 <Suspense> 用 fallback 顶住；下载完成 React 自动换成真组件。
//
// 易错：lazy() 必须放模块顶层（和组件定义同级）。
// 写进组件函数体的话，每次渲染都会创建一个"新的组件类型"，
// React 会把旧的卸载再重装——界面表现为每次 setState 都闪烁重挂载。

import { lazy, Suspense, useState } from 'react'

// lazy() 的参数是一个"返回 Promise<模块>"的函数，模块必须带 default export。
// import('./HeavyChart.jsx') 是 Vite 认识的特殊写法：构建时它指向的模块会被
// 单独拆成一个 chunk 文件（比如 HeavyChart-abc123.js），运行时按需下载。
const HeavyChart = lazy(() =>
  import('./HeavyChart.jsx').then((m) => {
    // 本地开发里 chunk 下载只要几毫秒，fallback 一闪而过甚至看不见。
    // 教学演示故意拖慢 800ms，让 Suspense 的 fallback 肉眼可见。
    // 真实项目不要这么写——它会让用户多等 800ms。
    return new Promise((resolve) => setTimeout(() => resolve(m), 800))
  }),
)

// fallback 用的骨架屏：把"未来内容的位置和大小"先占住，内容到位后页面不跳动。
// 骨架屏不是新 API，只是 fallback 的一种画法（灰块 + 微光动画，见 lesson12.css）。
// 高度大致照着真图表的形状给，占位才有意义。
const BAR_HEIGHTS = [40, 65, 50, 80, 60, 90, 70, 45, 85, 60, 95, 75]

function ChartSkeleton() {
  return (
    <div role="status" aria-label="图表加载中">
      <div className="chart-skeleton-title" />
      <div className="chart-skeleton-bars">
        {BAR_HEIGHTS.map((h, i) => (
          <div
            key={i}
            className="chart-skeleton-bar"
            style={{ height: `${h}%`, animationDelay: `${i * 0.08}s` }}
          />
        ))}
      </div>
      <p className="hint">图表 chunk 下载中…（演示里人为延迟了 800ms，方便观察 fallback）</p>
    </div>
  )
}

function LazySection() {
  // show 是"要不要首次挂载重组件"的开关。
  // false → 组件不在树里 → chunk 不下载。React.lazy 的生效时机就是"第一次被渲染"。
  const [show, setShow] = useState(false)

  return (
    <div>
      <div className="row">
        {/* 第一次点击：import() 才真正执行 → Network 里立刻多出 HeavyChart-xxxx.js。
            之后 chunk 只下载这一次（浏览器与模块系统都会缓存），
            React.lazy 也会记住模块，再挂载时直接同步可用、不再出 fallback。 */}
        <button onClick={() => setShow(true)} disabled={show}>
          加载重组件
        </button>
        {/* 卸载后可以再点上面的按钮：第二次挂载没有骨架屏——
            下载只发生一次，这一步最能体现"缓存后渲染零开销"。 */}
        <button onClick={() => setShow(false)} disabled={!show}>
          卸载
        </button>
      </div>

      {/* show=false：HeavyChart 不在 JSX 树里。现在打开 DevTools → Network →
          过滤 JS，列表里没有 HeavyChart 的 chunk——这就是"点之前网络里没有它"。 */}
      {!show && (
        <p className="hint">
          还没加载。先打开 DevTools 的 Network 面板（过滤 JS），再点"加载重组件"：
          会看到 HeavyChart-xxxx.js 恰好在点击那一刻才出现在列表里——这就是按需下载。
        </p>
      )}

      {show && (
        // 铁律：lazy 组件必须包在 Suspense 里。首次渲染时 chunk 还在路上，
        // 渲染暂停（suspense），最近的 Suspense 用 fallback 顶住；
        // Promise resolve 后 React 自动重试渲染、换回真组件，fallback 退场。
        // 忘了 Suspense 的后果：整棵树直接报错白屏（详见 doc/lesson-12.md 易错点 2）。
        <Suspense fallback={<ChartSkeleton />}>
          <div className="chart-box">
            <HeavyChart />
          </div>
        </Suspense>
      )}
    </div>
  )
}

export default LazySection
