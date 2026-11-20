// 第 16 课 · useMutation：添加资源 + invalidateQueries 失效广播
//
// 本文件教什么：
// "写操作"在 Query 里的位置是 useMutation。它和 useQuery 有三点本质区别：
//   1. 不进缓存：mutation 的结果是一次性的，没人会再读它；
//   2. 不自动发：useQuery 挂载时可能自己发请求，mutation 永远等 mutate() 调用；
//   3. 由你负责善后：写操作改变了"服务端的数据"，缓存里的旧数据就过时了，
//      必须在 onSuccess 里告诉 Query"该重新拿了"——这就是 invalidateQueries。
//
// 本课的重点是最后一点。第 11 课手写方案里，这一步要自己写：
// 提交成功后手动把新数据 set 进列表 state（还要小心别把别处的副本漏掉）。
// Query 的"失效-重取"模型把这条人工链路变成一行配置：
//   invalidateQueries(['resources']) → 标记该 key（含所有前缀匹配的子 key）
//   为过期 → 自动重新请求所有正在观察它的组件 → 各处列表一起刷新。
// 试试把 onSuccess 里的 invalidateQueries 注释掉：提交成功后列表纹丝不动，
// 要刷新页面才看得到新资源——那就是没有善后的写操作。

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addResource } from './api.js'

const CATEGORIES = ['文档', '视频', '练习']

export default function AddResourceForm() {
  // 拿到"缓存管家"本体：失效广播、手动读写缓存都靠它。
  // 它必须来自 Provider 的上下文——这就是页面要包 QueryClientProvider 的原因。
  const queryClient = useQueryClient()

  // 表单是"客户端状态"，和 Query 管的"服务端状态"无关，用普通 useState 就够。
  // 下一课的 React Hook Form 会把这块也接管掉。
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [fail, setFail] = useState(false)
  const [lastCreated, setLastCreated] = useState(null)

  const mutation = useMutation({
    // mutationFn 接收 mutate(变量) 传来的参数，返回 Promise。
    // 成功/失败由这个 Promise 决定——和第 2 课的约定一样：reject 就是失败。
    mutationFn: (payload) => addResource(payload),
    // ★ 本课核心：写成功 → 失效广播。['resources'] 按前缀匹配，
    //   同时命中 ['resources']（面板甲乙）和 ['resources', 'copy']（对照组），
    //   所有正在观察的组件自动重取、一起刷新——一处更新，处处同步。
    //   把下面这行注释掉再提交，就能看到"没善后"的写操作长什么样。
    onSuccess: (created) => {
      setLastCreated(created)
      queryClient.invalidateQueries({ queryKey: ['resources'] })
    },
    // 失败不需要失效：服务端没变，缓存还是对的。
    // 错误对象在 mutation.error 里，下面渲染成红色提示。
  })

  function handleSubmit(e) {
    e.preventDefault() // 阻止浏览器默认提交（刷新整页）——第 1 课的老规矩
    const trimmed = title.trim()
    if (!trimmed) return
    // mutate(变量) 触发请求。注意用 mutate 而不是 mutateAsync：
    // mutate 的错误走 onError 配置，不会在组件里抛出未捕获的 Promise 异常
    mutation.mutate({ title: trimmed, category, fail })
  }

  const isEditing = mutation.isPending

  return (
    <section className="card">
      <h2>演示三 · useMutation：添加资源并让列表自动刷新</h2>
      <p>
        提交一个新资源，成功后看两件事：网络日志里先出现 <code>addResource</code>，
        紧跟着出现一条新的 <code>fetchResources</code>——后者就是 invalidateQueries
        触发的重取；面板甲乙和对照组的列表会同时多出这条资源。
      </p>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="资源标题，如：练习：手写迷你 invalidate"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isEditing}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={isEditing}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button type="submit" disabled={isEditing || !title.trim()}>
          {isEditing ? '提交中…' : '添加资源'}
        </button>
      </form>
      <div className="l16-toolbar">
        <label>
          <input
            type="checkbox"
            checked={fail}
            onChange={(e) => setFail(e.target.checked)}
          />{' '}
          模拟提交失败
        </label>
      </div>
      {mutation.isError && (
        <div className="l16-error-box">
          <p>提交失败：{mutation.error.message}</p>
          <p>
            失败时<b>没有</b>失效缓存——服务端没变，列表当然也不该变。
            关掉失败开关再试一次。
          </p>
        </div>
      )}
      {mutation.isSuccess && lastCreated && (
        <p className="hint">
          已添加「{lastCreated.title}」（id = {lastCreated.id}），缓存已失效，
          各观察者正在重取。乐观更新的写法（先改界面、失败再回滚）留在
          「动手试一试」，和第 19 课对照。
        </p>
      )}
    </section>
  )
}
