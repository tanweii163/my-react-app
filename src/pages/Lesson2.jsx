// 第 2 课页面：useEffect 与副作用
import TimerDemo from '../components/TimerDemo.jsx'
import UserList from '../components/UserList.jsx'

function Lesson2() {
  return (
    <div className="page">
      <header>
        <h1>第 2 课：useEffect 与副作用</h1>
        <p>定时器演示清理函数；请求演示 loading / error / data 三态与 AbortController。</p>
      </header>
      <main>
        <TimerDemo />
        <UserList />
      </main>
    </div>
  )
}

export default Lesson2
