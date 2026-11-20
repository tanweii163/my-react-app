// 第 6 课 · useContext 与跨层传值 —— context 的“生产车间”
//
// 本文件教什么：context 三步走的前两步都在这里完成
//   第 1 步 createContext：造一个“广播频道”（频道本身不存数据，只负责对接）
//   第 2 步 Provider：把数据放进频道，包住谁，谁的后代就能收听
//   第 3 步 useContext 在 useTheme 里：任何后代组件直接收听，中间层不用帮着传
//
// 铁律：Provider 也是普通组件，children 是它唯一的“必经之路”，数据与 UI 可以共存。
// 易错点：谁没被 Provider 包住，useContext 拿到的是 createContext 的默认值。
// 我们故意把默认值设成 null，让 useTheme 在 null 时直接抛错 ——
// 让 bug 在开发期第一秒炸出来，而不是悄悄渲染成错误的样子越埋越深。
import { createContext, useContext, useEffect, useState } from 'react'

// 第 1 步：创建 context。参数是“默认值”，只在没有任何 Provider 包住时生效。
// 故意给 null（而不是给个像样的默认主题）：配 useTheme 的防御检查，
// “忘了包 Provider”这种错误会在调用 useTheme 的瞬间暴露。
const ThemeContext = createContext(null)

// 第 2 步：Provider 组件 —— 数据的“所有者”。
// 它自己用 useState 管理 theme，就像 Counter 管 count 一样；
// 区别是它把 state 通过 context 广播出去，后代不用一层层传 props。
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light')

  const toggleTheme = () => {
    // 不可变更新套路和第 1 课一样：给 setState 一个“根据旧值算新值”的函数
    setTheme((t) => (t === 'light' ? 'dark' : 'light'))
  }

  // 副作用（第 2 课的知识）：把主题同步写到 <html> 的 data-theme 属性上。
  // lesson6.css 里用 [data-theme='dark'] 选择器准备了两套 CSS 变量，
  // 属性一切换，所有用到变量的元素自动换肤 —— React 管 state，CSS 管外观。
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    // 清理函数：离开本课时删掉属性，避免深色主题“泄漏”到其他课的页面
    return () => {
      delete document.documentElement.dataset.theme
    }
  }, [theme])

  // value：后代通过 useContext 能拿到的东西。注意这里每次渲染都会生成新对象，
  // 所以 Provider 一重渲染，所有消费者都会跟着重渲染 —— 这是 context 的代价，后面课再优化。
  const value = { theme, toggleTheme }

  // 显式写出 <Context.Provider>：教学要求看清“三步走”的第 2 步长什么样。
  // Provider 同时渲染了切换按钮和 children —— 数据（广播）与 UI（按钮）互不冲突。
  return (
    <ThemeContext.Provider value={value}>
      <div className="theme-toolbar">
        <button onClick={toggleTheme}>
          {theme === 'light' ? '🌞 切到深色' : '🌙 切到浅色'}
        </button>
        <span className="hint">
          当前主题：{theme}（按钮在 Provider 里，消费在最底层 —— 点一下看变化怎么“跨层”传下去）
        </span>
      </div>
      {/* children：React 自带的“占位内容”，Lesson6 包进来的 ThemeDemo 会渲染在这里 */}
      {children}
    </ThemeContext.Provider>
  )
}

// 第 3 步：把 useContext 包成自定义 hook。
// 好处一：调用方只 import useTheme，不用认识 useContext 和 ThemeContext；
// 好处二：“没包 Provider 就抛错”的防御逻辑只写一次，处处生效。
// 已知取舍：oxlint 的 react/only-export-components 会提示“一个文件应只导出组件”，
// 因为这里组件（ThemeProvider）和函数（useTheme）混在一个文件里。
// 教学上刻意让三步走集中在一处，便于对照阅读；真实项目里通常把 useTheme 拆到单独文件。
// oxlint-disable-next-line react/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext)
  // 防御：默认值是 null 说明头顶上没有任何 Provider。
  // 宁可抛错也别悄悄降级 —— 控制台会直接指到出错的组件，比“页面颜色不对”好查一百倍。
  if (ctx === null) {
    throw new Error('useTheme 必须在 <ThemeProvider> 内部使用：先把组件包进 Provider 再调用')
  }
  return ctx
}
