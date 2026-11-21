// 第 37 课页面 · framer-motion 动效库 —— 页面编排 + 选型卡
//
// 本文件教什么：
// 1. 选型卡（置顶）：动画方案的升级链是"CSS 够用就不上库"。CSS transition 覆盖
//    两态视觉过渡；一旦需求是【退场动画 / 手势与中断重定向 / layout 补间 / 多元素
//    编排】之一，CSS 要么做不了、要么要工程（第 23 课 delayedUnmount 就是
//    "CSS 做不了退场"的补丁），此时上库才是花对钱。
// 2. bundle 代价一句话：库不是免费的——framer-motion 14 实测约 53KB gzip（按需
//    import { motion }），全量 88KB，用 LazyMotion 可压到约 35KB（详见 doc）。
//    一个页面只有一两个 hover 过渡？用第 23 课的 CSS，别开这辆车。
// 3. MotionConfig reducedMotion="user"（本页所有动效都包在它里面）：
//    系统开了"减少动态效果"（prefers-reduced-motion: reduce）时，transform/layout
//    动画自动跳过、直接落终态，opacity/颜色动画保留（褪色不致眩晕，位移动画会）。
//    第 23 课的 CSS 降级要在 @media 里手写；库把这件事变成一行配置——
//    【但它只管库自己的动画】，页面里纯 CSS 的动画仍要 @media 自己拦（见 lesson23.css）。

import { MotionConfig } from 'framer-motion'
import MotionBasics from '../components/lesson37/MotionBasics.jsx'
import ExitList from '../components/lesson37/ExitList.jsx'
import LayoutAnimation from '../components/lesson37/LayoutAnimation.jsx'
import './lesson37.css'

export default function Lesson37() {
  return (
    // reducedMotion="user"：跟随用户系统设置。"always"= 无条件降级（调试用），
    // false = 无视设置硬播动画（无障碍反面教材，别用）。
    <MotionConfig reducedMotion="user">
      <article className="page">
        <header>
          <h1>第 37 课 · framer-motion 动效库</h1>
          <p>
            第 23 课证明了 CSS 能覆盖大半动效需求，也留了三样做不了（或要做工程）的：
            退场动画、可中断的手势、布局补间。本课用 framer-motion 把这三样降回
            "声明式 props"——同时守住选型底线：<strong>CSS 够用的地方不上库</strong>。
            讲义见 <code>doc/lesson-37.md</code>。
          </p>
        </header>

        {/* 选型卡：什么时候 CSS 够用，什么时候上库 */}
        <section className="card l37-picker">
          <h2>🧭 选型卡：CSS 还是库？</h2>
          <div className="l37-pick-cols">
            <div>
              <h4>✅ CSS 够用（第 23 课）</h4>
              <ul>
                <li>两态视觉过渡：hover / focus / 展开，一个 class 切换搞定；</li>
                <li>进入过渡：state 驱动 class，opacity/transform 渐变；</li>
                <li>不需要退场动画（元素删了就删了）；</li>
                <li>动画不会被打断重定向；单元素，无编排需求。</li>
              </ul>
            </div>
            <div>
              <h4>📦 该上库了</h4>
              <ul>
                <li>退场动画：卸载时机要有人管 → AnimatePresence + exit；</li>
                <li>手势 + 中断重定向 → whileHover / whileTap + spring；</li>
                <li>布局补间（换位 / 展开收起）→ layout / layoutId；</li>
                <li>多元素编排（错峰、队列）→ variants + staggerChildren。</li>
              </ul>
            </div>
          </div>
          <p className="hint">
            💰 bundle 代价：按需导入 <code>motion/AnimatePresence</code> 约 +53KB gzip（全量
            88KB，LazyMotion 可到 35KB），CSS 方案是 0KB——上库前先问"这个页面配吗"。
            ♿ 本页所有动效包在 <code>&lt;MotionConfig reducedMotion=&quot;user&quot;&gt;</code>{' '}
            里：系统"减少动态效果"开启时 transform/layout 动画自动跳过、直接落终态
            （opacity/颜色保留）——对应第 23 课手写的 @media 降级，这里一行配置搞定，
            但只管库动画，CSS 动画仍需 @media 自己拦。
          </p>
        </section>

        <section className="card">
          <h2>① motion 基础：initial/animate/transition · 手势 · variants 编排</h2>
          <MotionBasics />
        </section>

        <section className="card">
          <h2>② 退场动画：AnimatePresence 对照第 23 课手写 delayedUnmount</h2>
          <ExitList />
        </section>

        <section className="card">
          <h2>③ 布局动画：layout 自动补间 · layoutId 共享元素过渡</h2>
          <LayoutAnimation />
        </section>
      </article>
    </MotionConfig>
  )
}
