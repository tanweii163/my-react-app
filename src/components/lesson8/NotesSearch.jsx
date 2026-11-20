// 第 8 课 · NotesSearch：自定义 Hook 的实战组合
//
// 本文件教什么：自定义 Hook 用起来和官方 Hook 一模一样，还能自由组合。
//
// 这个组件只做“接线”，两件可复用逻辑各自住在自己的 Hook 里：
//   useDebounce     —— 管“输入防抖”
//   useLocalStorage —— 管“数据持久化”
// 组件自己只剩 UI 该操心的事：输入框、列表、按钮。
// 这就是“组件管 UI，Hook 管逻辑”的分工。
import { useState } from 'react'
import useDebounce from './useDebounce.js'
import useLocalStorage from './useLocalStorage.js'

// 预置笔记只作为 useLocalStorage 的“初始值”：
// 第一次访问时被写进 localStorage，之后一直以 localStorage 里的数据为准。
const DEFAULT_NOTES = [
  { id: 1, title: 'Hook 规则', text: '只在最顶层调用 Hook，不要在循环、条件或嵌套函数里调用，否则每次渲染的调用顺序可能对不上。' },
  { id: 2, title: 'useState 是快照', text: '一次渲染中的 state 是一份快照，set 函数只影响下一次渲染，不会当场改掉这份快照。' },
  { id: 3, title: 'useEffect 清理函数', text: '定时器、事件订阅、请求都要清理：effect 返回一个函数，React 在下次执行前和卸载时调用它。' },
  { id: 4, title: '状态要放对位置', text: '多个组件要用同一份状态时，把它提升到最近的公共父组件，再用 props 传下去。' },
  { id: 5, title: 'useRef 不触发渲染', text: 'ref.current 变化不会让组件重新渲染，适合存定时器 id、DOM 引用这类“标签”数据。' },
  { id: 6, title: 'Context 解决层层传参', text: 'Provider + useContext 让深层组件直接读到祖先的数据，不用 props 一层层转发。' },
  { id: 7, title: '不可变更新', text: '永远创建新数组/新对象再 setState，不要 push 或直接改字段——React 靠引用变化才发现数据变了。' },
  { id: 8, title: '自定义 Hook 的本质', text: '名字以 use 开头、内部调用其他 Hook 的普通函数；组件管 UI，Hook 管可复用逻辑。' },
]

export default function NotesSearch() {
  // 两次 Hook 调用各自拥有独立的状态——Hook 不是全局共享的，每次调用一份
  const [notes, setNotes] = useLocalStorage('notes', DEFAULT_NOTES) // 持久化
  const [keyword, setKeyword] = useState('') // 输入框的即时值
  const debouncedKeyword = useDebounce(keyword, 300) // 停顿 300ms 后才更新的值

  // 过滤只用 debounced 值：列表最多 300ms 才动一次，不跟着每次按键抖
  const searching = debouncedKeyword.trim().toLowerCase()
  const filtered = searching
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(searching) ||
          n.text.toLowerCase().includes(searching),
      )
    : notes

  // 两个值不一致 = 用户刚敲了字、防抖还没结束——正好拿来做视觉对比
  const pending = keyword !== debouncedKeyword

  // 不可变更新（第 4 课知识）：只把目标项换成新对象
  const toggleStar = (id) => {
    setNotes((ns) => ns.map((n) => (n.id === id ? { ...n, starred: !n.starred } : n)))
  }

  return (
    <section className="card">
      <h2>实战：NotesSearch（防抖搜索 + localStorage 持久化）</h2>
      <p>
        搜索框每敲一个字，左边的「原始 keyword」立刻变；右边的「debounced」要等你停手
        300ms 才跟上。列表只用右边的值过滤——这就是防抖省请求的道理。
      </p>

      <input
        className="note-search"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="搜索笔记标题或内容…"
      />

      {/* 防抖对比面板：同一个输入，两个时间尺度的值 */}
      <div className="debounce-compare">
        <div className="compare-item">
          <span className="compare-label">原始 keyword（每敲一键就变）</span>
          <code>{keyword || '（空）'}</code>
        </div>
        <div className="compare-item">
          <span className="compare-label">debouncedKeyword（停顿 300ms 才变）</span>
          <code>{debouncedKeyword || '（空）'}</code>
        </div>
        <span className={pending ? 'badge pending' : 'badge synced'}>
          {pending ? '⏳ 防抖中…' : '✅ 已同步'}
        </span>
      </div>

      <p className="match-count">
        共 {notes.length} 条笔记，匹配 {filtered.length} 条
      </p>

      <ul className="note-list">
        {filtered.map((n) => (
          <li key={n.id}>
            <div>
              <strong>{n.title}</strong>
              <p>{n.text}</p>
            </div>
            <button
              className="star-btn"
              onClick={() => toggleStar(n.id)}
              aria-label={n.starred ? '取消星标' : '加星标'}
            >
              {n.starred ? '⭐' : '☆'}
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li>没有匹配的笔记，换个关键词试试。</li>}
      </ul>

      <div className="row">
        <button onClick={() => setNotes(DEFAULT_NOTES)}>重置笔记</button>
      </div>

      <p className="hint">
        试试持久化：点几颗 ⭐（或点「重置笔记」），然后刷新页面——改动还在。
        打开 DevTools → Application → Local Storage，能看到 key 为 lesson8:notes 的数据。
        注意输入框的 keyword 并没有持久化，刷新后是空的：哪些状态要“记住”，是你设计时决定的。
      </p>
    </section>
  )
}
