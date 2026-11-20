// 第 6 课 · 最深层组件 —— 不接 props，直接“收听”频道
//
// 本文件教什么：DeepChild 埋在三层嵌套的最里面，函数签名里没有任何 props，
// 却能用 useTheme() 拿到顶层 Provider 的数据，渲染出对应配色的卡片。
//
// 概念对比：props 是“按血缘传”——数据必须从父到子逐层签字画押；
// context 是“按位置取”——只要你在 Provider 的“势力范围”内，
// 隔多少层都能直接收听，而且不需要知道数据是谁提供的。
import { useTheme } from './ThemeContext.jsx'

function DeepChild() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="l6-layer">
      <p className="l6-layer-label">DeepChild（最深层）：调用 useTheme() 直接读到主题</p>

      {/* 卡片配色来自 CSS 变量（lesson6.css 按 [data-theme] 换了两套值），
          主题名来自 context —— 结构和样式完全没为“换主题”写 if 分支 */}
      <div className="theme-card">
        <span className="theme-card-icon">{isDark ? '🌙' : '☀️'}</span>
        <div>
          <p className="theme-card-title">我是埋在三层底下的卡片</p>
          <p className="theme-card-text">
            没有任何 props 途经我头顶的三层。主题名来自 context：{theme}；
            颜色来自 CSS 变量，跟着 &lt;html&gt; 上的 data-theme 属性自动切换。
          </p>
        </div>
      </div>
    </div>
  )
}

export default DeepChild
