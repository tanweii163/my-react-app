// 第 10 课 · NoteList —— 列表渲染 + React.memo 性能优化（对应第 1、4、9 课）
//
// 本文件教什么：
// 1) .map() 渲染数组，key 用稳定的 note.id，绝不用数组下标（第 4 课）；
// 2) React.memo：给列表项包一层，props 不变就跳过重渲染（第 9 课）。
//    本页里输入搜索词时父组件频繁重渲染，但每条笔记的 props
//    （id/title/active 标志、稳定的回调引用）大多没变——
//    memo 让"正在打字的这次渲染"只重渲染真正受影响的部分。
//
// 第 9 课铁律：memo 只在"父组件重渲染频繁、子组件 props 稳定"时才有收益。
// 如果每次都传内联箭头函数给子组件，props 引用每次都变，memo 直接失效。

import { memo } from 'react'

// 列表项单独抽成组件：memo 需要包住一个组件，不能包一段 JSX。
const NoteItem = memo(function NoteItem({ note, active, onOpen, onDelete }) {
  // 开发时想验证 memo 生效，可在渲染体里临时 console.log；生产别留
  return (
    <li className={active ? 'note-item active' : 'note-item'}>
      {/* 点整行进入编辑：onOpen 把"用户点了哪条"上报给父组件（事件向上传，第 1 课思路） */}
      <button type="button" className="note-open" onClick={() => onOpen(note.id)}>
        <strong className="note-title">{note.title || '（无标题）'}</strong>
        <span className="note-preview">{note.content.slice(0, 40) || '（无内容）'}</span>
      </button>
      <button type="button" className="danger" onClick={() => onDelete(note.id)}>
        删除
      </button>
    </li>
  )
})

function NoteList({ notes, activeId, onOpen, onDelete }) {
  // 空态提示：空数组、以及"搜索无结果"由父组件区分后传入不同提示，
  // 这里只负责展示——列表组件不关心为什么是空的（单一职责）
  if (notes.length === 0) {
    return (
      <section className="card">
        <h2>笔记列表</h2>
        <p className="hint">这里空空的。点上面"新建笔记"写第一条吧。</p>
      </section>
    )
  }

  return (
    <section className="card">
      <h2>笔记列表（{notes.length}）</h2>
      <ul className="note-list">
        {notes.map((note) => (
          <NoteItem
            key={note.id} // 稳定 key：id，不是下标
            note={note}
            active={note.id === activeId}
            onOpen={onOpen}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </section>
  )
}

export default NoteList
