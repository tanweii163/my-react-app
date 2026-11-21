/*
 * 第 34 课 · UtilityPatterns —— 常用模式速查：响应式 / 状态 / 任意值 / 条件拼接
 *
 * 本文件教什么：
 *   1. hover: / focus-visible: 状态前缀（现场可点）；
 *   2. 任意值语法 bg-[#1f2430]：方括号里写任何字面量，JIT 现场生成；
 *   3. 响应式前缀为什么在本课只能"注释演示"：sm:/md: 看的是**视口**宽度，
 *      dev 窗口太大时看不到效果 → 更适合卡片的替代品是容器查询 @container；
 *   4. 最容易踩的坑：字符串模板拼 class（`bg-${color}-600`）会被 JIT 静态扫描漏掉
 *      → 正确做法是维护"完整类名列表"的映射对象。
 */
import { useState } from 'react'
import './tw.css'

/* ================================================================== */
/* 坑：模板字符串拼类名                                                 */
/* 反例（别学）：                                                       */
//   const cls = `bg-${color}-600`   // 源码里不存在 "bg-emerald-600" 这个完整词
//                                   // JIT 扫描源码按"整类名"匹配，扫不到 → 不生成 CSS
//                                   // 运行时类名对、样式缺失，还是"静默失败"，最难查
/* 正解：映射表里写**完整类名**，保证每个值都以字面量出现在源码里。        */
/* ================================================================== */
const BUTTON_COLORS = {
  indigo: 'bg-indigo-600 hover:bg-indigo-700',
  emerald: 'bg-emerald-600 hover:bg-emerald-700',
  rose: 'bg-rose-600 hover:bg-rose-700',
}

function ThemedButton({ color, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-colors ${BUTTON_COLORS[color]}`}
    >
      {children}
    </button>
  )
}

// 容器查询演示：@container 声明"以我这个盒子为参照"，@md: 前缀看的是容器宽度
// 而不是视口宽度——卡片级响应式的正解（dev 里拖窄窗口就能看到布局变化）。
export default function UtilityPatterns() {
  const [color, setColor] = useState('indigo')

  return (
    <section className="card">
      <h2>常用模式速查</h2>

      {/* 模式 1：状态前缀。focus-visible 用 Tab 键聚焦时才出现（只服务键盘用户，
          鼠标点击不触发——比裸 :focus 更克制，是第 26 课 a11y 的好搭档）。 */}
      <div className="mt-3">
        <h3 className="text-sm font-bold text-slate-700">① 状态前缀 hover: / focus-visible:</h3>
        <input
          placeholder="Tab 到我试试 focus-visible 的光环"
          className="mt-1 w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:border-indigo-500 focus-visible:outline-2 focus-visible:outline-indigo-500"
        />
        <button className="ml-2 rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-600 focus-visible:outline-2 focus-visible:outline-slate-800">
          hover 我变色
        </button>
      </div>

      {/* 模式 2：任意值语法。设计令牌没覆盖到的"一次性值"用方括号现场写。
          注意：值也要是完整字面量，方括号内容同样被静态扫描。 */}
      <div className="mt-4">
        <h3 className="text-sm font-bold text-slate-700">② 任意值语法 bg-[#1f2430]</h3>
        <div className="mt-1 inline-block rounded-lg bg-[#1f2430] px-4 py-2 font-mono text-sm text-[#7ee787]">
          #1f2430 / #7ee787 —— 项目色，不在 Tailwind 默认调色板里
        </div>
      </div>

      {/* 模式 3：容器查询。sm:/md: 看视口，@md: 看最近的 @container 祖先。 */}
      <div className="mt-4">
        <h3 className="text-sm font-bold text-slate-700">
          ③ 响应式：sm:/md: 看视口，卡片内请用容器查询 @container
        </h3>
        {/* @container 类名（v4 写法 container-type: inline-size）声明参照盒 */}
        <div className="@container mt-1 resize overflow-hidden rounded-lg border border-dashed border-slate-300 p-2">
          <div className="flex flex-col gap-2 @md:flex-row @md:items-center">
            <span className="text-sm text-slate-600">拖右下角拉伸我 →</span>
            <span className="w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 @md:mt-0">
              容器 ≥ 28rem 时变横排
            </span>
          </div>
        </div>
        <p className="hint">
          视口前缀（sm:/md:）在本课对比卡里用了一次，但 dev 窗口通常够宽、看不出变化——
          想现场体验响应式，容器查询是更适合卡片场景的替代品。
        </p>
      </div>

      {/* 模式 4：条件拼接的正解——完整类名映射表。 */}
      <div className="mt-4">
        <h3 className="text-sm font-bold text-slate-700">④ 条件拼接的坑：完整类名映射（正解）</h3>
        <div className="row mt-1" style={{ alignItems: 'center' }}>
          {Object.keys(BUTTON_COLORS).map((c) => (
            <ThemedButton key={c} color={c} onClick={() => setColor(c)}>
              选 {c}
            </ThemedButton>
          ))}
          <span
            className={`rounded-lg px-3 py-1.5 text-sm text-white ${BUTTON_COLORS[color].split(' ')[0]}`}
          >
            当前：{color}
          </span>
        </div>
        <p className="hint">
          反例教训：`bg-${color}-600` 这种模板拼接，源码里没有完整类名，JIT 扫描不到就不会生成
          CSS。铁律：**Tailwind 类名必须以完整字面量出现在源码里**，动态选择用映射表。
        </p>
      </div>
    </section>
  )
}
