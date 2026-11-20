// 第 11 课 · 通用请求 hook：useFetch(fn, deps)
//
// 本文件教什么：
// 第 2 课的 UserList 把"发请求"写死在组件里：一次性的，换个页面就得复制粘贴。
// 本课把这套"loading / error / data / 清理"逻辑抽成自定义 hook
// （第 8 课：自定义 hook 就是把可复用的状态逻辑打包成 use 开头的函数），
// 组件里一行 const { data, loading, error, refetch } = useFetch(fn) 全搞定。
//
// 返回值：
//   data    —— 最近一次成功的结果（还没拿到时是 null）
//   loading —— 当前是否有请求在飞
//   error   —— 最近一次失败的错误对象（null = 没出错）
//   refetch —— 手动重新请求（"重试""加载更多"按钮都调它）
//
// 参数：
//   fn   —— 怎么请求：接收一个 AbortSignal，返回 Promise。挂载后和 refetch 时调用
//   deps —— 什么时候自动重新请求：数组元素变了 → 清理旧的 → 自动发新的；
//           传 [] 就只在挂载时请求一次，之后全靠手动 refetch
//
// 防竞态双保险（本课核心，见 doc/lesson-11.md）：
//   1. AbortController —— 把 signal 交给 fn，听得懂取消的请求源可以真取消；
//   2. 请求序号 seq   —— 每次请求发一个递增编号，只有"最新编号"的响应才能写 state。
// 为什么两个都要？AbortController 依赖请求源配合（我们的 mock 听得懂，
// 随手写的第三方封装未必懂）；seq 是纯 JS 层面的兜底：不管 fn 支不支持取消，
// 过期响应都进不了 state。取消负责"少干活"，序号负责"不出错"。

import { useCallback, useEffect, useRef, useState } from 'react'

export function useFetch(fn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true) // 挂载即请求，初始就是 true
  const [error, setError] = useState(null)

  // 请求序号：只增不减。每个请求记住自己的号码，响应回来时先"对号"：
  // 自己的号码 ≠ 最新号码 → 说明已经有更新的请求了，本次结果作废。
  const seqRef = useRef(0)
  // 当前在飞请求的 AbortController。发新请求前把旧的取消掉。
  const controllerRef = useRef(null)

  // 用 ref 装 fn，保证每次请求都调用"最新"的 fn。
  // 这是第 2 课"闭包过期值"的反向利用：run 被 useCallback([]) 固定成永久一个，
  // 如果它直接捕获第一轮渲染的 fn，那么 refetch 永远在请求第一页——翻页翻不动。
  // 存进 ref、每次渲染后同步，refetch 读到的 page/fail 才是点按钮那一刻的最新值。
  const fnRef = useRef(fn)
  useEffect(() => {
    fnRef.current = fn // 每次渲染完成后同步一次，极便宜
  })

  // run：发起一次请求。refetch 就是它，所以必须用 useCallback 固定成稳定引用——
  // 每次渲染都换新函数的话，把它传给子组件会破坏 memo（第 9 课）。
  const run = useCallback(async () => {
    const seq = ++seqRef.current // 给本次请求发号

    // 手动 refetch 不经过 effect 的清理函数，上一个在飞的请求要在这里亲手取消
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setLoading(true)
    setError(null) // 新请求开始，先清掉上一次的错误，别让旧错误挂着
    try {
      // 把 signal 交给 fn：听得懂的请求源（如真 fetch、我们的 mock）可以真正取消
      const result = await fnRef.current(controller.signal)
      // 双保险之一：拿到响应先对号——我不是最新请求，结果直接扔掉
      if (seq !== seqRef.current) return
      setData(result)
    } catch (e) {
      if (seq !== seqRef.current) return // 过期请求的失败也不算数
      if (e.name === 'AbortError') return // 主动取消不是错误（第 2 课的判断）
      setError(e)
    } finally {
      // 只有"仍是最新请求、且没被取消"才有资格改 loading：
      //  - 被新请求顶掉（seq 不匹配）→ 新请求自己管 loading
      //  - 被卸载/清理取消（aborted）→ 组件可能已经不在了，绝不 setState
      if (seq === seqRef.current && !controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [])

  // deps 由调用方决定"依赖变了自动重新请求"。
  // 这里故意传动态数组而不是字面量：fn 每次渲染都是新引用，如果把 fn 列进
  // 字面量依赖，就会每帧重新请求；而 fn 的"保鲜"已由上面的 fnRef 负责。
  // 契约：调用方传稳定的 deps（state 值或常量数组）。
  useEffect(() => {
    // run 开头的同步 setState（置 loading / 清旧 error）是"请求状态机"的一部分：
    // 挂载首跑时与初始值相同（不产生额外渲染），deps 重跑时立即给出"请求中"反馈。
    // 该规则防的是"渲染 → effect 无条件 setState → 再渲染"的连锁渲染，不是本场景。
    // eslint-disable-next-line set-state-in-effect -- 请求开始的同步置位是有意的请求语义
    run()
    // 清理函数：deps 变化或组件卸载时，取消还在飞的请求（第 2 课标准姿势）
    return () => controllerRef.current?.abort()
  }, deps) // eslint-disable-line exhaustive-deps -- deps 是本 hook 的参数契约，禁止替换成字面量，理由见上方注释块

  return { data, loading, error, refetch: run }
}
