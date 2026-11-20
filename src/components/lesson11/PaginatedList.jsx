// 第 11 课 · 分页列表：加载更多 + 每条请求独立状态 + 失败重试
//
// 本文件教什么：
// "加载更多"是分页的经典交互：新数据**追加**到已有列表后面，而不是替换。
// 它和第 2 课一次性请求的本质区别：每次请求的 loading/error 只影响"这一条
// 请求自己的状态区"，已经加载好的列表永远完整地留在页面上不被清空。
//
// 本组件的三个关键取舍：
//   1. useFetch 的 deps 传 []：翻页是用户点按钮触发的，走手动 refetch()，
//      列表只在挂载时自动请求第一页；
//   2. "下一页是几"（nextPage）不放 deps：它只在请求成功后前进，
//      若放进 deps，页码一变就自动发请求，"手动翻页"就变成"自动连发"了；
//   3. "模拟失败"开关（fail）也不放 deps：它只该影响**下一次**请求，
//      放 fn 里、在请求发起那一刻读最新值（useFetch 内部的 fnRef 保鲜）。
// 一句话原则：数据变化该自动重发的才进 deps；用户动作触发的，用 refetch。

import { useEffect, useState } from 'react'
import { fetchUsers } from './fetchUsers.js'
import { useFetch } from './useFetch.js'

const PAGE_SIZE = 8 // 每页 8 条；30 条数据 → 4 页，演示"到底"正合适

function PaginatedList() {
  // 已追加进列表的所有用户（跨多次请求累积——这是"追加渲染"的本体）
  const [items, setItems] = useState([])
  // 下一页页码：初始请求第 1 页；只在请求**成功**后 +1（见下方追加 effect）。
  // 失败重试时不 +1——重试的就是失败的那一页，所以永远不会跳页漏数据。
  const [nextPage, setNextPage] = useState(1)
  // "模拟失败"开关：勾上后，下一次请求会失败（正在飞的请求不受影响）
  const [fail, setFail] = useState(false)

  const { data, loading, error, refetch } = useFetch(
    // fn 在"每次请求发起那一刻"才被调用（不是渲染时），
    // 所以这里读到的 nextPage / fail 都是点按钮那一刻的最新值
    (signal) => fetchUsers(nextPage, PAGE_SIZE, fail, signal),
    [], // 手动翻页模式：挂载时自动请求第一页，之后全靠 refetch
  )

  // 新一页到达后的"追加"动作：列表拼上新页 + 页码前进。
  // 必须写在 effect 里——渲染过程必须纯，不能顺手 setItems（第 2 课铁律：
  // 渲染里 setState 会再触发渲染，写在这里等于每次渲染都重复追加）。
  // 依赖 [data]：data 是每次请求新产出的对象，它一变就说明"新一页到了"。
  // 失败重试时 data 没变，这个 effect 不会执行——nextPage 不动，重试同一页。
  useEffect(() => {
    if (!data) return // 还没有任何成功结果（初始 null），没东西可追加
    // 该规则防的是"渲染 → effect 无条件 setState → 再渲染"的连锁渲染；
    // 这里只在 data 变化（新页真正到达）时执行一次，是"响应外部数据"的标准模式。
    // eslint-disable-next-line set-state-in-effect -- 对到达数据的追加是有意的副作用
    setItems((prev) => [...prev, ...data.list])
    setNextPage(data.page + 1)
  }, [data])

  // 统计与"加载更多"按钮的显示，全部从 data 派生，不额外存 state（第 2 课：能算就别存）
  const total = data?.total
  const hasMore = data ? data.hasMore : true // 第一页还没回来时，先乐观地假设还有

  return (
    <section className="card">
      <h2>分页用户列表（useFetch + fetchUsers）</h2>

      <div className="row lesson11-toolbar">
        <label>
          <input
            type="checkbox"
            checked={fail}
            onChange={(e) => setFail(e.target.checked)}
          />
          模拟失败（对下一次请求生效）
        </label>
        <span className="lesson11-stats">
          {total == null
            ? '统计加载中…'
            : `已加载 ${items.length} / 共 ${total} 条 · 第 ${data.page} 页`}
        </span>
      </div>

      {/* 列表本体：只渲染已成功追加的数据，任何请求的 loading/error 都不清空它 */}
      <ul>
        {items.map((u) => (
          <li key={u.id}>
            <span>
              {u.id}. {u.name}
            </span>
            <span>
              {u.role} · {u.city}
            </span>
          </li>
        ))}
      </ul>

      {/* ↓ 以下是"当前这一条请求"的独立状态区，三种互斥局面 */}
      {loading && <p className="lesson11-loading">第 {nextPage} 页加载中…</p>}

      {error && (
        <div className="lesson11-error">
          <p>第 {nextPage} 页加载失败：{error.message}</p>
          <button onClick={refetch}>重试第 {nextPage} 页</button>
          <p className="hint">提示：关掉上面的"模拟失败"再点重试即可成功。</p>
        </div>
      )}

      {!error && hasMore && (
        <button className="lesson11-more" onClick={refetch} disabled={loading}>
          {loading ? '加载中…' : '加载更多'}
        </button>
      )}
      {!error && !hasMore && (
        <p className="hint">到底啦：{total} 条数据全部加载完毕。</p>
      )}
    </section>
  )
}

export default PaginatedList
