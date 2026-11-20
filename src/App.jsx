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
    <div className="page">
      <header>
        <h1>第 1 课：JSX、Props、State</h1>
        <p>
          {/* 这就是 JSX 注释，写在 {} 里 */}
          你好，{name}！今天是学习 React 的第 {isLearning ? '一' : '零'} 天。
        </p>
        <p>
          表达式可以出现在任何地方：{2 + 3}、{'字符串'.toUpperCase()}、
          {today}
        </p>
      </header>

      <main>
        {/* ---- 1. Props：父组件把数据传给子组件 ---- */}
        {/* Greeting 像函数一样接收参数：name="小明" 就是在传 props */}
        <Greeting name="小明" />
        <Greeting name="小红" mood="😄" />

        {/* children 是一种特殊的 prop：写在标签中间的内容 */}
        <Greeting name="(children 演示)">
          <em>我是写在标签里的 children</em>
        </Greeting>

        {/* ---- 2. State：组件自己的、会变化的记忆 ---- */}
        <Counter />

        {/* ---- 3. 列表渲染 + 受控表单 ---- */}
        <TodoList />

        {/* ---- 4. useEffect：副作用（定时器 / 数据请求） ---- */}
        <TimerDemo />
        <UserList />
      </main>
    </div>
  )
}

export default App
