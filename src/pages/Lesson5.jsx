// 第 5 课页面：useRef 与 DOM 操作
// 页面外壳（.page/header/main 布局类见 App.css），三个演示组件在 components/lesson5/ 下
import FocusDemo from '../components/lesson5/FocusDemo.jsx'
import StopwatchDemo from '../components/lesson5/StopwatchDemo.jsx'
import UncontrolledForm from '../components/lesson5/UncontrolledForm.jsx'

function Lesson5() {
  return (
    <div className="page">
      <header>
        <h1>第 5 课：useRef 与 DOM 操作</h1>
        <p>
          useRef 返回一个"盒子"（{'{ current: 初始值 }'}）：改 <code>.current</code>{' '}
          不触发重渲染，但跨渲染保持不变。它用来装 DOM 节点、定时器 id 等任何
          "需要记住但不需要画到屏幕上"的东西。
        </p>
      </header>
      <main>
        <FocusDemo />
        <StopwatchDemo />
        <UncontrolledForm />
      </main>
    </div>
  )
}

export default Lesson5
