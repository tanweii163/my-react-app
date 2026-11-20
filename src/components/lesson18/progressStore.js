// 第 18 课 · Zustand 状态管理 —— 全局进度 store
//
// 本文件教什么：
//   1. 用 zustand 的 create() 造一个"不依赖 Provider"的全局 store——
//      任何组件 import 后直接用，没有第 6 课 ThemeProvider 那种"包谁谁收听"的势力范围；
//   2. store 的形状：普通对象存 lessonId → { done, note? }，
//      配合不可变更新套路（第 1 课）写 actions（toggle / markAll / reset）；
//   3. persist 中间件：一行配置让 store 自动读写 localStorage，
//      刷新页面进度不丢——第 6 课的 Context 版想做到这一点得自己手写 useEffect。
//
// 概念对比：Context 的本职是"依赖注入"（把值送到后代手里），不是状态管理；
// zustand 才是状态管理：state 存哪、怎么改、怎么订阅、要不要持久化，库全包了。
// 铁律：状态库是给"真正全局"的少量状态用的；组件自己的局部状态（表单草稿、开关）
// 依然老老实实用 useState——不是所有 state 都配进 store。
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 本课管 15 课的进度：第 1–15 课每课一个条目。
const LESSON_IDS = Array.from({ length: 15 }, (_, i) => i + 1)

// 初始进度：Map 状的普通对象（key 是 lessonId）。注意存的是浅拷贝，
// persist 写 localStorage 前会 JSON 序列化，函数放这里也会被丢掉——所以 actions 必须放在 create 外层。
const emptyProgress = () =>
  Object.fromEntries(LESSON_IDS.map((id) => [id, { done: false, note: '' }]))

// create(fn)：fn 接收 set/get，返回的 { state + actions } 就是全局唯一的 store。
// zustand 的 set 默认做"浅合并"：set({ progress: 新对象 }) 不会覆盖掉 actions，
// 这点和 React 的 setState（整体替换）不一样，但"传函数算新值"的习惯一样要保留。
const useProgressStore = create(
  // persist(配置函数, 选项)：中间件包在 create 外面。
  // name 是 localStorage 的键名；改动一发生就自动同步写入，挂载时自动读回。
  // 对比第 6 课：Context 版要持久化得自己在 Provider 里写 useEffect + localStorage，
  // 这里一个 persist 中间件搞定——"库解决了什么"的最直观例子。
  persist(
    (set, get) => ({
      progress: emptyProgress(),

      // toggle：翻转某一课的完成状态。
      // 易错点：直接 progress[id].done = !done 是可变更新——
      // zustand 靠 Object.is 比较判断要不要通知订阅者，改内层属性它看不见。
      // 必须造新对象 + 新的 progress 外层对象（第 1 课的不可变更新，在这里同样铁律）。
      toggle: (id) =>
        set((state) => ({
          progress: {
            ...state.progress,
            [id]: { ...state.progress[id], done: !state.progress[id].done },
          },
        })),

      // markAll：全部标记为完成。用 get() 读当前 state 里的 LESSON_IDS 无关紧要，
      // 这里直接用模块常量重建整份进度——一次性替换比逐个 toggle 干净。
      markAll: () =>
        set({
          progress: Object.fromEntries(
            LESSON_IDS.map((id) => [id, { done: true, note: get().progress[id].note }]),
          ),
        }),

      // reset：回到全未完成。演示"store 也能一键回到初始态"，不用刷新页面。
      reset: () => set({ progress: emptyProgress() }),
    }),
    { name: 'lesson18-progress' }, // localStorage 键名，DevTools 里搜它能看到存了什么
  ),
)

// 导出"选择器"：组件里 useProgressStore((s) => …) 只挑自己关心的那一小块。
// 铁律：选择器返回什么，组件就只在"那块变化"时重渲染——
// 比如只订阅 doneCount 的统计条，某课的 note 改了它都不会动。这是 zustand 比
// Context（value 一变全体消费者重渲染）更省的根本原因，StoreEcho.jsx 里有对照。
export const selectDoneCount = (state) =>
  LESSON_IDS.filter((id) => state.progress[id].done).length

export { LESSON_IDS }
export default useProgressStore
