// 本文件教什么：第 9 课页面——渲染机制与性能优化。
// 页面结构：先用两句话建立"何时重渲染、重渲染≠重绘"的心智模型，
// 然后交给 PerfDemo 做三段对比演示（裸子组件 / memo 组合拳 / 心态与 key）。
import PerfDemo from '../components/lesson9/PerfDemo.jsx'
import './lesson9.css'

function Lesson9() {
  return (
    <div className="page">
      <header>
        <h1>第 9 课：渲染机制与性能优化</h1>
        <p>
          组件什么时候重渲染？重渲染 ≠ 重绘 DOM。
          先建立心智模型，再用渲染计数器实测：谁重渲染了、谁被 memo 拦下了。
        </p>
      </header>
      <main>
        <div className="card">
          <h2>先记住两条铁律</h2>
          <p>
            <b>组件何时重渲染：</b>① 自己的 state 变了；② 父组件重渲染了（且它没被 memo，或 memo 的 props 变了）。
            没有第三种。props 变化本身不会"直接"导致重渲染——是父组件重渲染顺带重新执行了子组件函数。
          </p>
          <p>
            <b>重渲染 ≠ 重绘 DOM：</b>重渲染只是"重新执行函数 + diff"，React 拿新旧虚拟 DOM 一比，
            只把真正变化的部分更新到真实 DOM。所以绝大多数组件重渲染的代价是零，
            这也是为什么多数性能优化其实不必要——先测量，再动手。
          </p>
        </div>
        <PerfDemo />
      </main>
    </div>
  )
}

export default Lesson9
