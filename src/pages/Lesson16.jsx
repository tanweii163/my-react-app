// 第 16 课页面：TanStack Query 数据请求库
//
// 本文件教什么：
// 第 11 课手写的 useFetch 把"单个请求"做成了通用能力：三态、取消、防竞态。
// 但一份真实页面的数据还会遇到五件它管不了的事：
//   缓存（回到这个组件别再白等一次）、去重（十个组件读同一份数据只发一次请求）、
//   重试（挂了自动再试几次）、失效（数据被别人改了，所有观察者一起刷新）、
//   聚焦同步（切回浏览器标签页时补一次最新数据）。
// 手写这些要几百行；在 Query 里它们全是配置项。本课用四个演示逐个观察：
//   ① SharedCacheDemo —— queryKey 共享缓存 + 去重 + retry 重试配置
//   ② FocusDemo       —— staleTime / refetchOnWindowFocus 的观察实验
//   ③ AddResourceForm —— useMutation + invalidateQueries 失效广播
//   NetworkLog        —— mock 接口的"网络面板"，以上现象全靠它观察
//
// 关于 QueryClientProvider 的位置（本课一个重要的"课堂约定"）：
// 真实项目在入口文件（main.jsx）包一次，全应用共享一个 QueryClient。
// 但本教程的入口文件归课程统一管理（第 3 课就定好了路由与外壳），
// 第 16 课不能为了一门课去动全局——所以本课把 Provider 包在页面组件里，
// 只让 /lesson/16 这一页有自己的缓存管家。机制完全一样，
// 只是"全局"缩小成了"本页"。

import { useState, useSyncExternalStore } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import SharedCacheDemo, { FocusDemo } from '../components/lesson16/ResourceList.jsx'
import AddResourceForm from '../components/lesson16/AddResourceForm.jsx'
import {
  clearNetworkLog,
  getNetworkLog,
  getRequestCount,
  subscribeNetworkLog,
} from '../components/lesson16/api.js'
import './lesson16.css'

function Lesson16() {
  // ★ QueryClient 是"缓存管家"本体：存数据、去重、失效、调度重取全靠它。
  // 必须用 useState(() => new QueryClient()) 的函数式初始化——
  // 写成 useState(new QueryClient()) 每次渲染都会新建一个管家，
  // 上一次的缓存直接丢光，页面会表现得像永远第一次访问（且疯狂发请求）。
  // 真实项目在入口处建一个全应用共享；本课把生命周期限制在页面挂载期间，
  // 卸载即销毁，下次进来重新开始，不污染其他课。
  const [queryClient] = useState(() => new QueryClient())

  // "模拟接口失败"开关由页面统一持有：所有观察 ['resources'] 的组件读同一份
  // fail，queryFn 闭包行为才完全一致（同 key 必同 queryFn，见 ResourceList 注释）。
  const [fail, setFail] = useState(false)

  return (
    <QueryClientProvider client={queryClient}>
      <div className="page">
        <header>
          <h1>第 16 课：TanStack Query 数据请求库</h1>
          <p>
            第 11 课手写 useFetch，自己管取消、防竞态、三态；本课把剩下的
            缓存、去重、重试、失效、聚焦同步全部交给 Query 的配置项。
          </p>
        </header>
        <main>
          <div className="card">
            <h2>心智模型：服务端状态不是普通 state</h2>
            <p>
              列表数据有个"普通 state 没有的麻烦"：<b>真正的所有者在服务器</b>。
              你手里的只是某一刻的快照，会过期，也会被别人的写操作改掉。
              自己管它，就要回答五个问题：存哪（缓存）、几份组件读同一份数据怎么办（去重）、
              什么时候算过期（staleTime）、写操作之后谁去拿新的（失效）、
              用户切走又切回来要不要补一次（聚焦重取）。
            </p>
            <p>
              Query 的答案是集中一个"缓存管家"（QueryClient），每个数据用
              <b> queryKey（门牌号）</b>登记，观察者声明自己的重取偏好，写操作成功后
              <b> 失效广播</b>。剩下的取消、去重、重试、调度，管家全包——
              组件里只剩一行 <code>useQuery({'{ queryKey, queryFn }'})</code>。
            </p>
          </div>
          <NetworkLog />
          <SharedCacheDemo fail={fail} setFail={setFail} />
          <FocusDemo fail={fail} />
          <AddResourceForm />
          <div className="card">
            <h2>与手写方案对比：Query 换来了什么，付出了什么</h2>
            <p>
              <b>换来的：</b>缓存与去重（同 key 全局只发一次）、失败重试（retry 一行配置）、
              失效广播（一处更新处处同步）、聚焦重取、请求取消——这五件手写方案要么没有、
              要么每处都要自己写一遍的活，现在全是声明式配置；社区还把竞态、内存回收
              （gcTime）、DevTools 这些边角都替你想好了。
            </p>
            <p>
              <b>付出的：</b>多一层抽象和一套新概念（key 设计、staleTime/gcTime、
              invalidate 模型），多一个必须包在入口的 Provider，多 ~13KB 的包体积；
              出问题时调试的是库的内部状态机，不再是自己写的 useEffect。
              判断标准：数据一旦"多组件共享 + 会被写操作改"，手写方案的成本会超过学习成本，
              值得上 Query；一次性、单组件的小请求，第 11 课的 useFetch 依然够用。
            </p>
            <p className="hint">
              完整对照表（缓存/去重/重试/失效/取消逐项对比）见 doc/lesson-16.md 的
              「与手写方案对比」小节。
            </p>
          </div>
        </main>
      </div>
    </QueryClientProvider>
  )
}

// 网络面板：展示 mock 接口的真实执行记录。
// mock 是 React 之外的普通模块，React 怎么知道"该重渲染了"？
// 用第 14 课之后该认识的 useSyncExternalStore：订阅外部数据源的官方姿势——
// 订阅函数 + 读快照函数，快照引用变了才重渲染（第 9 课的引用比较）。
function NetworkLog() {
  const log = useSyncExternalStore(subscribeNetworkLog, getNetworkLog)
  const counts = getRequestCount() // 和日志同步更新，读到的总是拍照瞬间的值

  return (
    <section className="card">
      <h2>网络面板（mock 接口的真实执行记录）</h2>
      <p className="hint">
        fetchResources 已执行 {counts.fetch} 次（重试也算）· addResource 已执行{' '}
        {counts.mutation} 次。接下来三个演示的每个结论，都要拿这里的记录来验证。
      </p>
      <pre className="l16-net-log">
        {log.length
          ? log.map((l) => `${l.time}  ${l.text}`).join('\n')
          : '（暂无请求）'}
      </pre>
      <div className="row">
        <button onClick={clearNetworkLog}>清空日志</button>
      </div>
    </section>
  )
}

export default Lesson16
