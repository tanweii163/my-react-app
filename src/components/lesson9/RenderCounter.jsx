// 本文件教什么：一个"重渲染计数器"，本课的测量工具。
// 设计取舍（值得细看，这是个经典陷阱）：
//   · 计数用 useRef，并且在渲染期间直接把 countRef.current 显示出来。
//   · 为什么不把计数搬进 useState 显示？因为"setState 更新显示 → 触发一次新渲染
//     → 计数又 +1 → 又 setState……"会形成无限更新循环，页面卡死。
//     这是初学者做渲染计数器时最真实的坑。
//   · 直接显示 ref 的代价：改 ref 不触发重渲染，所以数字永远比真实值"慢一拍"
//     （本次渲染写的数，下次父组件带着我们重渲染时才显示出来）——
//     这恰好又是 ref 的教学点：ref 适合存"不需要显示在页面上的值"，
//     一旦要显示就得付这个代价。控制台日志不受这个限制，每次渲染都会实时打印。
//   · 渲染期写 ref 本身是 React 官方不推荐的模式，这里是为了"数自己"这个需求
//     特意为之，并用注释禁用了这一行 lint 规则——带着理由地破例，而不是糊弄。
//   · StrictMode 开发模式下每次渲染函数体执行两次，计数会翻倍——这是开发期的
//     检测行为，不是 bug，生产构建不会翻倍。
import { useRef } from 'react'

export default function RenderCounter({ label }) {
  // ref：跨渲染存值的"盒子"，改它不会触发重渲染（铁律！）
  const countRef = useRef(0)
  // 每次本组件渲染（函数体执行）时 +1；渲染期写 ref 是此处有意的例外
  // oxlint-disable-next-line react/refs
  const renderNo = (countRef.current += 1)
  console.log(`[RenderCounter:${label}] 第 ${renderNo} 次渲染`)

  return (
    <span className="render-counter">
      {label} 已渲染 <strong>{renderNo}</strong> 次
    </span>
  )
}
