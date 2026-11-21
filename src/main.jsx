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
import Lesson11 from './pages/Lesson11.jsx'
import Lesson12 from './pages/Lesson12.jsx'
import Lesson13 from './pages/Lesson13.jsx'
import Lesson14 from './pages/Lesson14.jsx'
import Lesson15 from './pages/Lesson15.jsx'
import Lesson16 from './pages/Lesson16.jsx'
import Lesson17 from './pages/Lesson17.jsx'
import Lesson18 from './pages/Lesson18.jsx'
import Lesson19 from './pages/Lesson19.jsx'
import Lesson20 from './pages/Lesson20.jsx'
import Lesson21 from './pages/Lesson21.jsx'
import Lesson22 from './pages/Lesson22.jsx'
import Lesson23 from './pages/Lesson23.jsx'
import Lesson24 from './pages/Lesson24.jsx'
import Lesson25 from './pages/Lesson25.jsx'
import Lesson26 from './pages/Lesson26.jsx'
import Lesson27 from './pages/Lesson27.jsx'
import Lesson28 from './pages/Lesson28.jsx'
import Lesson29 from './pages/Lesson29.jsx'
import Lesson30 from './pages/Lesson30.jsx'
import Lesson31 from './pages/Lesson31.jsx'
import Lesson32 from './pages/Lesson32.jsx'
import Lesson33 from './pages/Lesson33.jsx'
import Lesson34 from './pages/Lesson34.jsx'
import Lesson35 from './pages/Lesson35.jsx'

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
          <Route path="lesson/11" element={<Lesson11 />} />
          <Route path="lesson/12" element={<Lesson12 />} />
          <Route path="lesson/13" element={<Lesson13 />} />
          <Route path="lesson/14" element={<Lesson14 />} />
          <Route path="lesson/15" element={<Lesson15 />} />
          <Route path="lesson/16" element={<Lesson16 />} />
          <Route path="lesson/17" element={<Lesson17 />} />
          <Route path="lesson/18" element={<Lesson18 />} />
          <Route path="lesson/19" element={<Lesson19 />} />
          <Route path="lesson/20" element={<Lesson20 />} />
          <Route path="lesson/21" element={<Lesson21 />} />
          <Route path="lesson/22" element={<Lesson22 />} />
          <Route path="lesson/23" element={<Lesson23 />} />
          <Route path="lesson/24" element={<Lesson24 />} />
          <Route path="lesson/25" element={<Lesson25 />} />
          <Route path="lesson/26" element={<Lesson26 />} />
          <Route path="lesson/27" element={<Lesson27 />} />
          <Route path="lesson/28" element={<Lesson28 />} />
          <Route path="lesson/29" element={<Lesson29 />} />
          <Route path="lesson/30" element={<Lesson30 />} />
          <Route path="lesson/31" element={<Lesson31 />} />
          <Route path="lesson/32" element={<Lesson32 />} />
          <Route path="lesson/33" element={<Lesson33 />} />
          <Route path="lesson/34" element={<Lesson34 />} />
          <Route path="lesson/35" element={<Lesson35 />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
