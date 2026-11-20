// 第 5 课 · 演示二：StopwatchDemo —— 什么进 state，什么进 ref
//
// 判断标准一句话：
//   要画到屏幕上的 → state（变了要触发重渲染）
//   只是内部记事本 → ref（变了不许惊动 React）
//
// 秒表正好两样都要：
//   经过秒数  → state（每秒显示在屏幕上，必须驱动 UI）
//   interval id → ref（只是 stop 时要用它调 clearInterval，跟画面无关）
//
// 【铁律】setInterval 的返回值（定时器 id）不能存 state：
//   id 不是"界面数据"；存 state 会让无意义的值触发重渲染，
//   而且 effect 里 set 一次 state 又触发渲染，容易写出死循环。
import { useRef, useState, useEffect } from 'react'

function StopwatchDemo() {
  const [seconds, setSeconds] = useState(0) // 驱动 UI：每秒 +1，屏幕跟着动
  const [running, setRunning] = useState(false) // 驱动 UI：按钮文字、能否点击
  const timerIdRef = useRef(null) // 记事本：定时器 id，只是"stop 时找得到它"

  // 依赖数组 [running]：running 变化时，清理旧 effect、再跑新 effect。
  // 这是处理定时器/订阅的标准模式： effect 里建，cleanup 里拆。
  useEffect(() => {
    if (!running) return // 没在跑就什么都不建

    timerIdRef.current = setInterval(() => {
      // 函数形式更新：interval 闭包里的 setSeconds 永远拿到最新值
      // （如果写成 setSeconds(seconds + 1)，闭包里的 seconds 会过期，见第 1 课）
      setSeconds((s) => s + 1)
    }, 1000)

    // cleanup：组件卸载或 running 再变时，必须清掉定时器，否则内存泄漏 +
    // 组件不在了定时器还在 setState（React 18+ 不再警告，但仍是 bug 源头）
    return () => clearInterval(timerIdRef.current)
  }, [running])

  const start = () => setRunning(true)
  const stop = () => setRunning(false)
  const reset = () => {
    setRunning(false)
    setSeconds(0)
  }

  return (
    <section className="card">
      <h2>演示二：秒表</h2>
      <p className="big-number">{seconds}s</p>

      <div className="row">
        <button onClick={start} disabled={running}>
          开始
        </button>
        <button onClick={stop} disabled={!running}>
          停止
        </button>
        <button onClick={reset}>归零</button>
      </div>

      <p className="hint">
        秒数进了 state（屏幕要显示）；定时器 id 进了 ref（只是记事本）。
        打开控制台试试：把 id 改存 state 会发生什么？——多余的渲染，甚至死循环。
      </p>
    </section>
  )
}

export default StopwatchDemo
