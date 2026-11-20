// 第 10 课 · useNotes —— 自定义 hook：把 reducer + localStorage 打包成一个"能力"（对应第 8、4 课）
//
// 本文件教什么：
// 自定义 hook 就是一个名字以 use 开头、内部调用了其他 hook 的普通函数。
// 它能"借用" hook 的规则（lint 要求），把一段可复用的状态逻辑封装起来，
// 组件里一行 const { notes, add, update, remove } = useNotes() 就能用。
//
// 这里封装两件事：
// 1. 用 useReducer 挂上 notesReducer（第 7 课）；
// 2. 用 useEffect 做持久化：notes 一变就写 localStorage（第 4 课副作用）。
//    注意：读取只发生一次（useState/useReducer 的惰性初始化函数里），
//    "从存储加载"不是 effect，"写入存储"才是 effect——方向别搞反。

import { useEffect, useReducer } from 'react'
import { initialNotes, notesReducer } from './notesReducer.js'

const STORAGE_KEY = 'lesson10.notes'

// 惰性初始化：传函数给 useReducer，React 只在首次挂载时调用它一次，
// 而不是每次渲染都读一遍 localStorage（读存储是 IO，别放进渲染体）。
function loadInitial() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {
    // 存储损坏（比如手改过 JSON）就退回初始数据，别让页面白屏
    // eslint-disable-next-line no-empty -- 故意吞掉解析错误
  }
  return initialNotes
}

export function useNotes() {
  const [notes, dispatch] = useReducer(notesReducer, undefined, loadInitial)

  // 副作用：任何一次 notes 变化后，把最新数据写进 localStorage。
  // 依赖数组是 [notes]——这是"数据变了就同步到外部世界"的标准写法。
  // JSON.stringify 每次全量写，对这个量级完全够用；更大的数据才需要考虑增量/防抖。
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  }, [notes])

  // 对外暴露的不是 dispatch 本身，而是"意图明确"的方法：
  // 组件不需要知道 action 长什么样（封装 reducer 的细节）。
  // Date.now() 当 id：教学项目里够用；真实项目建议用 crypto.randomUUID()。
  return {
    notes,
    add: ({ title, content }) =>
      dispatch({ type: 'add', note: { id: Date.now(), title, content } }),
    update: (id, title, content) =>
      dispatch({ type: 'update', id, title, content }),
    remove: (id) => dispatch({ type: 'remove', id }),
  }
}
