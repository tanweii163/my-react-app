// 第 20 课页面 · 综合实战 II：课程进度看板
//
// 本文件教什么：
// 1. QueryClientProvider 的"作用域"决策——Query 的缓存实例从哪里来？
//    真实项目在 main.jsx 包一次全应用共享；本项目是多课教学沙盒，
//    每个用 Query 的课自建 client（useState(() => new QueryClient())），
//    各课缓存互不干扰，也演示了 Provider 作用域这个通用概念；
// 2. 为什么包在 useState 初始化器里而不是直接 new——组件渲染体每次都要跑，
//    直接 new 会造出无数 client（ref 也在飞、缓存全丢）；初始化器只跑一次；
// 3. 页头统计 = 从 zustand store 派生完成率进度条——
//    Lesson20（页头）和 Board（网格）是两个订阅点，store 一变两边同步，
//    这就是"组件树外仓库"的意义：不用层层传 props（对比第 4 课状态提升）。
//
// 四库分工（本页是总装车间，见 doc/lesson-20.md 知识点回扣表）：
//   Query 管服务器状态 → useResources.js；Zustand 管本地状态 → progressStore.js；
//   RHF+Zod 管表单输入 → AddResourceForm.jsx；React 19 管提交体验 → ResourceCard.jsx。
// 页面本身只做两件事：提供 Provider 作用域 + 摆放页头，编排交给 Board.jsx。

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import useProgressStore from '../components/lesson20/progressStore.js'
import Board from '../components/lesson20/Board.jsx'
import './lesson20.css'

// 完成率统计的口径：第 1–15 课（与 Board 的网格一致——16–20 课是本课与新库章节，
// 没有预习进度语义）。Header 与 Board 是两个独立订阅点，口径必须一致，否则两处数字对不上。
const LESSONS_TRACK = Array.from({ length: 15 }, (_, i) => i + 1)

function CompletionBar() {
  // 只订阅 progress：action 不变不用订阅，切片订阅让重渲染范围最小
  const progress = useProgressStore((s) => s.progress)
  // 口径对齐：只数 1–15 的 key。万一 store 里有别的 key 混进来，也不会污染页头数字
  const done = LESSONS_TRACK.filter((id) => progress[id]?.done).length
  // 派生：百分比与宽度全从 progress 现算，不另存一份状态（两份真相迟早打架）
  const percent = Math.round((done / LESSONS_TRACK.length) * 100)

  return (
    <div className="l20-completion">
      <div className="l20-completion-label">
        总完成率（第 1–15 课）：{percent}%（{done}/{LESSONS_TRACK.length}）
      </div>
      {/* 进度条本体：外槽 + 内条，宽度用内联样式绑定派生值——CSS 过渡负责丝滑 */}
      <div
        className="l20-completion-track"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="l20-completion-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function Lesson20() {
  // useState 初始化器：函数只会在首次渲染跑一次，client 只建一次。
  // 直接写成 const client = new QueryClient() 的话，每次渲染都 new 一个——缓存全丢。
  const [queryClient] = useState(() => new QueryClient())

  return (
    <div className="page">
      <header>
        <h1>第 20 课：综合实战 II —— 课程进度看板</h1>
        <p>
          16–19 课的四个库在这里合体：Zustand 记你的进度（刷新不丢），
          TanStack Query 供资源列表（添加自动刷新），React Hook Form + Zod
          把关表单（非法 URL 拦下），React 19 的 useOptimistic 让点赞秒回（失败回滚）。
          讲义见 <code>doc/lesson-20.md</code>。
        </p>
        {/* 页头统计：从 progressStore 派生的完成率进度条 */}
        <CompletionBar />
      </header>

      {/* Provider 作用域：只有这棵子树里的 useQuery/useQueryClient 用这个 client。
          Board 及其子孙（表单、卡片）都吃这层上下文——和第 6 课 Context 一个道理。 */}
      <QueryClientProvider client={queryClient}>
        <Board />
      </QueryClientProvider>
    </div>
  )
}

export default Lesson20
