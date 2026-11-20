// 本文件教什么：重渲染机制 + React.memo / useCallback / useMemo 的组合拳，
// 以及最重要的心态——默认不写，先测量。
//
// 三段对比：
//   第一段：裸子组件。父组件任何 state 变（哪怕毫无关系），它都跟着重渲染。
//   第二段：React.memo 子组件 + useCallback 包回调 + useMemo 包"1 万项求和"。
//           切到无关 tick 时子组件纹丝不动；改相关 props 时才重渲染。
//   第三段：心态小结 + key 稳定性——大多数优化是不必要的，React 的 diff 已经很快。
//
// 关键对比，务必看懂：
//   onClick={() => onPick(v)}   —— 每次渲染都是新函数 → memo 失效（易错点！）
//   onClick={handlePick}        —— useCallback 缓存的同一个函数 → memo 生效
import { memo, useCallback, useMemo, useState } from 'react'
import RenderCounter from './RenderCounter.jsx'
import ExpensiveList from './ExpensiveList.jsx'

// 造 1 万条数据。注意：放在模块顶层只造一次，而不是组件里每次渲染都造——
// 否则"优化"就变成了自我安慰（这也是常见坑）。
const ITEMS = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  value: (i * 37) % 100,
}))

// ---------- 第一段：裸子组件（未 memo） ----------
function BareChild({ tick }) {
  return (
    <div className="perf-demo-child">
      <RenderCounter label="裸子组件" />
      <p className="hint">收到无关的 tick：{tick}</p>
      <p className="hint">
        父组件随便动一下 state，我就重渲染——因为父组件重渲染时，默认所有子组件都会重新执行函数体。
      </p>
    </div>
  )
}

// ---------- 第二段：优化版子组件 ----------
// 注意：MemoChild 自己也要包 React.memo。否则父组件重渲染时它照样重新执行，
// 里面的 RenderCounter 就会跟着 +1，演示"被拦下"就不成立了。
// memo 的浅比较在这里能生效，靠的是三件事一起做：
//   · keyword / total 是基本量或 useMemo 缓存的值（引用稳定）
//   · onPick 是 useCallback 缓存的函数（引用稳定）
const MemoChild = memo(function MemoChild({ keyword, total, onPick }) {
  return (
    <div className="perf-demo-child">
      <RenderCounter label="memo 子组件" />
      <p className="hint">真正相关的 props——关键字：{keyword}</p>
      {/* 求和被 useMemo 缓存：total 不变时，即使本组件重渲染也不重新算 1 万项 */}
      <ExpensiveList items={ITEMS} total={total} onPick={onPick} />
    </div>
  )
})

export default function PerfDemo() {
  // 相关 state：改它 → memo 子组件必须重渲染（props 真的变了）
  const [keyword, setKeyword] = useState('react')
  // 无关 state：只是给"裸子组件"看的，理论上和列表毫无关系
  const [tick, setTick] = useState(0)
  const [picked, setPicked] = useState(null)

  // useCallback：把回调的引用缓存住，依赖不变就返回同一个函数。
  // 如果不包，每次 PerfDemo 渲染都是新函数 → memo(ExpensiveList) 浅比较失败 → 白优化。
  const handlePick = useCallback((v) => {
    setPicked(v)
  }, [])

  // useMemo：依赖数组为空 → 只算一次，之后每次重渲染都直接复用。
  // keyword 变了也不重算，因为求和根本不依赖 keyword——这就是"按需缓存"。
  const total = useMemo(() => {
    console.time('求和 1 万项')
    let sum = 0
    for (const it of ITEMS) sum += it.value
    console.timeEnd('求和 1 万项')
    return sum
  }, []) // 空依赖：ITEMS 是模块级常量，永远不变，算一次就够了

  // 切换"无关 tick"的按钮：预期——裸子组件 +1，memo 子组件不动
  const addTick = () => setTick((t) => t + 1)
  // 切换"相关 props"的按钮：预期——两个子组件都 +1（memo 子组件是真的需要新数据）
  const changeKeyword = () => setKeyword((k) => (k === 'react' ? 'vue' : 'react'))

  return (
    <>
      <div className="card">
        <h2>① 裸子组件：父组件动，我就动</h2>
        <div className="row">
          <button onClick={addTick}>加一个无关 tick</button>
          <button onClick={changeKeyword}>改关键字（相关的 props）</button>
        </div>
        <BareChild tick={tick} />
        <p className="hint">
          点"无关 tick"：父组件 PerfDemo 重渲染 → BareChild 没有 memo，跟着重渲染，哪怕 tick 它根本不用来算任何东西。
        </p>
      </div>

      <div className="card">
        <h2>② memo + useCallback + useMemo：该动才动</h2>
        <div className="row">
          <button onClick={addTick}>加一个无关 tick</button>
          <button onClick={changeKeyword}>改关键字（相关的 props）</button>
        </div>
        <MemoChild keyword={keyword} total={total} onPick={handlePick} />
        <p className="hint">
          点"无关 tick"：PerfDemo 重渲染，但 MemoChild 的 props（keyword、total、handlePick 引用）浅比较全部相等 → React.memo 直接跳过，计数不变、控制台无日志。
          点"改关键字"：keyword 真的变了 → MemoChild 重渲染（这是"应该的"重渲染）；而 total 被 useMemo 缓存住了，
          1 万项求和不会重跑（开着控制台看"求和 1 万项"何时打印，就懂了）。
        </p>
        <p className="hint">最近选中：{picked ?? '（还没点过）'}</p>
      </div>

      <div className="card">
        <h2>③ 正确心态：默认不写，先测量</h2>
        <p>
          use<b>memo</b> / use<b>callback</b> / React.memo 不是"写上就更快"的护身符——缓存本身也有成本（存依赖数组、做比较）。
          正确顺序是：<b>感觉慢 → React DevTools Profiler 实测 → 找到真正慢的那一个组件 → 针对性优化 → 再测</b>。
          凭感觉全包一遍，代码更难读，性能往往没变化。
        </p>
        <p>
          同理，<b>key 稳定性</b>是比 memo 更常见的性能杠杆：列表渲染时 key 要稳定、唯一。
          用数组下标当 key，或每次渲染用 Math.random()/Date.now() 生成 key，会让 React 认为"整列表都是新元素"，
          全部卸载重建（丢状态、丢动画），而不是复用已有的 DOM。列表重建 vs 复用，一 key 之差。
        </p>
      </div>
    </>
  )
}
