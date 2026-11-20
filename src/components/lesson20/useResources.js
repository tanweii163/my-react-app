// 第 20 课 · 学习资源列表：TanStack Query 管"服务器状态"
//
// 本文件教什么：
// 1. Query 的基本分工——fetchResources 是"服务器"（mock），useResources 是
//    "取数 + 缓存 + 请求状态"的封装，组件只声明"我需要 resources 这份数据"，
//    loading / error / 重试 / 缓存去重 全由 Query 负责（对比 lesson11 手写的 useFetch）；
// 2. useMutation + invalidateQueries 的黄金组合——添加成功后作废缓存，
//    Query 自动重新 fetch，列表"自动刷新"（验证点之一）。
//    记住方向：不是"把新数据手动塞进列表"，而是"告诉 Query 数据过期了，请重拿"；
// 3. mock 接口的三要素（lesson11 定下的规矩）：真延迟、可失败、形状与真接口一致。
//
// 数据内置：真实项目里这张表在数据库里，这里用模块级数组模拟——
// 注意它活在"组件树外面"，和 zustand 的 store 是两码事：
// 它模拟的是服务器，不是前端状态；前端不该直接改它，只能通过"接口"间接影响。

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// —— 以下是"数据库"：≥12 条学习资源，每课的官方文档/教程链接 ——
const DB = [
  { id: 'res-01', lessonId: 1, title: 'React 官方教程：搭建第一个组件', url: 'https://zh-hans.react.dev/learn', likes: 12 },
  { id: 'res-02', lessonId: 2, title: '使用 Effect 进行数据同步', url: 'https://zh-hans.react.dev/learn/synchronizing-with-effects', likes: 9 },
  { id: 'res-03', lessonId: 3, title: 'React Router 官方文档：路由与嵌套布局', url: 'https://reactrouter.com/start/data/custom', likes: 7 },
  { id: 'res-04', lessonId: 4, title: '组件间共享状态（状态提升）', url: 'https://zh-hans.react.dev/learn/sharing-state-between-components', likes: 5 },
  { id: 'res-05', lessonId: 5, title: 'useRef 参考文档', url: 'https://zh-hans.react.dev/reference/react/useRef', likes: 4 },
  { id: 'res-06', lessonId: 6, title: 'useContext 参考文档', url: 'https://zh-hans.react.dev/reference/react/useContext', likes: 6 },
  { id: 'res-07', lessonId: 7, title: 'useReducer 参考文档', url: 'https://zh-hans.react.dev/reference/react/useReducer', likes: 3 },
  { id: 'res-08', lessonId: 8, title: '用自定义 Hook 复用逻辑', url: 'https://zh-hans.react.dev/learn/reusing-logic-with-custom-hooks', likes: 8 },
  { id: 'res-09', lessonId: 9, title: 'memo 与渲染性能优化', url: 'https://zh-hans.react.dev/reference/react/memo', likes: 5 },
  { id: 'res-10', lessonId: 11, title: 'MDN：Fetch API', url: 'https://developer.mozilla.org/zh-CN/docs/Web/API/Fetch_API', likes: 10 },
  { id: 'res-11', lessonId: 12, title: 'React.lazy：按需加载组件', url: 'https://zh-hans.react.dev/reference/react/lazy', likes: 4 },
  { id: 'res-12', lessonId: 13, title: '错误边界：捕获渲染期错误', url: 'https://zh-hans.react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary', likes: 3 },
  { id: 'res-13', lessonId: 14, title: 'startTransition 与并发特性', url: 'https://zh-hans.react.dev/reference/react/startTransition', likes: 6 },
  { id: 'res-14', lessonId: 15, title: 'Vitest 官方指南', url: 'https://vitest.dev/guide/', likes: 7 },
  { id: 'res-15', lessonId: 16, title: 'TanStack Query 核心概念', url: 'https://tanstack.com/query/latest/docs/framework/react/overview', likes: 11 },
  { id: 'res-16', lessonId: 17, title: 'React Hook Form 快速上手', url: 'https://react-hook-form.com/get-started', likes: 8 },
  { id: 'res-17', lessonId: 18, title: 'Zustand 官方文档', url: 'https://zustand.docs.pmnd.rs/getting-started/introduction', likes: 9 },
  { id: 'res-18', lessonId: 19, title: 'useOptimistic 参考文档', url: 'https://zh-hans.react.dev/reference/react/useOptimistic', likes: 5 },
]

