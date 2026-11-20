// 第 20 课 · 看板主体：两种状态并存的"沙盘"
//
// 本文件教什么：
// 1. 上半张看板 = 本地状态（zustand progressStore）：勾进度、点星标，
//    数据在 localStorage，刷新页面不丢；统计值全部现算现派生，绝不另外存一份；
// 2. 下半张看板 = 服务器状态（TanStack Query）：资源列表、加载/错误/重试，
//    添加走 useMutation + invalidate（列表自动刷新），点赞走 useOptimistic（卡片内）；
// 3. 一个页面里两类状态各归各位——这是 16–19 四课合体的答案：
//    服务器状态归 Query（缓存/重试/失效），本地状态归 Zustand（轻量持久），
//    表单输入归 RHF+Zod（校验与提交），提交体验归 React 19（乐观更新）。
//
// 设计取舍：Board 不往下传整包 store，也不传整包 query 结果——
// 每个子组件只拿到它要的那几根props。数据从哪来是 Board 的事，
// 子组件保持"给什么画什么"的纯展示性（和第 9 课 memo 的前提一脉相承）。

import { useState } from 'react'
import useProgressStore, { selectRecord } from './progressStore.js'
import useResources from './useResources.js'
import AddResourceForm from './AddResourceForm.jsx'
import ResourceCard from './ResourceCard.jsx'

// 1–15 课的短名：进度网格用。第 16–20 课是新库/实战，没有"预习进度"语义，不进网格。
const LESSONS = [
  { id: 1, title: 'JSX/Props/State' },
  { id: 2, title: 'useEffect' },
  { id: 3, title: 'React Router' },
  { id: 4, title: '状态提升' },
  { id: 5, title: 'useRef' },
  { id: 6, title: 'useContext' },
  { id: 7, title: 'useReducer' },
  { id: 8, title: '自定义 Hook' },
  { id: 9, title: '性能优化' },
  { id: 10, title: '综合实战 I' },
  { id: 11, title: '数据获取进阶' },
  { id: 12, title: '懒加载' },
  { id: 13, title: '错误边界' },
  { id: 14, title: '并发渲染' },
  { id: 15, title: '测试入门' },
]

// 单个课格子：只吃 props，自己不订阅 store——
// 这样它是纯展示组件；订阅放父层（本页 15 格 × 各自订阅也行，但统一入口更好测）。
function LessonTile({ lesson, record, onToggleDone, onToggleStar }) {
  return (
    <div className={`l20-tile${record.done ? ' done' : ''}`}>
      <label className="l20-tile-done">
        <input
          type="checkbox"
          checked={record.done}
          onChange={() => onToggleDone(lesson.id)}
        />
        <span>
          第{lesson.id}课 · {lesson.title}
        </span>
      </label>
      <button
        type="button"
        className="l20-tile-star"
        onClick={() => onToggleStar(lesson.id)}
        aria-label={record.starred ? `取消星标第${lesson.id}课` : `星标第${lesson.id}课`}
      >
        {record.starred ? '★' : '☆'}
      </button>
    </div>
  )
}

function Board() {
  // —— 本地状态区：订阅 zustand ——
  // zustand v5 铁律：一次订阅返回"新对象"会无限重渲染。多个字段要么分别订阅（本页写法），
  // 要么 useShallow 浅比较。这里 progress 是稳定引用（只在 set 时换新），单独订阅很安全。
  const progress = useProgressStore((s) => s.progress)
  // action 是 create 时定死的函数，引用永远不变，单独订阅零开销
  const toggleDone = useProgressStore((s) => s.toggleDone)
  const toggleStar = useProgressStore((s) => s.toggleStar)
  const resetProgress = useProgressStore((s) => s.reset)

  const [hideDone, setHideDone] = useState(false)

  // —— 服务器状态区：订阅 Query ——
  const {
    resources,
    isLoading,
    error,
    refetch,
    addResource,
    isAdding,
    addError,
    invalidateResources,
  } = useResources()

  // 统计值 = 派生，不是状态。15 条数据现算几微秒，不值得 useMemo；
  // 铁律：能在 render 里算出来的，就不要塞进 state（两份真相迟早打架）。
  //
  // 只显示"未完成"时先过滤：hideDone 是 UI 偏好，不该写进 store（它不需要持久化）。
  // rec(id)：局部小助手，包一层 selectRecord，统计与过滤共用同一份兜底逻辑
  const rec = (id) => selectRecord({ progress }, id)
  const doneCount = LESSONS.filter((l) => rec(l.id).done).length
  const starredCount = LESSONS.filter((l) => rec(l.id).starred).length
  const visibleLessons = hideDone ? LESSONS.filter((l) => !rec(l.id).done) : LESSONS

  return (
    <>
      {/* —— 上半张：1–15 课进度网格（本地状态） —— */}
      <section className="card">
        <h2>课程进度（第 1–15 课）</h2>
        <p className="hint">
          勾选/星标都会写进 localStorage（zustand persist）——勾几个，刷新页面试试。
        </p>

        <div className="row l20-stats">
          <span>
            完成 <strong>{doneCount}</strong> / {LESSONS.length}
          </span>
          <span>
            星标 <strong>{starredCount}</strong>
          </span>
          <label className="l20-filter">
            <input
              type="checkbox"
              checked={hideDone}
              onChange={(e) => setHideDone(e.target.checked)}
            />
            只看未完成
          </label>
          {doneCount > 0 && (
            <button type="button" onClick={resetProgress}>
              清空进度
            </button>
          )}
        </div>

        <div className="l20-grid">
          {visibleLessons.map((lesson) => (
            <LessonTile
              key={lesson.id}
              lesson={lesson}
              record={rec(lesson.id)}
              onToggleDone={toggleDone}
              onToggleStar={toggleStar}
            />
          ))}
          {/* 全勾完 + 开着"只看未完成"时网格会空：给一句反馈而不是静默空白 */}
          {visibleLessons.length === 0 && (
            <p className="hint">全部完成，没有要看的了 🎉</p>
          )}
        </div>
      </section>

      {/* —— 下半张：学习资源（服务器状态） —— */}
      <section className="card">
        <h2>学习资源库</h2>
        <p className="hint">
          列表来自 TanStack Query（内置 mock 服务器）。添加成功会 invalidate
          缓存自动重取；给资源点 ⭐ 是乐观更新，勾上"点赞失败"可看回滚。
        </p>

        {/* 表单：输入合法化交给 RHF+Zod；提交交给 Query 的 useMutation */}
        <AddResourceForm onAdd={addResource} isAdding={isAdding} />
        {addError && (
          <p className="field-error">添加失败：{addError.message}（输入已保留）</p>
        )}

        <h3>资源列表（{resources.length}）</h3>
        {/* 请求状态机三态互斥展示——和第 2/11 课手写的结构一致，只是状态由 Query 提供 */}
        {isLoading && <p className="hint">资源加载中…</p>}
        {error && (
          <p className="field-error">
            资源加载失败：{error.message}{' '}
            <button type="button" onClick={() => refetch()}>
              重试
            </button>
          </p>
        )}
        {!isLoading && !error && (
          <ul className="l20-res-list">
            {resources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onLikeSettled={invalidateResources}
              />
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

export default Board
