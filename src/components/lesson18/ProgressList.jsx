// 第 18 课 · 进度列表 —— 两个组件读同一个 store
//
// 本文件教什么：
//   1. 组件里 useProgressStore() 不需要任何 Provider 包裹——import 即用，
//      这是它和第 6 课 Context 最大的用法差异（Context 得先 <ThemeProvider> 包住）;
//   2. 选择器订阅：勾选列表订阅整个 progress（要渲染每一条），
//      统计条只订阅 doneCount（数字）——store 一变，zustand 会逐个跑选择器，
//      结果没变的组件（Object.is 相等）不重渲染；
//   3. persist 生效性可以直接实测：勾几课 → 刷新页面 → 勾选还在。
import useProgressStore, { selectDoneCount, LESSON_IDS } from './progressStore.js'

// 统计条：只订阅 doneCount 这一个数字。
// 教学点：哪怕 store 里 progress 对象换了新引用，只要算出来的数字没变，
// 这个组件就不会重渲染——选择器是 zustand 的"省渲染阀门"。
function ProgressSummary() {
  const doneCount = useProgressStore(selectDoneCount)
  return (
    <div className="l18-summary row">
      <span className="big-number">{doneCount}</span>
      <span>已完成 {doneCount} / 15 课 · 我只订阅 doneCount 一个数字</span>
    </div>
  )
}

// 单行勾选：选择器只订阅本课那一小条进度。
function ProgressRow({ id }) {
  // 选择器订阅：只挑本课那一小条。别的课变化时这条不重渲染——
  // 对比第 6 课 Context：value 一变全体消费者重渲染，没有这种"挑一块"的能力。
  // 易错点对照：不传选择器（useProgressStore()）拿到的是【整个 state】
  // （{ progress, toggle, markAll, reset }），直接 progress[id] 会取到 undefined。
  const item = useProgressStore((s) => s.progress[id])
  return (
    <li className={item.done ? 'done' : ''}>
      <label>
        <input type="checkbox" checked={item.done} onChange={() => useProgressStore.getState().toggle(id)} />
        第 {id} 课{item.done ? ' ✅' : ''}
      </label>
    </li>
  )
}

// 列表本体：勾选 + 统计条 + 全部完成 + 重置。
// 注意 ProgressSummary 是"另一个组件读同一个 store"——
// 在这勾一课，上面统计条的数字立刻变：这就是跨组件同步，中间没有 props 也没有 Provider。
export default function ProgressList() {
  return (
    <div className="card">
      <h2>我的学习进度（persist 到 localStorage）</h2>
      <ProgressSummary />
      <ul className="l18-list">
        {LESSON_IDS.map((id) => (
          <ProgressRow key={id} id={id} />
        ))}
      </ul>
      <AllDoneButtons />
    </div>
  )
}

// 把批量操作拆成小组件：它订阅的也是同一个 store，
// 演示"一个 store、多个组件、任意层"都能直接用，互不拖家带口。
function AllDoneButtons() {
  return (
    <div className="row">
      <button onClick={() => useProgressStore.getState().markAll()}>全部完成</button>
      <button onClick={() => useProgressStore.getState().reset()}>重置进度</button>
      <span className="hint">重置后刷新页面——重置结果同样会被 persist 记住</span>
    </div>
  )
}
