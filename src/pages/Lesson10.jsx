// 第 10 课页面：综合实战——学习笔记应用
//
// 本文件教什么：
// 把前九课的知识拼成一个完整的小应用。每个知识点至少用一次，对照表见 doc/lesson-10.md：
// 路由（本页挂在 /lesson/10）· 组件拆分与 props · 受控表单 · useEffect 持久化 ·
// 状态提升 · useReducer · 自定义 hook · 防抖 · React.memo。
//
// 页面级只管三件事：
// 1. 笔记集合 → 交给自定义 hook useNotes（内部是 reducer + localStorage）；
// 2. "正在编辑哪一条" editingId → 状态提升到这里的理由：
//    NoteList 要高亮它，NoteEditor 要编辑它，新建按钮要改变它——
//    多个兄弟组件共享的状态，放到最近的公共父组件（第 5 课铁律）；
// 3. 搜索词 keyword + 防抖后的 debouncedKeyword：输入框跟着 keystroke 走，
//    但"真正用来过滤列表"的是防抖后的值，避免每敲一个字就重算一次过滤。

import { useEffect, useState } from 'react'
import NoteEditor from '../components/lesson10/NoteEditor.jsx'
import NoteList from '../components/lesson10/NoteList.jsx'
import { useNotes } from '../components/lesson10/useNotes.js'
import './lesson10.css'

// 简版防抖 hook：值延迟 delay 毫秒才"生效"。
// 写在本课内部而不是复用其他课的代码，避免跨课依赖（本课要求自包含）。
// 原理：debouncedValue 变化时安排一个 setTimeout，清理函数里 clearTimeout——
// 短时间内连续输入，前一个定时器总被取消，只有最后一次输入后静满 delay 才真正更新。
// 这正是第 2 课"定时器清理"的直接应用。
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    // 清理函数：value 或 delay 变化 / 组件卸载时取消还没触发的定时器
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function Lesson10() {
  const { notes, add, update, remove } = useNotes()
  const [editingId, setEditingId] = useState(null) // null = 没有正在编辑的
  const [keyword, setKeyword] = useState('')
  const debouncedKeyword = useDebounce(keyword, 300)

  const handleNew = () => {
    const note = { title: '新笔记', content: '' }
    add(note)
    // Date.now() 生成 id（见 useNotes），新建后立刻进入编辑
    setEditingId(Date.now())
  }

  // 派生数据：过滤后的列表不进 state，渲染时直接算（第 2 课易错点 5）。
  // 用防抖后的关键词过滤，标题或内容命中都算。
  const kw = debouncedKeyword.trim()
  const visibleNotes = kw
    ? notes.filter(
        (n) => n.title.includes(kw) || n.content.includes(kw),
      )
    : notes

  // 正在编辑的那条：从全量 notes 里找（不是从过滤后的找，搜索时编辑中的项可能被过滤掉）
  const editingNote = notes.find((n) => n.id === editingId) ?? null

  return (
    <div className="page">
      <header>
        <h1>第 10 课：综合实战——学习笔记应用</h1>
        <p>
          新建 / 编辑 / 删除笔记，300ms 防抖搜索，失焦自动保存，刷新页面数据不丢。
          前九课知识点各至少用一次，对照表见 <code>doc/lesson-10.md</code>。
        </p>
      </header>
      <main>
        <section className="card">
          <h2>笔记工具栏</h2>
          <div className="row">
            <button onClick={handleNew}>新建笔记</button>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索标题或内容…（300ms 防抖）"
              style={{ flex: 1 }}
            />
          </div>
          {/* 搜索状态提示：输入了但防抖还没跟上 / 搜不到结果 */}
          {kw && visibleNotes.length === 0 && (
            <p className="hint">没有匹配「{kw}」的笔记。</p>
          )}
        </section>

        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <NoteList
              notes={visibleNotes}
              activeId={editingId}
              onOpen={setEditingId} // 点列表项进入编辑：直接把 id 设为页面级 editingId
              onDelete={(id) => {
                remove(id)
                // 删掉的正好是正在编辑的，清掉编辑态，避免编辑一条已不存在的笔记
                if (id === editingId) setEditingId(null)
              }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            {/* key={editingId}：切换编辑对象时强制重建编辑器，
                其内部 useState 初始值重新取新笔记——用 key 重置 state 是 React 官方推荐手法 */}
            {editingNote ? (
              <NoteEditor
                key={editingNote.id}
                note={editingNote}
                onChange={update}
                onDelete={(id) => {
                  remove(id)
                  setEditingId(null)
                }}
              />
            ) : (
              <section className="card">
                <h2>编辑器</h2>
                <p className="hint">
                  还没有选中笔记。点"新建笔记"，或在左侧列表点一条开始编辑。
                </p>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Lesson10