// 自增 id：模拟数据库主键。绝不用数组长度当 id——删数据后会撞号。
let nextId = DB.length + 1

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// 读接口：GET /resources。浅拷贝 + 排序，防止外部拿到内部引用直接改（mock 也要有"边界感"）。
export async function fetchResources() {
  await delay(500) // 真延迟：让 loading 态肉眼可见，否则等于没测
  return [...DB].sort((a, b) => a.lessonId - b.lessonId)
}

// 写接口①：POST /resources。成功 = 真的进"数据库"，
// 这样 invalidate 之后重新 fetch 才拿得到新数据。
export async function addResource({ title, url, lessonId }) {
  await delay(400)
  const item = { id: `res-${String(nextId++).padStart(2, '0')}`, lessonId, title, url, likes: 0 }
  DB.push(item)
  return item
}

// 写接口②：POST /resources/:id/like。
// fail=true 时 reject——配套 useOptimistic 演示"乐观更新失败回滚"（验证点之一）。
export async function likeResource(id, fail = false) {
  await delay(600) // 比读接口更慢：给"乐观的 +1"留足可见时间
  if (fail) {
    // 模拟服务器 500：数据库没变（没加 likes），前端过一会儿就得把 +1 收回去
    throw new Error('服务器开小差了，点赞失败')
  }
  const item = DB.find((r) => r.id === id)
  if (!item) throw new Error('资源不存在')
  item.likes += 1 // 只有成功才动数据库——回滚后重新 fetch 拿到的仍是旧值
  return item
}

// Query 的缓存键：Query 靠它判断"这份数据我拿过没、过期没"。
// 带上 lesson20 前缀，避免和其他页面/实验的同名数据串缓存。
export const RESOURCES_KEY = ['lesson20', 'resources']

export default function useResources() {
  // 拿到本页（QueryClientProvider 注入）的缓存实例：invalidate 靠它指哪打哪。
  const queryClient = useQueryClient()

  // useQuery：声明式取数。组件只说"我要这份数据"，
  // isLoading / error / data 全是请求状态机的产物——不再手写 useState + useEffect。
  const query = useQuery({ queryKey: RESOURCES_KEY, queryFn: fetchResources })

  // useMutation：封装"会改服务器数据的操作"。它不像 useQuery 那样自动发起，
  // 而是给你一个触发器（mutateAsync），成功后由 invalidate 触发列表自动重取。
  const addMutation = useMutation({
    mutationFn: addResource,
    // 黄金组合：写成功 → 作废缓存 → Query 自动重新 fetch → 列表自动刷新。
    // 新手常犯的反向操作是 onSuccess 里手动 setState 拼列表——那等于自己重新实现缓存。
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RESOURCES_KEY }),
  })

  return {
    // 摊平常用的请求状态，组件代码保持"一眼看完"
    resources: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    // 添加资源的触发器：await addResource(input)——失败会 throw，表单侧好接住
    addResource: addMutation.mutateAsync,
    isAdding: addMutation.isPending,
    // 最近一次"添加"失败的错误（null = 没失败）。表单层接住 throw 保证输入不丢，
    // 错误文案由 Board 展示——表单管输入，错误呈现归页面层。
    addError: addMutation.error,
    // 供 ResourceCard 点赞成功后调用：让卡片不必知道 queryKey 细节（依赖最小化）。
    // 返回的是 invalidate 的 Promise，await 它 = 等"重取完成"，乐观值回滚时
    // 界面上已经是最新数字，不会闪一下旧值。
    invalidateResources: () =>
      queryClient.invalidateQueries({ queryKey: RESOURCES_KEY }),
  }
}
