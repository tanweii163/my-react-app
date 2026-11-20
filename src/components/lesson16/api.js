// 第 16 课 · mock 学习资源接口：fetchResources / addResource
//
// 本文件教什么：
// 第 11 课的 fetchUsers 只是一个"请求函数"；本课的 mock 多承担一个职责：
// 当"网络面板"。Query 的核心卖点——缓存去重、失效广播、窗口聚焦重取——
// 全部发生在你看不见的网络层。mock 在每次"真的执行"请求/提交时往日志记一笔，
// 页面把日志显示出来，"两个组件共享缓存只发一次请求"才能被亲眼看到，
// 而不是听书上说说。
//
// 和第 11 课一样的铁律：mock 的形状必须和真接口一致——
// 返回 Promise、resolve 相同结构、失败 reject 普通 Error、
// 取消 reject name === 'AbortError' 的错误（真 fetch 的行为）。
// queryFn 里把 Query 传来的 signal 交给它，换 mock 为真 fetch 时组件层零改动。

// 内置 12 条学习资源（要求 ≥10 条），字段贴近真实接口：id / title / category / minutes
// 注意：这个数组是"服务端的数据库"。addResource 成功时直接 push 进来——
// 但缓存里的旧列表不会自己变，必须靠失效重取才能看到新数据（本课主线之一）。
const ALL_RESOURCES = [
  { id: 1, title: 'React 官方文档 · Thinking in React', category: '文档', minutes: 20 },
  { id: 2, title: 'TanStack Query 官方文档 · Overview', category: '文档', minutes: 25 },
  { id: 3, title: '视频：从手写 useFetch 到 Query', category: '视频', minutes: 15 },
  { id: 4, title: '练习：给 TodoList 加上缓存', category: '练习', minutes: 30 },
  { id: 5, title: 'React 官方文档 · 你可能不需要 useEffect', category: '文档', minutes: 18 },
  { id: 6, title: '视频：queryKey 设计的三个原则', category: '视频', minutes: 12 },
  { id: 7, title: '练习：手写一个迷你 useQuery', category: '练习', minutes: 40 },
  { id: 8, title: 'MDN · AbortController', category: '文档', minutes: 10 },
  { id: 9, title: '视频：乐观更新 vs 悲观更新', category: '视频', minutes: 14 },
  { id: 10, title: '练习：invalidateQueries 失效广播实验', category: '练习', minutes: 25 },
  { id: 11, title: 'React 官方文档 · Suspense 与数据获取', category: '文档', minutes: 22 },
  { id: 12, title: '视频：服务端状态 vs 客户端状态', category: '视频', minutes: 16 },
]

// 自增主键：模拟后端"新增记录时分配 id"的行为
let nextId = ALL_RESOURCES.length + 1

// 延迟毫秒数：和第 11 课同样考虑——太短 loading 一闪而过，太长演示等得久
const NETWORK_DELAY = 700
// 写接口的延迟稍短一点，提交时不用等太久
const MUTATION_DELAY = 600

// ---------- 网络面板：请求计数 + 日志（本课 mock 独有的部分） ----------

// 请求计数：fetchResources / addResource 每真正执行一次就 +1。
// 注意"每次重试也算一次"——这正是观察重试配置的仪表。
const requestCount = { fetch: 0, mutation: 0 }

// 日志用"不可变更新"：每次写入都换成新数组。
// 页面用 useSyncExternalStore 订阅它，快照引用变了 React 才知道要重渲染
// （第 9 课的引用比较原则在这里同样生效）。
let logLines = []
const listeners = new Set()

// 时间戳带毫秒：去重/重取的时序差别只有几十毫秒，秒级时间戳看不出先后
function formatTime(d = new Date()) {
  return (
    d.toLocaleTimeString('zh-CN', { hour12: false }) +
    '.' +
    String(d.getMilliseconds()).padStart(3, '0')
  )
}

// 给组件展示 dataUpdatedAt 用：Query 还没拿到数据时它是 0，显示成占位符
export function formatTimeOrDefault(timestamp) {
  return timestamp ? formatTime(new Date(timestamp)) : '—'
}

function addLog(text) {
  // 新记录放最前面（页面上最新的事件在最上面），最多留 14 条防止无限增长
  logLines = [{ time: formatTime(), text }, ...logLines].slice(0, 14)
  listeners.forEach((fn) => fn()) // 通知所有订阅的组件重渲染
}

// 这三个函数给页面的 useSyncExternalStore 用：订阅、读快照、清空
export function subscribeNetworkLog(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener) // 返回退订函数，组件卸载时调用
}

export function getNetworkLog() {
  return logLines
}

export function clearNetworkLog() {
  logLines = []
  listeners.forEach((fn) => fn())
}

export function getRequestCount() {
  // 返回副本：外部拿到的计数是拍照瞬间的值，不会被后续请求悄悄改掉
  return { ...requestCount }
}

// ---------- 和第 11 课同款的"取消错误" ----------

// 构造 name === 'AbortError' 的错误对象，与真 fetch 被取消时抛的一致。
// Query 内部靠它区分"取消"和"失败"——mock 必须保持同名。
function makeAbortError() {
  const e = new Error('请求已取消')
  e.name = 'AbortError'
  return e
}

// ---------- 读接口：资源列表 ----------

// fetchResources({ fail, signal })
//   fail   —— true 则模拟服务器 500（默认 false）
//   signal —— Query 通过 queryFn 的参数 { signal } 传进来，用于取消
// 每次真正执行都计数并写日志（去重/重试/聚焦重取都要靠它观察）。
export function fetchResources({ fail = false, signal } = {}) {
  requestCount.fetch += 1
  addLog(`→ fetchResources()（第 ${requestCount.fetch} 次）`)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      // "响应到达"时刻：先看是否已被取消——取消的请求绝不返回数据（第 2 课语义）
      if (signal?.aborted) {
        reject(makeAbortError())
        return
      }
      if (fail) {
        // 模拟 HTTP 500：reject 普通 Error，上层的重试/错误展示都拿得到它
        reject(new Error('模拟失败：GET /api/resources 返回 500'))
        return
      }
      // resolve 一份浅拷贝：外部（比如乐观更新）改了拿到手的数据，
      // 也不会污染"服务端的数据库"
      resolve(ALL_RESOURCES.map((r) => ({ ...r })))
    }, NETWORK_DELAY)

    // 真 fetch 在 abort 信号的"瞬间"就中断，不等响应到达——mock 保持同样行为，
    // 顺手清掉定时器（第 2 课铁律：谁开的定时器谁关），{ once: true } 自动退订
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(makeAbortError())
      },
      { once: true },
    )
  })
}

// ---------- 写接口：新增资源 ----------

// addResource({ title, category, fail })
//   写操作由 useMutation 的 mutationFn 调用。和读接口的关键区别：
//   它改的是"服务端的数据库"（模块内的 ALL_RESOURCES），
//   而缓存里的旧列表毫不知情——必须靠 onSuccess 里的 invalidateQueries
//   触发重取，页面才会显示新资源。这就是"失效-重取"模型要解决的断点。
export function addResource({ title, category, fail = false } = {}) {
  requestCount.mutation += 1
  addLog(`→ addResource("${title}")（第 ${requestCount.mutation} 次）`)
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (fail) {
        reject(new Error('模拟失败：POST /api/resources 返回 500'))
        return
      }
      const created = { id: nextId++, title, category, minutes: 15 }
      ALL_RESOURCES.push(created) // 服务端数据库已更新……
      resolve({ ...created }) // ……但缓存还不知道，等失效重取才能看见
    }, MUTATION_DELAY)
  })
}
