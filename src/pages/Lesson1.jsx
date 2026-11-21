// 第 1 课页面：JSX、Props、State
// 从 App.jsx 拆出来 —— 路由让“每课一页”，App.jsx 只当布局外壳
import Greeting from '../components/lesson1/Greeting.jsx'
import Counter from '../components/lesson1/Counter.jsx'
import TodoList from '../components/lesson1/TodoList.jsx'

function Lesson1() {
  const name = 'React 学习者'
  const isLearning = true

  return (
    <div className="page">
      <header>
        <h1>第 1 课：JSX、Props、State</h1>
        <p>
          你好，{name}！今天是学习 React 的第 {isLearning ? '一' : '零'} 天。
        </p>
        <p>表达式可以出现在任何地方：{2 + 3}、{'字符串'.toUpperCase()}、{today}</p>
      </header>
      <main>
        <Greeting name="小明" />
        <Greeting name="小红" mood="😄" />
        <Greeting name="(children 演示)">
          <em>我是写在标签里的 children</em>
        </Greeting>
        <Counter />
        <TodoList />
      </main>
    </div>
  )
}

// 模块加载时算一次（渲染函数体内 new Date() 是不纯的，见第 2 课开头）
const today = new Date().toLocaleDateString('zh-CN')

export default Lesson1
