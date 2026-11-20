// 第 8 课 · useDebounce：防抖值
//
// 本文件教什么：把第 2 课的“setTimeout + 清理函数”封装成可复用 Hook。
//
// 防抖（debounce）：一个值连续变化时，等它“安静” delay 毫秒后才真正更新。
// 典型场景：搜索框每敲一个字符就过滤/发请求太浪费，等用户停下再动手。
//
// 实现思路和第 2 课 TimerDemo 完全同款，只是 interval 换成 setTimeout：
//   value 一变 → useEffect 重跑 → 先清理上一个定时器（这就是“防抖”的抵消动作），
//   再挂一个新的。只有 value 停顿超过 delay，定时器才来得及执行 setDebounced。
import { useEffect, useState } from 'react'

export default function useDebounce(value, delay = 300) {
  // debounced 初始就等于 value：第一次渲染没什么可“等”的
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)

    // 清理函数是防抖的灵魂：value 每变一次，旧定时器就被取消一次。
    // 忘了清理 = 每次按键都排一个定时器，停顿后一串旧的陆续执行（防抖失效）。
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
