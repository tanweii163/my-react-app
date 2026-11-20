// 第 6 课 · 跨层传值演示 —— 让中间层“隐身”
//
// 本文件教什么：ThemeDemo → Panel → DeepChild 三层嵌套。
// 在 props 钻透的世界里，中间层必须写 ({ theme }) 收下再转手；
// 有了 context，中间层 Panel 一个 props 都不接、连 import context 都不需要，
// 最深层的 DeepChild 却能直接读到主题 —— 这就是“跨层传值”。
//
// 注意一个容易误会的点：Panel 透传 children 不算 props 钻透。
// children 是 React 自带的组合机制，父组件塞什么它渲染什么，Panel 自己并不“认识”内容。
import DeepChild from './DeepChild.jsx'
import { useTheme } from './ThemeContext.jsx'

// 中间层：对主题一无所知。对比第 6 课页面里那个被迫写成
// function Panel({ theme }) { return <DeepChild theme={theme} /> } 的版本 —— 它解脱了。
function Panel() {
  return (
    <div className="l6-layer">
      <p className="l6-layer-label">
        Panel（中间层）：不接收、不转发任何主题 props，根本不知道 context 的存在
      </p>
      {/* 只透传 children：这是“组合”，不是钻透 */}
      <DeepChild />
    </div>
  )
}

// 顶层消费组件：被 Lesson6 包在 <ThemeProvider> 里。
// 它自己也用 useTheme() 读主题 —— 说明 context 不限层数，每一层都可以直接收听。
function ThemeDemo() {
  const { theme } = useTheme()

  return (
    <div className="l6-layers">
      <p className="l6-layer-label">
        ThemeDemo（顶层）：state 其实在 Provider 手里，当前是「{theme}」——
        点上面的按钮，看变化怎么穿过中间层直达最底部
      </p>
      <Panel />
    </div>
  )
}

export default ThemeDemo
