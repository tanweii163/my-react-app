// 第 5 课 · 演示一：FocusDemo —— ref 是一个"盒子"
//
// useRef(initialValue) 返回 { current: 初始值 } 这样一个普通对象：
//
//   const inputRef = useRef(null)
//          ↑ 盒子本体        ↑ current 里的东西
//
// 它的两个特性（对比 useState）：
// 1. 改 .current 不会触发重新渲染 —— 它只是"记事本"，React 不盯着它
// 2. 跨渲染保持 —— 组件重渲染多少次，盒子还是同一个，里面存的东西不丢
//
// 给 JSX 元素加 ref={inputRef}，React 会在挂载后把真实 DOM 节点
// 放进 inputRef.current，卸载时放回 null。于是我们可以直接调 DOM 方法。
import { useRef, useState, useEffect } from 'react'

function FocusDemo() {
  // 盒子 1：装 DOM 节点。初始 null，挂载后 React 会填上 <input> 元素
  const inputRef = useRef(null)

  // 盒子 2：装渲染次数。渲染函数每次执行都会重新运行，
  // 但 useRef 返回的是同一个盒子，所以 renderCount.current 能累计
  const renderCount = useRef(0)

  // 用 state 存"界面需要展示的渲染次数"
  const [renderCountShown, setRenderCountShown] = useState(0)

  // 一个专门用来"手动触发重渲染"的 state，让你亲眼看到渲染计数会动
  const [forceRenderTick, setForceRenderTick] = useState(0)

  // 【铁律】不能直接在渲染函数体里写 renderCount.current++：
  // 渲染体应当是"纯计算"——同样的输入返回同样的输出，不改外部东西。
  // StrictMode 下渲染体可能被执行两次，直接 +1 会数出双份。
  // 正确姿势：渲染完之后在 useEffect 里记账。
  // 依赖 [forceRenderTick]：挂载时记 1 次；每点一次"强制重渲染"再记 1 次。
  useEffect(() => {
    renderCount.current += 1
    setRenderCountShown(renderCount.current) // 想让数字出现在屏幕上，必须走 state
  }, [forceRenderTick])

  const focusInput = () => {
    // 直接命令 DOM：这是 state 做不到的事（state 只能"描述"界面，不能"命令"）
    inputRef.current.focus()
  }

  return (
    <section className="card">
      <h2>演示一：focus 输入框 + 渲染计数</h2>

      <div className="row">
        {/* ref={inputRef}：挂载后 inputRef.current 指向这个 input DOM 节点 */}
        <input ref={inputRef} placeholder="点下面的按钮，我会被聚焦" />
        <button onClick={focusInput}>聚焦输入框</button>
        {/* setForceRenderTick 触发重渲染 → useEffect 再跑 → 计数 +1。
            注意：直接 renderCount.current++ 不会让任何东西动起来 */}
        <button onClick={() => setForceRenderTick((t) => t + 1)}>
          强制重渲染一次
        </button>
      </div>

      <p>
        本组件已经渲染了 <strong>{renderCountShown}</strong> 次
        （数字存在 state 里才显示得出来）。
      </p>
      <p className="hint">
        对比实验：点"聚焦" → 数字不动（命令 DOM 不触发重渲染）；
        点"强制重渲染" → 数字 +1（state 变了才重渲染，useEffect 记账后再写入 state）。
        同一个"渲染次数"，ref 里存的是账本，state 里存的是屏幕。
        （首次进入显示 2 是 StrictMode 故意"挂载→卸载→再挂载"检验副作用的结果，生产构建只会是 1。）
      </p>
    </section>
  )
}

export default FocusDemo
