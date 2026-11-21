/*
 * 第 34 课 · TailwindCard —— 同一张"资源卡片"的两种写法并排对比
 *
 * 本文件教什么：
 *   1. utility-first 写法：所有样式都是写在 JSX 里的原子类（一个类只干一件事）；
 *   2. 与旁边用语义 class（App.css 的 .card）的同款卡片对照，直观感受两种哲学：
 *      - Tailwind：改样式不用离开 JSX、"看到类名就知道样式"，但标签会变长；
 *      - 语义 class：标签干净、样式可复用，但要在两个文件间来回跳；
 *   3. 取舍铁律（写在最后一张对比卡里）：小项目/原型用 Tailwind 快；
 *      复杂状态样式、团队强约定用语义 class 稳。
 */
import './tw.css'

// 一条假数据，两张卡片共用：保证对比时"内容一致，只比样式写法"。
const resource = {
  title: 'React 官方文档',
  desc: '最权威的学习路线：从 Describing the UI 到 Escape Hatches，配交互式示例。',
  tags: ['官方', '入门必读', '英文'],
}

/* ------------------------------------------------------------------ */
/* 写法 A：纯 Tailwind utilities                                        */
/* 每个类名 ↔ 一条 CSS 声明，例如：                                      */
/*   rounded-xl → border-radius: 0.75rem                                */
/*   border     → border-width: 1px（颜色默认 currentColor，要配 border-*色）*/
/*   shadow-sm  → box-shadow 小阴影                                      */
/*   gap-2      → gap: 0.5rem（数字 × 0.25rem，4 = 1rem 是高频值）        */
/* 取舍：看到类名就知道样式（不用跳 CSS 文件），代价是类名串很长——          */
// 官方解法是抽组件（把这段 JSX 包成 <ResourceCard/> 复用），而不是抽 CSS 类。
/* ------------------------------------------------------------------ */
function TailwindVersion() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900">{resource.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{resource.desc}</p>
      {/* 标签徽章组：flex + gap 是 Tailwind 最常用的布局组合 */}
      <div className="mt-3 flex gap-2">
        {resource.tags.map((t) => (
          <span
            key={t}
            className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700"
          >
            {t}
          </span>
        ))}
      </div>
      {/* hover:/focus-visible: 是状态前缀：默认态 + 冒号前写状态态，
          等价于 CSS 里写 .btn:hover {...}，但两条规则在同一处可读 */}
      <button className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
        前往学习
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* 写法 B：语义 class（App.css 已有的 .card / .hint）                    */
/* 标签干净，样式集中在 App.css；缺点：样式与结构分离，需来回跳文件。       */
/* ------------------------------------------------------------------ */
function SemanticVersion() {
  return (
    <div className="card">
      <h2>{resource.title}</h2>
      <p>{resource.desc}</p>
      {/* .row 是 App.css 的 flex 行容器，本课复用它，不为徽章新写样式 */}
      <div className="row" style={{ alignItems: 'center' }}>
        {resource.tags.map((t) => (
          <span
            key={t}
            style={{
              borderRadius: 999,
              background: '#e0e7ff',
              color: '#4338ca',
              padding: '2px 10px',
              fontSize: 12,
            }}
          >
            {t}
          </span>
        ))}
      </div>
      <button
        style={{
          marginTop: 12,
          borderRadius: 8,
          background: '#4f46e5',
          color: '#fff',
          padding: '8px 16px',
          border: 'none',
          fontSize: 14,
        }}
      >
        前往学习
      </button>
      <p className="hint">这张卡用 .card + 内联样式拼出同等视觉——为了公平对比不新增语义类。</p>
    </div>
  )
}

// 外层网格也用 Tailwind 写：md: 前缀 = 视口 ≥ 768px 时才生效的响应式变体。
export default function TailwindCard() {
  return (
    <section className="card">
      <h2>同一张卡片的两种写法</h2>
      <p>左边：纯 Tailwind utilities（类名即样式）；右边：项目原有的 .card 语义类。</p>
      <div className="grid gap-4 md:grid-cols-2">
        <TailwindVersion />
        <SemanticVersion />
      </div>
      <p className="hint">
        取舍结论：Tailwind 胜在"就地可见、随手改"；语义类胜在"标签干净、一处改名全局生效"。
      </p>
    </section>
  )
}
