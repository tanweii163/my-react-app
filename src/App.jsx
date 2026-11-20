// 第 1 课 · JSX 基础
//
// JSX 不是字符串，也不是模板 —— 它是 JavaScript 的语法扩展，
// 最终会被编译成普通的函数调用（React.createElement）。
//
// 核心规则：
// 1. 一个组件必须返回“一个”根元素 —— 所以常见外面包一层 <div> 或空标签 <></>
// 2. {} 里可以写任何 JS 表达式，结果会被渲染出来
// 3. class 要写成 className，因为 class 是 JS 的保留字
// 4. 标签必须闭合：<img /> <br /> <input />
import './App.css'
import Greeting from './components/Greeting.jsx'
import Counter from './components/Counter.jsx'
import TodoList from './components/TodoList.jsx'

// 纯函数原则：渲染过程中不该调用 new Date() 这类“每次结果都可能不同”的函数，
// 否则每次重新渲染页面显示都可能变。这里在模块加载时算一次。
const today = new Date().toLocaleDateString('zh-CN')

function App() {
  const name = 'React 学习者'
  const isLearning = true

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
      </main>
    </div>
  )
}

export default App
