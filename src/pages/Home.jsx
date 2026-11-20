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
  {
    path: '/lesson/4',
    title: '第 4 课 · 状态提升与组件通信',
    desc: 'props 下行、事件上行；兄弟组件共享父 state；温度转换双输入',
    files: ['src/pages/Lesson4.jsx', 'src/components/lesson4/'],
  },
  {
    path: '/lesson/5',
    title: '第 5 课 · useRef 与 DOM 操作',
    desc: 'ref 是不触发渲染的盒子；什么进 state 什么进 ref；非受控表单',
    files: ['src/pages/Lesson5.jsx', 'src/components/lesson5/'],
  },
  {
    path: '/lesson/6',
    title: '第 6 课 · useContext 与跨层传值',
    desc: 'props 钻透的痛点；createContext + useContext；主题切换实战',
    files: ['src/pages/Lesson6.jsx', 'src/components/lesson6/'],
  },
  {
    path: '/lesson/7',
    title: '第 7 课 · useReducer 与复杂状态',
    desc: 'reducer 纯函数集中状态迁移；action 语义化；不可更新',
    files: ['src/pages/Lesson7.jsx', 'src/components/lesson7/'],
  },
  {
    path: '/lesson/8',
    title: '第 8 课 · 自定义 Hook',
    desc: '逻辑与 UI 分离；useLocalStorage、useDebounce',
    files: ['src/pages/Lesson8.jsx', 'src/components/lesson8/'],
  },
  {
    path: '/lesson/9',
    title: '第 9 课 · 渲染机制与性能优化',
    desc: '何时重渲染；React.memo、useMemo、useCallback；先测量再优化',
    files: ['src/pages/Lesson9.jsx', 'src/components/lesson9/'],
  },
  {
    path: '/lesson/10',
    title: '第 10 课 · 综合实战：学习笔记应用',
    desc: '整合 1–9 课：CRUD、localStorage 持久化、防抖搜索、reducer、memo',
    files: ['src/pages/Lesson10.jsx', 'src/components/lesson10/'],
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
