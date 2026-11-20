// 第 16 课 · useQuery 演示：缓存 key、请求去重、失败重试、窗口聚焦重取
//
// 本文件教什么：
// 三个观察者 + 一个对照组，演示 Query 的"缓存共享"：
//   - 面板甲 / 面板乙：queryKey 完全相同 ['resources'] → 共享同一个缓存格子，
//     页面加载时两个组件合起来只发一次请求（网络日志里 fetchResources 只多一条，
//     后到的组件发现同一 key 的请求正在飞，直接搭顺风车——这就是"去重"）；
//   - 对照组：key 多了一段 'copy' → 另一个缓存格子，挂载时自己再发一次请求；
//   - FocusDemo：也观察 ['resources']，但 staleTime / refetchOnWindowFocus 是
//     "观察者自己"的重取偏好——同一个 key 允许不同观察者用不同的重取策略。
// 任何一处数据更新（重取、失效广播），观察同一 key 的组件一起刷新——
// 这正是第 11 课手写 useFetch 做不到的"一处更新，处处同步"。
//
// 与第 11 课的对应关系（看代码时对照着读）：
//   手写的三态 data/loading/error   → useQuery 的 data/isPending/isError+error
//   手写的 AbortController 双保险   → queryFn({ signal })，Query 负责发号与取消
//   手写的"加载更多"手动 refetch    → 返回的 refetch()
//   手写方案没做的缓存/去重/重试    → staleTime / queryKey / retry 三个配置项

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchResources, formatTimeOrDefault } from './api.js'

// 单个"观察者"面板：渲染一份资源列表 + 这条请求自己的状态。
// 甲乙两个实例的 props 完全一致（同 key 同配置），这是演示去重的前提——
// 如果同 key 但 queryFn 不同，"发起请求的那个观察者"说了算，行为很难预测。
function ResourcePanel({ tag, fail, retry }) {
  const { data, isPending, isFetching, error, refetch, dataUpdatedAt, failureCount } = useQuery({
    // ★ queryKey：这条数据在缓存里的"门牌号"。必须是可序列化的数组
    //   （字符串/数字/对象都可以，函数和 class 实例不行）。
    //   想让几个组件共享缓存，就给它们一模一样的 key。
    queryKey: ['resources'],
    // queryFn 只在"需要数据且缓存里没有/已过期"时执行。
    // 参数里有 { signal }：把它转交给 mock，换 key / 卸载时请求真正取消——
    // 第 11 课手写的 AbortController + 请求序号，Query 内置了。
    //
    // ★ 同 key 必同 queryFn：缓存条目是按 key 共享的，而条目上的 queryFn
    //   会被"发起请求的观察者"的最新选项覆盖——如果甲乙的 queryFn 行为不一致
    //   （比如一个读 fail 一个不读），重试中间跑到谁的闭包取决于谁刚渲染过，
    //   行为无法预测。所以本页所有观察 ['resources'] 的组件都读同一份 fail
    //   （提升到页面组件的 state），queryFn 闭包行为完全一致。
    queryFn: ({ signal }) => fetchResources({ fail, signal }),
    // 失败自动重试：默认 3 次；演示里可以从父组件调成 1 次或关闭。
    // 第 11 课"动手试一试"里的自动重练习题，在这里是一行配置。
    retry,
    // 默认重试间隔是指数退避（约 1s → 2s → 4s…封顶 30s），
    // 演示改固定 700ms，重试节奏看得清
    retryDelay: 700,
  })

  return (
    <section className="l16-panel">
      <h3>
        {tag} <code className="l16-key-tag">queryKey: ['resources']</code>
      </h3>
      {isPending && <p>首次加载中…（这个 key 的缓存格子还是空的）</p>}
      {error && (
        <div className="l16-error-box">
          <p>请求失败：{error.message}</p>
          <p>已自动重试 {failureCount} 次，全部失败。</p>
          <button onClick={() => refetch()}>手动重试</button>
        </div>
      )}
      {data && (
        <>
          <ul>
            {data.map((r) => (
              <li key={r.id}>
                <span>{r.title}</span>
                <span className="l16-meta">
                  {r.category} · {r.minutes} 分钟
                </span>
              </li>
            ))}
          </ul>
          <p className="l16-panel-footer">
            {isFetching ? '重新请求中…' : `更新于 ${formatTimeOrDefault(dataUpdatedAt)}`}
          </p>
        </>
      )}
      <div className="row">
        {/* refetch 手动重取：同一 key 只会发一次请求，另一个面板的"更新于"也跟着变 */}
        <button onClick={() => refetch()} disabled={isFetching}>
          重新请求
        </button>
      </div>
    </section>
  )
}

