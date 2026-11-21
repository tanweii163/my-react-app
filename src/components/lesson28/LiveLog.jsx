// LiveLog · 对照组：同一 socket 流，用 useState + useEffect 订阅的"老写法"
//
// 本文件教什么：
// 1. 老写法长什么样：useEffect 里 addEventListener → 收到消息 setState 追加日志 →
//    cleanup 里 removeEventListener。它"能用"，也是第 2 课清理原则的兑现；
// 2. 它输在哪（一句带过）：
//    a) 每条消息 setState 一次 = 每条消息重渲染一次本组件，且各订阅者
//       各自持有独立 state、各自开计时窗口；
//    b) React 18 并发渲染下，多个组件分别用 useEffect 订阅同一外部源时，
//       可能在同一次提交里读到不同版本的数据（tearing，撕裂）——
//       useSyncExternalStore 就是官方为消除 tearing 提供的专用接缝；
// 3. 所以：一次性、组件私有的副作用用 useEffect；跨组件共享、持续变化的外部
//    数据源，改用"外部 store + useSyncExternalStore"（看 PriceTicker）。
import { useEffect, useState } from 'react'
import priceStore from './priceStore.js'

// 日志最多保留条数：无限增长会撑爆内存，截断是实时流的常识
const MAX_LINES = 8

function LiveLog() {
  const [lines, setLines] = useState([])

  // 老写法全套：订阅（挂载时）→ 更新（setState）→ 清理（卸载时）
  // 注意：这里直接拿到 store 的 socket 订阅不到原始消息，所以 store 暴露了
  // subscribe——它同一时刻也服务于 PriceTicker，两条订阅互不干扰，
  // 这正是"单例 socket、多处订阅"的样子
  useEffect(() => {
    // 订阅 socket 的 message 事件需要直接访问 socket——为了教学对照，
    // store 把 onmessage 之后再挂一个监听的方式封装成 logSubscribe
    const unsubscribe = priceStore.logSubscribe((line) => {
      // 易错点预演：setLines(prev => [line, ...prev]) 是不可变更新；
      // 若写成 lines.unshift/直接 push 再 setLines(lines)，引用不变 → 界面不动
      setLines((prev) => [line, ...prev].slice(0, MAX_LINES))
    })
    // 清理（呼应第 2 课）：不退订 = 卸载后仍在往已卸载组件的 state 写 → 泄漏 + 警告
    return unsubscribe
  }, []) // 空依赖：订阅一次，卸载时清理——依赖数组写错是这里最常见的 bug

  return (
    <div className="card">
      <h2>实时日志 · 对照版（useState + useEffect）</h2>
      <p className="hint">
        同一条 socket 流的另一种接法：effect 里订阅、setState 收消息、cleanup 里退订。
        能跑，但每条消息都触发一次本组件重渲染；多个组件这样各自订阅时还有
        tearing 风险——生产上共享数据源请用左边的 useSyncExternalStore 版本。
      </p>
      <ul className="l28-log">
        {lines.map((line) => (
          <li key={line.id} className="l28-log-line">
            <span className="l28-log-ts">{line.time}</span>
            <span>{line.text}</span>
          </li>
        ))}
        {lines.length === 0 && <li className="hint">等待推送……（断线后这里会安静）</li>}
      </ul>
    </div>
  )
}

export default LiveLog
