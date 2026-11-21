// 第 6 课 · useEffect：副作用（二）—— 数据请求
//
// 发请求是副作用里最常见的场景。标准姿势四件套：
//   loading 状态 → 请求中显示“加载中”
//   error  状态 → 失败时显示错误，而不是白屏
//   data   状态 → 成功后渲染
//   清理函数   → 竞态防护 + 取消过期请求
//
// “竞态”（race condition）：组件卸载后 setState → React 警告且无意义；
// 或连发两个请求，慢的后到覆盖了快的先到 → 界面显示旧数据。
// 清理函数就是防这两个的。
import { useEffect, useState } from 'react'

function UserList() {
  const [users, setUsers] = useState(null) // null = 还没拿到
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    // 每次挂载执行一次（依赖 []）
    const controller = new AbortController() // 用来取消请求

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/users.json', { signal: controller.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`) // fetch 对 404/500 不报错，要手动抛
        setUsers(await res.json())
      } catch (e) {
        // 被 abort 的请求会抛 AbortError，那不是真错误，忽略
        if (e.name !== 'AbortError') setError(e)
      } finally {
        // 注意：卸载后 setState 会被清理函数的 abort 拦在 catch 里，
        // 但 finally 仍会跑，所以加判断是更严谨的写法（简单场景可省）
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    load()
    return () => controller.abort() // 卸载时取消未完成的请求
  }, [])

  // 渲染分四种情况，一一对应 —— 这就是“加载/错误/空/成功”状态机
  let body
  if (loading) body = <p>加载中…</p>
  else if (error) body = <p>出错了：{error.message}</p>
  else if (!users?.length) body = <p>没有数据</p>
  else
    body = (
      <ul>
        {users
          // keyword 演示“数据到手后的派生计算”：不需要 state，直接算
          .filter((u) => u.name.includes(keyword) || u.role.includes(keyword))
          .map((u) => (
            <li key={u.id}>
              {u.name} —— {u.role}
            </li>
          ))}
      </ul>
    )

  return (
    <section className="card">
      <h2>useEffect 示例：数据请求</h2>
      <input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="筛选姓名或职位，试试“工程”"
      />
      {body}
      <p className="hint">
        思考：为什么筛选不新建一个 state 存“筛选结果”？
        —— 因为结果可以由 users + keyword 直接算出来（派生数据），
        存成 state 会多一份可能不同步的副本。
      </p>
    </section>
  )
}

export default UserList