// 对照组：key 多了一段 'copy' → 另一个缓存格子。
// 数据来源一样，但门牌不同就要自己发请求（看网络日志的计数就知道）。
// 顺带埋一个伏笔：失效是"前缀匹配"，演示三 invalidate(['resources'])
// 也会命中 ['resources', 'copy']，所以它也会被一起刷新。
function CopyKeyPanel({ fail }) {
  const { data, isPending, dataUpdatedAt } = useQuery({
    queryKey: ['resources', 'copy'],
    // 和面板甲乙同一个 queryFn（同样的 fail 参数）——
    // 同一个 key 的所有观察者必须用行为一致的 queryFn，理由见面板甲的注释
    queryFn: ({ signal }) => fetchResources({ fail, signal }),
    staleTime: Infinity, // 永远视为"新鲜"：除了失效广播，绝不自动重取
    retry: false,
  })

  return (
    <section className="l16-panel">
      <h3>
        对照组 <code className="l16-key-tag">queryKey: ['resources', 'copy']</code>
      </h3>
      <p className="hint">
        key 多一段 'copy'，就是另一个缓存格子：挂载时它自己发了一次请求
        （网络日志里 fetchResources 的计数 +1）。把它的 key 改成
        ['resources'] 再刷新页面，日志里会少一条请求——这就是 key 的全部魔法。
      </p>
      {isPending && <p>首次加载中…</p>}
      {data && (
        <p>
          拿到 {data.length} 条（和面板甲乙同一份数据源，但各存各的格子）·{' '}
          {dataUpdatedAt ? `更新于 ${formatTimeOrDefault(dataUpdatedAt)}` : ''}
        </p>
      )}
    </section>
  )
}

// 演示一：queryKey 与请求去重。甲乙两个面板同 key 同配置，
// fail / retry 由页面组件统一持有（同 key 的观察者必须行为一致，见 ResourcePanel 注释）。
export default function SharedCacheDemo({ fail, setFail }) {
  const [retry, setRetry] = useState(3)

  return (
    <section className="card">
      <h2>演示一 · queryKey：缓存共享与请求去重</h2>
      <p>
        面板甲、面板乙和演示二观察的是同一个 key <code>['resources']</code>，
        所以它们共享同一个缓存格子。最干净的观察法：先点「清空日志」，
        再点<b>任一面板</b>的「重新请求」——网络日志只会多一条 fetchResources，
        而甲乙和演示二的「更新于」会一起变成同一时刻：一次重取，服务了所有观察者。
      </p>
      <div className="l16-toolbar">
        <label>
          <input
            type="checkbox"
            checked={fail}
            onChange={(e) => setFail(e.target.checked)}
          />{' '}
          模拟接口失败
        </label>
        <label>
          失败自动重试{' '}
          <select value={retry} onChange={(e) => setRetry(Number(e.target.value))}>
            <option value={0}>关闭（retry: 0）</option>
            <option value={1}>1 次（retry: 1）</option>
            <option value={3}>3 次（默认）</option>
          </select>
        </label>
      </div>
      <p className="hint">
        拨"模拟接口失败"不会自动发请求——fail 不在 queryKey 里，它只是 queryFn
        闭包里的一个变量（对照第 11 课：用户动作不进 deps）。点任一面板的
        「重新请求」让它生效，然后盯着网络日志：每次重试都是一次真实的
        fetchResources，重试全失败才轮到红色错误盒登场。
        （页面初次加载时每个 key 会看到两条记录，那是开发模式 StrictMode
        把组件"挂载→卸载→再挂载"演练了一遍造成的翻倍；生产构建每个 key 只有一条。）
      </p>
      <div className="l16-panel-grid">
        <ResourcePanel
          tag="面板甲"
          fail={fail}
          retry={retry}
        />
        <ResourcePanel
          tag="面板乙"
          fail={fail}
          retry={retry}
        />
      </div>
      <CopyKeyPanel fail={fail} />
    </section>
  )
}

