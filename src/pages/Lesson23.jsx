// 第 23 课页面 · 动画与过渡：让界面"动"得得体
//
// 本文件教什么：
// 1. 页面编排：三张卡从易到难，正好是三种成本等级的动画方案——
//    ① FadeToggle：state 驱动 class 切换（进入过渡的最低成本方案，一行 CSS + 一个 state）；
//    ② ExitAnimation：退场动画（delayedUnmount——React 没有"退场中"状态，自己造一个）；
//    ③ ViewTransitionDemo：document.startViewTransition（浏览器级快照过渡，新 API + 降级）。
// 2. 铁律卡置顶：动画只动 transform/opacity（合成器线程，不触发布局/重绘）；
//    动 width/top/margin 每帧重排，是性能反模式。
// 3. 无障碍双闸门：prefers-reduced-motion 的 CSS 全局降级写在 lesson23.css 的
//    @media 里（拦 CSS 动画）；JS 侧闸门在 ViewTransitionDemo 里（拦快照动画）。

import FadeToggle from '../components/lesson23/FadeToggle.jsx'
import ExitAnimation from '../components/lesson23/ExitAnimation.jsx'
import ViewTransitionDemo from '../components/lesson23/ViewTransitionDemo.jsx'
import './lesson23.css'

function Lesson23() {
  return (
    <div className="page">
      <header>
        <h1>第 23 课：动画与过渡 —— 让界面动得得体</h1>
        <p>
          动画不是为了炫技，是给状态变化一个"可解释的过程"：元素从哪来、到哪去、
          现在正在发生什么。本课三种武器按成本从低到高：CSS transition（class 切换）、
          delayedUnmount（自己造"退场中"状态）、View Transitions（浏览器快照）。
          讲义见 <code>doc/lesson-23.md</code>。
        </p>
      </header>

      {/* 铁律卡：整课最重要的一段话，置顶 */}
      <section className="card l23-rule-card">
        <h2>⚖️ 本课铁律</h2>
        <p>
          <strong>动画只动 transform 和 opacity。</strong>这两个属性的变化完全在浏览器的
          合成器线程（compositor）完成：布局不变、像素不用重画，只是图层被平移/缩放/
          透明化——主线程再忙动画也不掉帧。
        </p>
        <ul>
          <li className="l23-do">
            ✅ 放心动：<code>transform</code>（translate / scale / rotate）与 <code>opacity</code>
          </li>
          <li className="l23-dont">
            ❌ 别动：<code>width / height / top / left / margin</code>——每改一帧都要重新计算
            layout 再逐像素 paint，列表一大就卡。"height 收缩"这类真需求用 FLIP 等技巧绕，
            见 doc「性能注意」
          </li>
          <li className="l23-do">
            ✅ 尊重 <code>prefers-reduced-motion</code>：系统开了"减少动态效果"就别硬塞动画
            （前庭功能障碍用户会被位移动画引发眩晕）。全局降级写在{' '}
            <code>lesson23.css</code> 的 <code>@media</code> 里，快照动画的降级闸门在
            ViewTransitionDemo 的 JS 里
          </li>
        </ul>
      </section>

      <section className="card">
        <h2>① 进入过渡：state 驱动 class 切换（FadeToggle）</h2>
        <FadeToggle />
      </section>

      <section className="card">
        <h2>② 退场动画：delayedUnmount（ExitAnimation）</h2>
        <ExitAnimation />
      </section>

      <section className="card">
        <h2>③ 整块平滑切换：View Transitions（ViewTransitionDemo）</h2>
        <ViewTransitionDemo />
      </section>
    </div>
  )
}

export default Lesson23
