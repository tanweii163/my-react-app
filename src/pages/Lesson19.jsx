// 第 19 课 · use() API 附带演示：一个组件里读 Promise
//
// use() 是 React 19 新增的"读取值"的 API，和普通 Hook 的区别：
// 它可以在条件语句/循环里调用（因为它不是真正的 Hook）。
// 常见两种用法：use(promise) 读异步数据（配合 Suspense）、use(Context) 读上下文。
// 这里演示第一种：模块级造一个已 resolve 的 promise，组件里一行 use(promise) 拿到值。
// 真实项目里这个 promise 通常来自请求库或框架 loader（如 react-router 的 loader）。

import { useState } from 'react'
import { use, Suspense } from 'react'
import LikeButton from '../components/lesson19/LikeButton.jsx'
import CommentForm from '../components/lesson19/CommentForm.jsx'
import './lesson19.css'

// 一个立刻 resolve 的 promise：演示用。真实场景它是"正在进行的请求"，
// 未 resolve 时 use() 会 suspend，外层的 <Suspense> 负责显示 fallback。
const greetingPromise = Promise.resolve('你好，我来自 Promise（use() 读取）')

function Greeting() {
  // 一行读取 promise 结果。promise 已 resolve，所以不会真正挂起；
  // 若没 resolve，这里会暂停渲染，交由外层 Suspense 显示 loading。
  const message = use(greetingPromise)
  return <p className="use-demo">{message}</p>
}

function Lesson19() {
  // 一个"模拟失败"开关，同时喂给点赞和评论两个演示，方便集中控制
  const [fail, setFail] = useState(false)

  return (
    <div className="page">
      <header>
        <h1>第 19 课：React 19 新特性 · Actions 与乐观更新</h1>
        <p>
          表单提交 = 异步 action 成为第一公民；useActionState 接管
          pending / error / success 三态；useOptimistic 先给 UI 打欠条，失败自动回滚。
        </p>
      </header>
      <main>
        <section className="card">
          <h2>全局开关：模拟失败</h2>
          <label className="toggle">
            <input
              type="checkbox"
              checked={fail}
              onChange={(e) => setFail(e.target.checked)}
            />
            模拟失败（下一次提交 800ms 后返回 HTTP 500）
          </label>
          <p className="hint">
            失败路径必须主动演练（第 11 课的习惯）：先关掉开关点几次看"成功落定"，
            再打开开关操作，观察乐观值回滚和错误提示。
          </p>
        </section>

        <LikeButton fail={fail} />
        <CommentForm fail={fail} />

        <section className="card">
          <h2>附：use() API —— 在组件里直接读 Promise / Context</h2>
          <Suspense fallback={<p>加载中…</p>}>
            <Greeting />
          </Suspense>
          <p className="hint">
            use(promise) 让"异步值"像普通数据一样写在渲染体里；promise 未完成时组件
            暂停渲染，由外层 Suspense 兜底。它还能读 Context：use(SomeContext)，
            且可以在 if 语句里调用（这是它和普通 Hook 最大的区别）。
          </p>
        </section>
      </main>
    </div>
  )
}

export default Lesson19