// 演示二：staleTime 与 refetchOnWindowFocus 的观察实验。
// 操作：把浏览器窗口切走再切回来，看网络日志会不会多出 fetchResources。
export function FocusDemo({ fail }) {
  const [staleTime, setStaleTime] = useState(10000)
  const [focusOn, setFocusOn] = useState(true)
  // 每秒心跳一次，让"已缓存 N 秒"活起来，才能和 staleTime 对得上
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer) // 第 2 课铁律：谁开的定时器谁关
  }, [])

  const { data, dataUpdatedAt, isFetching, isStale } = useQuery({
    queryKey: ['resources'],
    // queryFn 和面板甲乙行为一致（读同一份页面级 fail）——同一个 key 的
    // queryFn 必须一致，否则"这次重取用了谁的 queryFn"取决于谁刚渲染过，
    // 行为无法预测（详见 ResourceList 里面板甲的长注释）。
    // 而 staleTime / refetchOnWindowFocus 是重取时机，属于观察者自己的偏好，可以不同。
    queryFn: ({ signal }) => fetchResources({ fail, signal }),
    staleTime, // 数据保鲜期：期内视为"新鲜"，聚焦/挂载都不重取
    refetchOnWindowFocus: focusOn, // 窗口重新聚焦时，过期了就重取
    retry: false, // 本演示重点是"何时重取"，重试去演示一看
  })

  const ageSeconds = dataUpdatedAt ? Math.floor((now - dataUpdatedAt) / 1000) : null

  return (
    <section className="card">
      <h2>演示二 · staleTime 与 refetchOnWindowFocus：什么时候才重新请求</h2>
      <p>
        本组件也观察 <code>['resources']</code>，但它是独立的观察者：
        保鲜期和聚焦重取都由它自己配置。它的数据会和面板甲乙保持同步——
        因为它们读的是同一个缓存格子。
      </p>
      <div className="l16-toolbar">
        <label>
          staleTime（保鲜期）{' '}
          <select value={staleTime} onChange={(e) => setStaleTime(Number(e.target.value))}>
            <option value={0}>0：永远视为过期（默认）</option>
            <option value={10000}>10 秒</option>
            <option value={Infinity}>Infinity：永远新鲜</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={focusOn}
            onChange={(e) => setFocusOn(e.target.checked)}
          />{' '}
          refetchOnWindowFocus（聚焦重取）
        </label>
      </div>
      <div className="l16-status">
        {data ? (
          <>
            <span>
              更新于 {formatTimeOrDefault(dataUpdatedAt)}（已缓存 {ageSeconds} 秒）
            </span>
            <span className={isStale ? 'l16-badge l16-badge-stale' : 'l16-badge l16-badge-fresh'}>
              {isStale ? '已过期（stale）' : '新鲜（fresh）'}
            </span>
          </>
        ) : (
          <span>首次加载中…</span>
        )}
        {isFetching && <span className="l16-badge l16-badge-pending">重新请求中…</span>}
      </div>
      <p className="hint">
        实验步骤：把浏览器切到别的窗口再切回来，看网络日志。staleTime = 0
        时每次聚焦都会重取（这就是默认行为——很多人不知道 Query 这么"勤快"）；
        10 秒内切回来不会重取（数据还新鲜），超过 10 秒切回来才重取；
        Infinity 则永不因聚焦重取。把"聚焦重取"关掉再试一遍，感受这个开关的差别。
      </p>
    </section>
  )
}
