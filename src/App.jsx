// 第 3 课 · React Router：布局与嵌套路由
//
// App.jsx 从“整个页面”变成了“布局外壳”：
//   <Outlet /> 是占位符 —— 当前 URL 匹配到的子页面在这里渲染。
// 这样导航栏、页脚等公共部分只写一次，每个页面只管自己的内容。
//
// 路由表在 src/main.jsx：/ 是 Home，/lesson/1、/lesson/2 挂在这个布局下。
import { NavLink, Outlet } from 'react-router'
import './App.css'

function App() {
  return (
    <>
      {/* NavLink 比 Link 多一个本领：当前 URL 匹配时自动加 active 类
          end 属性：默认 / 也会匹配所有路径，加了它只有“正好是 /”才算激活 */}
      <nav className="top-nav">
        <NavLink to="/" end>首页</NavLink>
        <NavLink to="/lesson/1">第 1 课</NavLink>
        <NavLink to="/lesson/2">第 2 课</NavLink>
      </nav>
      <Outlet />
    </>
  )
}

export default App
