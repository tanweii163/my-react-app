// 第 25 课 · PassportChecklist —— 毕业自检清单：25 课核心概念的"验收单"
//
// 本文件教什么：
// 1. 把一门课压缩成可勾选的清单：每课至少一条"我能解释/能写出……"检查项（带课号徽章），
//    全部勾上 = 持照毕业。清单本身就是复习大纲——逐条自问，答不上就回那课的页面和讲义；
// 2. useState 的本地持久化套路（第 8 课 useLocalStorage 的迷你重演）：
//    · 读：惰性初始化 `useState(() => 从 localStorage 恢复)`——读存储是 IO，
//      绝不放进渲染体（渲染必须纯，StrictMode 下渲染还会跑两次）；
//    · 写：useEffect 监听勾选状态，一变就序列化写盘——写存储是副作用，铁律进 useEffect。
// 3. 进度百分比是派生值：永远从勾选状态现算，不另存一份 state
//    （第 20 课同款铁律——两份真相迟早打架）；
// 4. 破坏性操作（全清）先用 window.confirm 拦一道，误触不毁数据。
import { useEffect, useState } from 'react'

// localStorage 键名统一带 lesson25: 前缀——多个页面共用一个存储空间，
// 不加前缀迟早和别的数据互相覆盖（第 8 课的教训，这里沿用）。
const STORAGE_KEY = 'lesson25:passport'

// 25 条检查项：按 doc/README.md 的课程主线分成一段地基 + 三大篇章。
// 文案只在此处维护一份，UI 靠 map 渲染——数据驱动界面，加条目不改 JSX。
const SECTIONS = [
  {
    id: 'base',
    tag: '地基',
    title: '基础篇 · 第 1–10 课',
    desc: 'UI = f(state) 的全部基本功',
    items: [
      { lesson: 1, text: '我能解释 UI = f(state)，并用 useState 写计数器，说清"直接改变量 React 为什么不知道"。' },
      { lesson: 2, text: '我能写出带清理函数的 useEffect（定时器/订阅卸载即清理），说出依赖数组三种写法的区别。' },
      { lesson: 3, text: '我能解释 SPA 多页面靠前端路由而非服务器，并按"加课三步"给项目加一个新页面。' },
      { lesson: 4, text: '我能把两个组件的共同 state 提升到父组件，用回调 props 实现"子改父"。' },
      { lesson: 5, text: '我能区分"渲染要用的值进 state、渲染外的值进 useRef"，并用 ref 让输入框聚焦。' },
      { lesson: 6, text: '我能用 createContext + useContext 替代逐层 props 传主题，并说出它的代价（难追踪、粒度粗）。' },
      { lesson: 7, text: '我能把散乱的多个 setState 收敛成一个 reducer：action → 纯函数 → 新 state。' },
      { lesson: 8, text: '我能把 useState + useEffect 组合抽成自定义 Hook，并保持"与 useState 同形"。' },
      { lesson: 9, text: '我能解释渲染是"从头到尾、假设便宜"，并用 memo/useMemo/useCallback 在实测卡顿时再优化。' },
      { lesson: 10, text: '我能独立写出带 CRUD、localStorage 持久化、防抖搜索的完整小应用（学习笔记）。' },
    ],
  },
  {
    id: 'advanced',
    tag: '进阶篇',
    title: '进阶篇 · 第 11–15 课',
    desc: '从"能跑的 demo"到"可靠的工程"',
    items: [
      { lesson: 11, text: '我能写出三态 + AbortController 取消 + 序号防竞态的 useFetch，并按"变化的参数进 deps、用户动作不进"设计依赖。' },
      { lesson: 12, text: '我能用 React.lazy + Suspense 把大页面切成按需加载的 chunk，说清"首屏换交互"的权衡。' },
      { lesson: 13, text: '我能写出捕获渲染期错误的 ErrorBoundary，并说出它抓不到事件回调和异步错误。' },
      { lesson: 14, text: '我能用 useTransition / useDeferredValue 让大列表更新不卡输入，区分紧急/非紧急渲染。' },
      { lesson: 15, text: '我能用 Vitest + Testing Library 按"用户视角"写测试：渲染 → 交互 → 断言。' },
    ],
  },
  {
    id: 'libs',
    tag: '实战库篇',
    title: '实战库篇 · 第 16–20 课',
    desc: '按状态类型选对工具，像真实团队那样组装技术栈',
    items: [
      { lesson: 16, text: '我能解释 queryKey 门牌号、请求去重、staleTime 与 invalidateQueries 失效广播，并说清"写操作后必须善后缓存"。' },
      { lesson: 17, text: '我能用 react-hook-form 注册字段、用 zod schema 定义校验，把表单写成声明式配置。' },
      { lesson: 18, text: '我能说清 Zustand 何时值得上（跨组件共享 + persist 持久化），并用中间件把 store 写进 localStorage。' },
      { lesson: 19, text: '我能解释 useOptimistic / useActionState，并手写一次"乐观更新 + 失败回滚"。' },
      { lesson: 20, text: '我能在一页里组装 Query / Zustand / RHF / React 19 四个库，为每类状态选对工具。' },
    ],
  },
  {
    id: 'final',
    tag: '收官篇',
    title: '收官篇 · 第 21–25 课',
    desc: '从"会写"到"能交付"',
    items: [
      { lesson: 21, text: '我能读懂 .tsx 组件的 props 类型标注，说清类型是"编译期护栏"、运行时并不存在。' },
      { lesson: 22, text: '我能说出容器/展示、复合组件、受控/非受控等设计模式各自的适用场景。' },
      { lesson: 23, text: '我能用 CSS transition 与 key 触发动画，为列表增删做出平滑过渡。' },
      { lesson: 24, text: '我能说清 vite build 产物与 dev server 的区别，并把项目部署上线。' },
      { lesson: 25, text: '我能用这张学习护照自检全部 25 课，并为下一步（Next.js / RN / 开源）选出第一条路线。' },
    ],
  },
]

