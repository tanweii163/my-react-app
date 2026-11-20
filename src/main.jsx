import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 第 3 课 · React Router 三件套入口
// BrowserRouter：监听 URL，提供路由上下文（包整个应用，只出现一次）
// Routes/Route：URL → 组件 的映射表
import { BrowserRouter, Routes, Route } from 'react-router'
import './index.css'
import App from './App.jsx' // 布局外壳（导航栏 + <Outlet/>）
import Home from './pages/Home.jsx'
import Lesson1 from './pages/Lesson1.jsx'
import Lesson2 from './pages/Lesson2.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* 无 path 的 Route 是“布局路由”：不匹配 URL，只提供公共外壳 */}
        <Route element={<App />}>
          {/* index：URL 正好是 / 时显示（首页） */}
          <Route index element={<Home />} />
          {/* 嵌套在布局下 → 页面渲染进 App 的 <Outlet/> 里 */}
          <Route path="lesson/1" element={<Lesson1 />} />
          <Route path="lesson/2" element={<Lesson2 />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
