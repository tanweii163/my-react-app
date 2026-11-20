// 第 11 课页面：数据获取进阶
//
// 本文件教什么：
// 第 2 课的请求是"一次性"的：逻辑写死在 UserList 里，换个页面就得复制一遍。
// 本课把请求能力抽成通用 hook useFetch（src/components/lesson11/useFetch.js），
// 配一个 mock 分页接口 fetchUsers，演示真实页面的四个刚需：
// 可复用、可重试、可分页、防竞态。
//
// 页面上两块演示，同一个 hook 的两种用法：
//   SingleFetchDemo —— useFetch(fn, [reloadKey])：deps 驱动，依赖变了自动重新请求；
//   PaginatedList   —— useFetch(fn, []) + refetch()：手动触发，"加载更多"分页。
// 选哪种看语义：数据变化该自动重发的用 deps；用户动作触发的用 refetch。

import { useState } from 'react'
import { fetchUsers } from '../components/lesson11/fetchUsers.js'
import PaginatedList from '../components/lesson11/PaginatedList.jsx'
import { useFetch } from '../components/lesson11/useFetch.js'
import './lesson11.css'

// 用法一演示：deps 驱动。reloadKey 变化 → effect 重跑（useFetch 内部先取消
// 旧请求再发新的）→ 自动拿到新数据。这就是第 2 课"动手试一试"里
// reloadKey 方案的完成版——三态、清理、防竞态全在 hook 里，组件只管用。
function SingleFetchDemo() {
  const [reloadKey, setReloadKey] = useState(0)
  const { data, loading, error, refetch } = useFetch(
    // 这个 fn 闭包里没有会变的值，请求参数固定：第 1 页、5 条、不失败
    (signal) => fetchUsers(1, 5, false, signal),
    [reloadKey], // ← deps：reloadKey 变了就自动重新请求
  )

  return (
    <section className="card">
      <h2>用法一：deps 驱动（依赖变了自动重新请求）</h2>
      {loading && <p>加载中…</p>}
      {error && <p>出错了：{error.message}</p>}
      {data && (
        <ul>
          {data.list.map((u) => (
            <li key={u.id}>
              {u.name} —— {u.role}
            </li>
          ))}
        </ul>
      )}
      <div className="row">
        <button onClick={() => setReloadKey((k) => k + 1)}>
          重新请求（reloadKey +1）
        </button>
        <button onClick={refetch}>手动 refetch()</button>
      </div>
      <p className="hint">
        两个按钮效果一样，触发机制不同：前者改 deps 走 effect 重跑，后者直接调
        refetch。快速交替点两个按钮，旧请求会被取消、旧响应会被序号拦下——
        无论点得多快，页面永远只显示最新一次请求的结果。
      </p>
    </section>
  )
}

function Lesson11() {
  return (
    <div className="page">
      <header>
        <h1>第 11 课：数据获取进阶</h1>
        <p>
          把第 2 课"一次性"的请求，升级成可复用、可重试、可分页、防竞态的通用能力。
        </p>
      </header>
      <main>
        <SingleFetchDemo />
        <PaginatedList />
      </main>
    </div>
  )
}

export default Lesson11
