/*
 * 第 34 课页面 · Tailwind CSS —— utility-first 与语义 class 的双轨对照
 *
 * 本文件教什么：
 *   1. 页面只做编排（第 22 课原则）：两张对比卡 + 选型结论卡 + 双轨现状说明卡；
 *   2. "双轨"是本项目的真实状态：全局 App.css 的语义类（.card/.row/.hint）
 *      服务第 1–30 课，本课的 utilities 只在本课组件里出现——
 *      两种方案可以在同一项目共存，边界就是"这页的样式归谁管"。
 */
import TailwindCard from '../components/lesson34/TailwindCard.jsx'
import UtilityPatterns from '../components/lesson34/UtilityPatterns.jsx'
// 注意：tw.css 已由 TailwindCard 导入；页面级组件不重复导入（CSS 全局唯一，导一次即可）。

export default function Lesson34() {
  return (
    <div className="page">
      <header>
        <h1>第 34 课 · Tailwind CSS</h1>
        <p>
          utility-first 的哲学、粒度导入与 preflight 的恩怨、以及"什么时候该用语义 class"。
        </p>
      </header>

      {/* 对比卡：同一张资源卡片，Tailwind 写法 vs .card 语义写法 */}
      <TailwindCard />

      {/* 常用模式速查：状态前缀 / 任意值 / 容器查询 / 条件拼接的坑 */}
      <UtilityPatterns />

      {/* 选型结论卡：不是"谁取代谁"，而是"各自的舒适区" */}
      <section className="card">
        <h2>选型结论：什么时候用哪个</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <h3 className="font-bold text-emerald-800">适合 Tailwind 的场景</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-900">
              <li>快速原型：调样式不用建文件、不用想类名，堆 utilities 即所见即所得</li>
              <li>设计系统统一的团队：间距/颜色/字号全走 theme 令牌，天然不跑偏</li>
              <li>样式高度局部的组件：卡片、徽章、按钮这类"一处定义一处用"</li>
            </ul>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="font-bold text-amber-800">语义 class 更好的场景</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
              <li>复杂状态机样式：is-open / is-loading / 三态切换，语义类一眼读懂</li>
              <li>团队约定强、多人长期维护：.card 比 12 个 utilities 的串好评审</li>
              <li>需要覆盖第三方/全局样式：语义类选择器写覆盖规则更直观</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 双轨现状卡：本项目的真实选择 */}
      <section className="card">
        <h2>本项目的双轨现状</h2>
        <p>
          第 1–30 课全部使用 App.css 的语义类（<code>.card</code> / <code>.row</code> /{' '}
          <code>.hint</code>），因为它们共享一套全局视觉语言；本课引入 Tailwind utilities，
          但只通过 <code>lesson34/tw.css</code> 的**粒度导入**（theme + utilities，不含 base
          层）进入页面——CSS 加载后不随路由卸载，所以宁可少导，绝不引入会污染其他 30 课的
          preflight 全局重置。
        </p>
        <p className="hint">
          打开 /lesson/2 抽查一下：如果那边卡片背景变了，就说明有人把 base 层导进来了——
          这正是本课要防住的事故。
        </p>
      </section>
    </div>
  )
}
