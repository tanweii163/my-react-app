// 第 8 课 · useLocalStorage：一个会“记住”的 useState
//
// 本文件教什么：怎么把一段可复用的逻辑封装成自定义 Hook。
//
// 自定义 Hook 没有任何新 API —— 它就是一个名字以 use 开头、
// 内部调用了其他 Hook（useState / useEffect …）的普通函数。
// React 只靠这个命名约定工作：use 开头 → 检查器知道里面可以调用其他 Hook。
//
// 设计目标：对外的形状和 useState 完全一致（“同形”）——
//   const [value, setValue] = useLocalStorage('notes', 默认值)
// 组件从 useState 换成它，其余代码一行都不用改。
// “与 useState 同形”是自定义 Hook 好不好用的第一条标准。
import { useEffect, useState } from 'react'

// 统一加前缀，避免和以后其他课程/页面的数据互相覆盖
const PREFIX = 'lesson8:'

export default function useLocalStorage(key, initialValue) {
  // 惰性初始化：给 useState 传函数，只在第一次渲染时执行一次。
  // 第一次渲染先去 localStorage 找旧值，找不到才用 initialValue。
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(PREFIX + key)
      // 用 stored !== null 判断“存没存过”，而不是 if (stored)：
      // 否则存过的空字符串 '' 会被误判成“没存过”
      return stored !== null ? JSON.parse(stored) : initialValue
    } catch {
      // localStorage 被禁用、或旧数据是坏 JSON 时退回初始值，别让页面崩掉
      return initialValue
    }
  })

  // 值变化时写回 localStorage。
  // 写存储是对外部世界的动作 = 副作用，铁律：放 useEffect，
  // 绝不放在渲染过程里（渲染必须纯；StrictMode 下渲染会故意跑两次）。
  // 依赖 [key, value]：key 或 value 任一变化 → 序列化写盘一次。
  useEffect(() => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      // 写失败（隐私模式、存储配额满）不致命，静默忽略
    }
  }, [key, value])

  // 和 useState 同形：返回 [值, 修改函数]，调用方可以无缝替换
  return [value, setValue]
}
