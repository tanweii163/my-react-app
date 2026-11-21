// 第 5 课 · useEffect：副作用（一）—— 定时器与清理函数
//
// 渲染过程必须是“纯”的：只算出 JSX，不做任何外部世界的事。
// 但真实组件总要做纯计算以外的事 —— 发请求、开定时器、操作 DOM、订阅事件。
// 这些叫“副作用”（side effect），它们的正确位置就是 useEffect。
//
//   useEffect(() => { ...要做的事... }, [依赖列表])
//                        ↑                ↑
//                    副作用函数      什么时候重新执行
//
// 执行时机：不是“渲染时”，而是“渲染完成后”（先画完页面，再跑副作用）。
// 依赖数组三种写法：
//   不传      → 每次渲染后都跑（几乎不用）
//   []        → 只在挂载后跑一次
//   [a, b]    → 挂载后跑一次，之后 a 或 b 变化引起的渲染完成后再跑
import { useEffect, useState } from 'react'

function TimerDemo() {
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(true)

  useEffect(() => {
    if (!running) return // 不运行时不挂定时器

    // 副作用：启动一个每秒 +1 的定时器
    const timer = setInterval(() => {
      // 函数式更新：回调闭包里不引用外部 seconds，永远拿最新值
      setSeconds((s) => s + 1)
    }, 1000)

    // 清理函数：下次副作用执行前、以及组件卸载时，React 会调用它
    // 不清理 = 旧定时器还在跑，秒数会 +2、+3……越走越快（经典 bug）
    return () => clearInterval(timer)
  }, [running]) // running 变化 → 清掉旧定时器，按新状态重新挂

  return (
    <section className="card">
      <h2>useEffect 示例：定时器</h2>
      <p className="big-number">{seconds}s</p>
      <div className="row">
        <button onClick={() => setRunning((r) => !r)}>
          {running ? '暂停' : '继续'}
        </button>
        <button onClick={() => setSeconds(0)}>归零</button>
      </div>
      <p className="hint">
        切换“暂停/继续”观察：依赖 [running] 变化会先清理旧 effect 再跑新的。
        React DevTools 里把组件卸载（改 App 不渲染它）也能验证清理函数生效。
      </p>
    </section>
  )
}

export default TimerDemo
