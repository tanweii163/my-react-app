// 第 3 课 · useState 与事件处理
//
// useState 是 React 的 Hook（钩子），让函数组件拥有“记忆”。
//
//   const [count, setCount] = useState(0)
//          ↑ 当前值     ↑ 修改函数        ↑ 初始值
//
// 两条铁律：
// 1. 必须通过 setCount 修改，直接改 count 变量 React 不会重新渲染
// 2. setCount(newVal) 是“替换”而不是“合并”；要基于旧值计算时，
//    用函数形式 setCount(c => c + 1)，避免拿到过期数据
import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)
  const [history, setHistory] = useState([])

  // 事件处理：onClick 接收一个函数（不是调用它！）
  const add = (step) => {
    setCount((c) => c + step) // 函数形式：c 是最新的 count
    setHistory((h) => [...h, `+${step}`]) // 展开运算符：复制旧数组再追加
  }

  const reset = () => {
    setCount(0)
    setHistory([])
  }

  return (
    <section className="card">
      <h2>useState 示例</h2>
      <p className="big-number">{count}</p>

      <div className="row">
        {/* 每次点击都会触发重新渲染，页面上的 {count} 随之更新 */}
        <button onClick={() => add(1)}>+1</button>
        <button onClick={() => add(5)}>+5</button>
        <button onClick={reset}>重置</button>
      </div>

      <p>操作记录：{history.length ? history.join('、') : '（暂无）'}</p>
      <p className="hint">打开控制台试试：手动 count++ 会报错吗？页面会更新吗？</p>
    </section>
  )
}

export default Counter
