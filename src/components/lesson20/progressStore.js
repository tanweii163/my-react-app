// 第 20 课 · 全局进度仓库：zustand + persist
//
// 本文件教什么：
// 1. zustand 的最小用法——create 一份"组件树外面"的 store，谁需要谁订阅，
//    不需要 Provider（对比第 6 课的 Context：省掉层层包 Provider + 默认浅比较防重渲染）；
// 2. persist 中间件——一行配置把 state 同步进 localStorage，
//    勾完进度刷新页面、明天再开浏览器都还在（验证点之一）；
// 3. 更新不可变 state 的标准姿势：整张 progress 表换成新对象，
//    单条记录也换成新对象（lessonId → { done, starred }），绝不原地改。
//
// 与第 18 课（lesson18）的关系：同一套模式，这里独立实现，
// 因为第 20 课是综合实战——把前面学的库在一个真实页面上各自归位：
// 本文件只管"本地状态"（用户的勾选与星标），服务器状态（资源列表）归 useResources.js 的 Query 管。
//
// 铁律：store 里的数据是"应用状态"，不是"数据库"。
// 它只存 UI 关心的最小事实（每课完成没、星标没），统计值全部在组件里派生（见 Board.jsx）。

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// persist 的 key：localStorage 里就用这个名字存。换名字 = 老数据"丢"（其实是读不到）。
const STORAGE_KEY = 'lesson20-progress'

// 生成一条记录的默认值：没勾过 = 未完成 + 未星标。
// 用函数而不是字面量，避免所有课共享同一个对象引用（改一个等于改全部）。
const emptyRecord = () => ({ done: false, starred: false })

// 订阅用的选择器：组件里 useProgressStore((s) => selectRecord(s, id))。
// 放在模块层而不是 store 方法里是有意的——store 方法内部读 get() 拿到的不是响应式数据，
// 误用会导致"改了 store 但组件不更新"；选择器进 useProgressStore(...) 才是订阅。
export const selectRecord = (state, lessonId) =>
  state.progress[lessonId] ?? emptyRecord()

const useProgressStore = create(
  // persist(create(...), options)：包装后，每次 set 都自动写一份到 localStorage，
  // 页面加载时自动读回来 merge 进初始 state。name 是必填的存储 key。
  persist(
    (set) => ({
      // 状态形状：{ [lessonId]: { done, starred } }。
      // 惰性创建——没碰过的课根本不存在这条 key，读的时候用 emptyRecord 兜底。
      progress: {},

      // 切换某课的"完成"。三个不可变要点：
      //   ① progress 整体换新对象（zustand 靠 Object.is 判断"变没变"，原地改等于没改）；
      //   ② 目标课的记录换新对象，别的课的记录原样保留（引用不变 → 依赖它们的组件不白渲染）；
      //   ③ 只动一个字段，另一个字段从旧记录带过来。
      toggleDone: (lessonId) =>
        set((state) => {
          const old = state.progress[lessonId] ?? emptyRecord()
          return {
            progress: {
              ...state.progress,
              [lessonId]: { ...old, done: !old.done },
            },
          }
        }),

      // 切换某课的"星标"。结构和 toggleDone 完全同构——
      // 写第二遍时你会自然看出可以抽成 updateRecord(lessonId, patch)，
      // 这就是 zustand 把"action 就是个普通函数"的好处：想抽就抽，没有范式约束。
      toggleStar: (lessonId) =>
        set((state) => {
          const old = state.progress[lessonId] ?? emptyRecord()
          return {
            progress: {
              ...state.progress,
              [lessonId]: { ...old, starred: !old.starred },
            },
          }
        }),

      // 清空重来：回到"什么都没碰过"。persist 会在这次 set 之后自动把空表写回 localStorage，
      // 所以不需要手动清存储——state 是源头，存储只是它的快照。
      reset: () => set({ progress: {} }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      // version + migrate：存储结构将来变了（比如加 expTime 字段），
      // 把 version 提到 2 并在 migrate 里改写旧数据，老用户的 localStorage 不会变成脏数据。
      migrate: (persisted) => persisted,
    },
  ),
)

export default useProgressStore
