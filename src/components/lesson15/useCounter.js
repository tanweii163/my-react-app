// 第 15 课 · 被测对象 ③：useCounter —— 自定义 Hook，测它需要 renderHook
//
// 本文件教什么：自定义 Hook（第 8 课）没法像纯函数那样"裸调"着测——
// Hook 只能在组件渲染过程里运行。所以 Hook 的测试策略是两条：
//   1. 设计上让 Hook 薄：复杂逻辑下沉到纯函数（像本课 reducer 那样）；
//   2. Hook 本体用 @testing-library/react 的 renderHook 挂到一个
//      一次性的"宿主组件"里测，act 里模拟调用，result.current 读结果。
//
// 接口：const { count, increment, decrement, reset } = useCounter(初始值, { max })
// max 是可选上限，increment 越过它时被钳制在 max——
// "越界停在边界而不是报错"是产品决定，也正是测试要钉死的行为。
import { useCallback, useState } from 'react'

export default function useCounter(initial = 0, { max = Infinity } = {}) {
  const [count, setCount] = useState(initial)

  // 函数式更新（第 2 课）：c 由 React 传入、永远是最新值，
  // 连续多次 increment 不会读到过期闭包。
  // 钳制：Math.min(c + 1, max)。9→10 后继续点，永远停在 10。
  const increment = useCallback(() => {
    setCount((c) => Math.min(c + 1, max))
  }, [max])

  // 这两个没有额外规则，普通更新即可
  const decrement = useCallback(() => setCount((c) => c - 1), [])
  const reset = useCallback(() => setCount(initial), [initial])

  // 返回对象而不是数组：调用方按名解构，多一个方法不破坏老代码
  return { count, increment, decrement, reset }
}
