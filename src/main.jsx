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
import Lesson4 from './pages/Lesson4.jsx'
import Lesson5 from './pages/Lesson5.jsx'
import Lesson6 from './pages/Lesson6.jsx'
import Lesson7 from './pages/Lesson7.jsx'
import Lesson8 from './pages/Lesson8.jsx'
import Lesson9 from './pages/Lesson9.jsx'
import Lesson10 from './pages/Lesson10.jsx'

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
          <Route path="lesson/4" element={<Lesson4 />} />
          <Route path="lesson/5" element={<Lesson5 />} />
          <Route path="lesson/6" element={<Lesson6 />} />
          <Route path="lesson/7" element={<Lesson7 />} />
          <Route path="lesson/8" element={<Lesson8 />} />
          <Route path="lesson/9" element={<Lesson9 />} />
          <Route path="lesson/10" element={<Lesson10 />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
