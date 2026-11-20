// 第 18 课 · Zustand 状态管理 —— 页面入口
//
// 本文件教什么：页面组件只负责"编排"（把两个演示块摆在一起），
// 能力都在 components/lesson18/ 里——和第 11 课 Lesson11.jsx 的分工一脉相承。
// 对照第 6 课：Lesson6.jsx 必须先包 <ThemeProvider> 才能渲染 ThemeDemo；
// 本页不需要包任何 Provider，store 是"import 即用"的——用法差异第一眼就能看见。
import ProgressList from '../components/lesson18/ProgressList.jsx'
import StoreEcho from '../components/lesson18/StoreEcho.jsx'
import './lesson18.css'

export default function Lesson18() {
  return (
    <div className="lesson">
      <h1>第 18 课 · Zustand 状态管理</h1>
      <p className="hint">
        主题：Context 的价值是依赖注入，不是状态管理。下面左块是真实可用的进度 store（persist 到
        localStorage，勾完刷新页面试试），右块把三种跨层写法摆在一起对照。
      </p>
      <ProgressList />
      <StoreEcho />
    </div>
  )
}
