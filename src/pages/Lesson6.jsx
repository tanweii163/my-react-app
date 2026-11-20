// 第 6 课 · useContext 与跨层传值
//
// 本文件教什么：一条完整的教学主线
//   ① 痛点小节：props 钻透 —— 主题数据层层手递手，中间层苦不堪言（静态示意，不运行）
//   ② 三步走：createContext → Provider → useContext 的标准姿势
//   ③ 现场演示：三层嵌套的组件树，一个 props 都不传，最底层照样拿到主题
//   ④ 适用边界：context 适合“全局、低频”的数据，不适合“局部、高频”的数据
import ThemeDemo from '../components/lesson6/ThemeDemo.jsx'
import { ThemeProvider } from '../components/lesson6/ThemeContext.jsx'
import './lesson6.css'

// props 钻透的静态示意：这段代码只是“展示痛苦”，不会真的执行。
// 读法：theme 真正的使用者只有最底下的 UserBadge，
// 但它头顶的每一层都被迫写下「接收 theme → 再传给下一层」这两行废话。
const DRILLING_CODE = `function App() {
  const theme = 'light'                    // 数据只在这里诞生
  return <Page theme={theme} />            // ① 手递手：递给 Page
}
function Page({ theme }) {                 // ② 接下：Page 用吗？不用，但底下要用
  return <Sidebar theme={theme} />
}
function Sidebar({ theme }) {              // ③ 再接：同样不用，只为转发
  return <UserBadge theme={theme} />
}
function UserBadge({ theme }) {            // ④ 终于到了真正用它的组件
  return <div className={theme}>张三</div>
}`

function Lesson6() {
  return (
    <div className="page">
      <header>
        <h1>第 6 课：useContext</h1>
        <p>
          先看 props 一层层手递手有多痛，再用 createContext + Provider + useContext
          三步实现跨层传值。
        </p>
      </header>
      <main>
        {/* 小节 1：痛点（纯静态示意，没有真实传值） */}
        <section className="card">
          <h2>痛点：props 钻透（prop drilling）</h2>
          <p>
            想给页面做深色主题。主题 state 放在 App，可真正要用它的只有三层之下的
            UserBadge。props 只能父传子，于是每一层都得当「搬运工」：
          </p>
          <pre className="l6-drill">{DRILLING_CODE}</pre>
          <ul>
            <li>
              中间层被迫收下再转手：<code>Page</code>、<code>Sidebar</code>
              与主题毫无关系，却要为它写两行代码。
            </li>
            <li>改一个字段名（theme 改叫 mode）要动一串毫不相干的文件。</li>
            <li>层级越深越容易漏传、拼错，排查时得一层层往上翻。</li>
          </ul>
          <p className="hint">
            数据的使用者和数据的拥有者隔了三层，这就是 context 要解决的问题。
          </p>
        </section>

        {/* 小节 2：三步走 */}
        <section className="card">
          <h2>三步走：createContext → Provider → useContext</h2>
          <ol>
            <li>
              <code>{'createContext(默认值)'}</code>：造一个「广播频道」（见{' '}
              <code>src/components/lesson6/ThemeContext.jsx</code>
              ，我们故意把默认值设为 null，方便后面的防御检查）。
            </li>
            <li>
              <code>{'<ThemeContext.Provider value={...}>'}</code>{' '}
              包住需要数据的范围：数据从这里广播，包到哪，哪的后代能收听。本项目把它封装成了{' '}
              <code>&lt;ThemeProvider&gt;</code>。
            </li>
            <li>
              <code>{'useContext(ThemeContext)'}</code>
              ：后代任意一层直接取值，不需要逐层传。本项目封装成了自定义 hook{' '}
              <code>useTheme()</code>。
            </li>
          </ol>
        </section>

        {/* 小节 3：现场演示 —— 唯一真正运行的部分 */}
        <section className="card">
          <h2>现场演示：三层嵌套，零 props</h2>
          <p>
            下面的嵌套结构是 <code>ThemeDemo → Panel → DeepChild</code>
            。中间层不接收任何主题 props，最底层直接 <code>useTheme()</code> 换肤：
          </p>
          <ThemeProvider>
            <ThemeDemo />
          </ThemeProvider>
          <p className="hint">
            切到深色后注意观察：Provider 只是改了一个 state，最底下的卡片却立刻换装 ——
            还会看到 &lt;html&gt; 标签上多了 data-theme 属性（开发者工具里查看）。
          </p>
        </section>

        {/* 小节 4：适用边界 */}
        <section className="card">
          <h2>什么时候用 context，什么时候别用</h2>
          <div className="row">
            <div className="l6-fit">
              <p className="l6-fit-title">✅ 适合：全局、低频</p>
              <ul>
                <li>主题（本课）、界面语言</li>
                <li>当前登录用户</li>
                <li>全局配置开关</li>
              </ul>
            </div>
            <div className="l6-fit">
              <p className="l6-fit-title">❌ 别用：局部、高频</p>
              <ul>
                <li>输入框草稿、hover / 焦点状态</li>
                <li>每秒刷新的数字、动画数据</li>
              </ul>
            </div>
          </div>
          <p className="hint">
            原因：Provider 的 value 每次渲染都是新对象，它一重渲染，所有消费者连同子树全部重渲染。
            高频变化的数据放进去，大片组件会跟着抖 —— 局部数据老老实实用局部 state 和 props。
          </p>
        </section>
      </main>
    </div>
  )
}

export default Lesson6
