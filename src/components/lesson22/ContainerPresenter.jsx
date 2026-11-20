// 第 22 课 · 组件设计模式 ③ —— 容器/展示分离，以及它的退场
//
// 本文件教什么：
// 同一个秒表写两遍，行为一模一样，差别只在代码组织：
//   分离版：TimerPresenter（纯展示：props 进、JSX 出，没有一行 hook）
//           + StopwatchContainer（容器：状态、副作用全在这里，自己几乎不画 UI）
//   合并版：StopwatchMerged（一个组件全包——今天大多数人会这么写）
// 放在一起对照，是为了回答一个问题：
//   "容器/展示分离"这套 2015–2020 的主流模式，今天还要不要学？
//
// 兴衰时间线（注释即讲义，详见 doc/lesson-22.md）：
//   2013–2015 mixin 时代：React.createClass + mixins 跨组件共享方法；
//     隐式依赖、命名冲突、来源不明——2015 年 ES6 class 语法不带 mixin，官方路线终结；
//   2015–2017 容器/HOC 时代：Dan Abramov 的名文把组件分成"展示"与"容器"两层；
//     容器管数据与行为，常常由 HOC 生成（如 redux 的 connect()：组件进、增强组件出），
//     展示组件保持纯函数。逻辑复用解决了，但包装地狱和 props 来源不明接踵而至；
//   2017–2019 render props 过渡期：数据来源清楚了（写在参数表上），嵌套地狱接棒；
//   2019– Hooks 登场：自定义 Hook 把"状态 + 副作用"原样抽成可复用函数，
//     无包装、无嵌套、来源清晰——HOC 与 render props 作为通用逻辑复用手段一起退场，
//     "容器组件"这个物种随之消失；
//   ★ 但容器/展示的【思想】没有退场，它搬家了：自定义 Hook 就是今天的"容器"
//     （useStopwatch 管逻辑），组件就是今天的"展示"（拿返回值画界面）。
//     本文件特意保留"组件形态的容器"，为的是让你看见历史的形状；
//     真实项目里同样的分离通常写成 useStopwatch() + Stopwatch 组件，一个文件搞定。
//
// 文件里还留了一个 HOC 活化石 withLog：接收组件、返回增强版组件的函数。
// 挂载/卸载时往控制台打日志——HOC 最经典的用途就是这种"横切关注点"
// （日志/埋点/权限），connect、withRouter 都是这个形状。认得它，读库源码不慌。

import { useEffect, useState } from 'react'

// —— 纯展示组件的判定标准：没有 useState、没有 useEffect，接收什么画什么。——
// 好处：可以拿固定的 props 单独测试、单独换肤（动手试一试里换进度条皮肤的就是它），
// 而且看 props 类型就知道它会画什么——不需要读实现。
function TimerPresenter({ ms, running, onStart, onStop, onReset }) {
  // 毫秒 → 一位小数秒：格式化是"展示"的事，放在展示组件天经地义
  const seconds = (ms / 1000).toFixed(1)
  return (
    <div className="l22-stopwatch">
      {/* 复用 App.css 的 .big-number 大数字 */}
      <div className="big-number">
        {seconds}
        <span className="l22-unit">s</span>
      </div>
      <div className="row">
        {running ? (
          <button type="button" onClick={onStop}>
            暂停
          </button>
        ) : (
          <button type="button" onClick={onStart}>
            开始
          </button>
        )}
        <button type="button" onClick={onReset}>
          归零
        </button>
      </div>
      <p className="hint">纯展示：没有 hook，props 进 JSX 出</p>
    </div>
  )
}

// —— HOC 活化石：函数接收组件，返回"增强版组件"。——
// 包装纸在 DevTools 里会显示为 WithLog(...)——当年 HOC 层层嵌套就是这么来的。
function withLog(Wrapped) {
  // 具名的函数表达式：让 DevTools 至少能叫出这一层的名字
  return function WithLog(props) {
    useEffect(() => {
      console.log('[withLog] 容器挂载（HOC 的经典用途：日志/埋点/权限这类横切逻辑）')
      return () => console.log('[withLog] 容器卸载')
    }, [])
    // 原样转发 props：HOC 的铁律——不认识的字段一个都不许吞
    return <Wrapped {...props} />
  }
}

// —— 容器：状态 + 副作用全在这里，视图全部委托给 Presenter。——
function StopwatchContainerBase() {
  const [ms, setMs] = useState(0)
  const [running, setRunning] = useState(false)

  // 副作用（第 2 课铁律）：running 变 true 起 interval；清理函数负责 clearInterval。
  // 依赖数组只有 running——计时器只随"跑/停"重建，和 ms 无关（ms 用函数式更新）。
  useEffect(() => {
    if (!running) return undefined
    const timer = setInterval(() => setMs((m) => m + 100), 100)
    return () => clearInterval(timer)
  }, [running])

  // 容器的渲染体只有一件事：把状态和行为打包成 props 递给展示组件。
  // 自己一行 UI 都不写——这就是"容器"与"合并版"唯一的结构差别。
  return (
    <TimerPresenter
      ms={ms}
      running={running}
      onStart={() => setRunning(true)}
      onStop={() => setRunning(false)}
      onReset={() => {
        setRunning(false)
        setMs(0)
      }}
    />
  )
}

// 用 HOC 包一层：历史上容器常常就是这么"造"出来的（connect() 同款形状）。
// 打开控制台能看到挂载/卸载日志。
const EnhancedContainer = withLog(StopwatchContainerBase)

// 对外导出的"分离版"：本质是增强后的组件再套一层具名壳。
// 为什么不直接 export withLog(...) 的结果？那是 const 而不是组件，
// 会触发 fast refresh 的"一个文件只导出组件"提醒（lesson6 的 useTheme 同款取舍）——
// 套一层组件壳，DevTools 里有名字，lint 也安静。
export default function StopwatchContainer() {
  return <EnhancedContainer />
}

// —— 合并版：同一个秒表，逻辑和视图挤在一个组件里。——
// 行为与分离版完全一致。对照着看你会发现：合并版并没有更差——
// 这正是 Hooks 时代大家回归的写法；分离版的价值要在"逻辑需要复用/单独测试"时才显现。
export function StopwatchMerged() {
  const [ms, setMs] = useState(0)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return undefined
    const timer = setInterval(() => setMs((m) => m + 100), 100)
    return () => clearInterval(timer)
  }, [running])

  // 状态逻辑和 JSX 长在一起：想给这个秒表换皮肤？只能整个组件重写一遍。
  const seconds = (ms / 1000).toFixed(1)
  return (
    <div className="l22-stopwatch">
      <div className="big-number">
        {seconds}
        <span className="l22-unit">s</span>
      </div>
      <div className="row">
        {running ? (
          <button type="button" onClick={() => setRunning(false)}>
            暂停
          </button>
        ) : (
          <button type="button" onClick={() => setRunning(true)}>
            开始
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setRunning(false)
            setMs(0)
          }}
        >
          归零
        </button>
      </div>
      <p className="hint">合并版：逻辑 + 视图在一个组件里（今天的主流写法）</p>
    </div>
  )
}
