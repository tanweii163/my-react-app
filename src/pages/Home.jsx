// 第 3 课 · React Router：单页应用（SPA）的多“页面”
//
// 传统网站：每个 URL 一个 HTML 文件，点链接 = 整页刷新。
// SPA：整个应用其实只有一个 HTML，路由库在 JS 里根据 URL
//      “换”出不同的组件树 —— 不刷新页面，状态不丢，切换极快。
//
// react-router 的三层结构（本项目就是这么搭的，见 src/main.jsx）：
//   <BrowserRouter>   监听 URL 变化，提供路由上下文（整个应用包一次）
//   <Routes>/<Route>  URL → 组件 的映射表
//   <Link>/<NavLink>  切换 URL 的链接（不要用 <a href>，那会整页刷新！）
import { Link } from 'react-router'

// 课程目录：加新课只需要往这里加一条 + 新建一个页面文件 + 注册一条 Route
const lessons = [
  {
    path: '/lesson/1',
    title: '第 1 课 · JSX、Props、State',
    desc: '组件是什么；props 单向数据流；useState 与事件处理；列表渲染与受控表单',
    files: ['src/pages/Lesson1.jsx', 'src/components/Greeting.jsx', 'src/components/Counter.jsx', 'src/components/TodoList.jsx'],
  },
  {
    path: '/lesson/2',
    title: '第 2 课 · useEffect 与副作用',
    desc: '渲染后执行；依赖数组；清理函数防泄漏；请求三态与竞态；派生数据不进 state',
    files: ['src/pages/Lesson2.jsx', 'src/components/TimerDemo.jsx', 'src/components/UserList.jsx'],
  },
]

function Home() {
  return (
    <div className="page">
      <header>
        <h1>React 学习路线</h1>
        <p>每课一个页面，代码即教材 —— 文件顶部有逐段讲解的注释。</p>
      </header>
      <main>
        {/* .map() 渲染列表 —— 第 1 课的知识在这里复用 */}
        {lessons.map((l) => (
          <section className="card" key={l.path}>
            {/* Link 只改 URL 不刷新页面；to 就是路径 */}
            <h2>
              <Link to={l.path}>{l.title}</Link>
            </h2>
            <p>{l.desc}</p>
            <p className="hint">教材文件：{l.files.join('、')}</p>
          </section>
        ))}
      </main>
    </div>
  )
}

export default Home
