// useCounter 的 Hook 测试 —— renderHook + act 示范
//
// Hook 只能在组件里运行，没法裸调着测。renderHook 帮你造一个一次性的
// "宿主组件"把 Hook 挂起来，给你两个抓手：
//   result.current → Hook 最新一次返回值（读它来断言）
//   rerender(...)  → 模拟参数变化后的重渲染（本课用不到，知道有这回事）
//
// act 的意义（一句版）：act(fn) 告诉 React"我正在模拟一次真实使用"，
// fn 里触发的更新会被【当场结算】——出来再读 result.current 才是新的，
// 不会读到"渲染还没来得及生效"的旧值。
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useCounter from './useCounter.js'

describe('useCounter', () => {
  it('初始值就是传入的 initial', () => {
    const { result } = renderHook(() => useCounter(10))
    expect(result.current.count).toBe(10)
  })

  it('不传参数时默认从 0 开始', () => {
    const { result } = renderHook(() => useCounter())
    expect(result.current.count).toBe(0)
  })

  it('increment 每次 +1', () => {
    const { result } = renderHook(() => useCounter(0))
    // 注意：两次 increment 要分开各包一个 act。
    // 函数式更新（setCount(c => ...)）保证合并执行也正确，
    // 但"调用 → 结算 → 读新值"这个节奏是 Hook 测试的标准动作
    act(() => result.current.increment())
    act(() => result.current.increment())
    expect(result.current.count).toBe(2)
  })

  it('increment 越过 max 时被钳制在 max（边界）', () => {
    const { result } = renderHook(() => useCounter(9, { max: 10 }))
    act(() => result.current.increment()) // 9 → 10：还在界内
    act(() => result.current.increment()) // 想去 11，被 Math.min 钳回 10
    expect(result.current.count).toBe(10)
  })

  it('initial 已经等于 max 时 increment 不动（边界）', () => {
    const { result } = renderHook(() => useCounter(3, { max: 3 }))
    act(() => result.current.increment())
    expect(result.current.count).toBe(3)
  })

  it('decrement 正常 -1，不受 max 影响', () => {
    const { result } = renderHook(() => useCounter(2, { max: 3 }))
    act(() => result.current.decrement())
    expect(result.current.count).toBe(1)
  })

  it('reset 回到 initial', () => {
    const { result } = renderHook(() => useCounter(5))
    act(() => result.current.increment()) // 5 → 6
    act(() => result.current.reset())
    expect(result.current.count).toBe(5)
  })
})