// 勾选状态的持久化：第 8 课 useLocalStorage 的"就地迷你版"。
// 教学项目各课自包含（lessonN/ 目录互不依赖），所以这里不复用 lesson8 的 hook，
// 而是把同样的两步——惰性初始化读 + useEffect 写——再走一遍。
function usePassportProgress() {
  const [checked, setChecked] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      // 用 raw !== null 判断"存没存过"，不用 if (raw)：存过的空对象字符串 "{}" 是真值，
      // 但空字符串 ""（异常数据）会被误判成"没存过"——第 8 课的同一条经验。
      return raw !== null ? JSON.parse(raw) : {}
    } catch {
      // 存储被禁用 / 旧数据是坏 JSON：退回全未勾，别让毕业页崩掉
      return {}
    }
  })

  // 勾选一变就写回 localStorage。依赖只有 checked：本组件生命周期内 key 不变，不必进依赖。
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checked))
    } catch {
      // 隐私模式 / 配额满：写失败不致命，页面照常工作，只是刷新后不保留
    }
  }, [checked])

  return [checked, setChecked]
}

export default function PassportChecklist() {
  const [checked, setChecked] = usePassportProgress()

  // 全表条目数与已勾数：全部从 checked 现算（派生值），绝不另存一份"进度" state
  const total = SECTIONS.flatMap((section) => section.items).length
  const done = SECTIONS.flatMap((section) => section.items).filter(
    (item) => checked[item.lesson],
  ).length
  const percent = Math.round((done / total) * 100)

  // 不可变更新：换新对象再 setChecked。
  // 直接改旧对象后 setChecked(同一引用)，React 看到"引用没变"就跳过重渲染。
  function toggle(lesson) {
    setChecked((prev) => ({ ...prev, [lesson]: !prev[lesson] }))
  }

  // 全清 = 回到"什么都没勾"。localStorage 不用手动 removeItem：
  // setChecked({}) 之后 useEffect 会把空对象写回去——单一数据源，改 state 即同步存储。
  function clearAll() {
    const ok = window.confirm(
      `确定要清空全部 ${done} 条勾选记录吗？此操作不可撤销。`,
    )
    if (ok) setChecked({})
  }

  return (
    <section className="card l25-checklist">
      <h2>🎓 毕业自检清单（25 课全覆盖）</h2>
      <p className="hint">
        逐条自问"我能解释 / 我能写出吗"，答不上就回那课的页面和讲义再勾。
        勾选进度写进 localStorage（key：<code>{STORAGE_KEY}</code>），刷新不丢。
      </p>

      {/* 进度区：百分比大字 + 进度条 + 全清按钮。宽度绑定派生值，CSS 过渡负责丝滑 */}
      <div className="l25-progress">
        <span className="big-number">{percent}%</span>
        <span className="l25-progress-text">
          已通过 {done} / {total} 条
        </span>
        <div
          className="l25-progress-track"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="毕业自检完成度"
        >
          <div className="l25-progress-fill" style={{ width: `${percent}%` }} />
        </div>
        <button type="button" className="l25-clear-btn" onClick={clearAll}>
          全清重来
        </button>
      </div>

      {/* 篇章分组渲染：数据驱动，每条带课号徽章。
          li 的 done 类复用 App.css 现成样式（变灰划线）——能复用就不新造 */}
      {SECTIONS.map((section) => (
        <div key={section.id} className="l25-section">
          <h3>
            <span className="l25-section-tag">{section.tag}</span>
            {section.title}
            <small>（{section.desc}）</small>
          </h3>
          <ul>
            {section.items.map((item) => (
              <li
                key={item.lesson}
                className={checked[item.lesson] ? 'l25-item done' : 'l25-item'}
              >
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(checked[item.lesson])}
                    onChange={() => toggle(item.lesson)}
                  />
                  <span className="l25-lesson-badge">第 {item.lesson} 课</span>
                  <span>{item.text}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
