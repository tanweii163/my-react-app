// 第 10 课 · NoteEditor —— 受控表单编辑器（对应第 1、4、5 课）
//
// 本文件教什么：
// 标题 + 内容两个输入框都做成受控组件：value 来自本组件 state，
// onChange/onBlur 把修改汇报给父组件。
// "编辑中是哪一条"（editingId）提升到了 Lesson10 页面级（第 5 课状态提升），
// 因为 NoteList 高亮、新建笔记都要用到；而"输入框里的草稿文字"只有编辑器关心，留在本地。
//
// 保存时机：选择"失焦保存（onBlur）"，不设独立保存按钮。理由：
// 1) 笔记类应用的心智模型是"随时在写"，每次击键后立刻落盘最不容易丢内容；
// 2) 独立按钮要求用户记得点，切走即丢，教学上更容易演示"刷新数据不丢"这个卖点；
// 3) 失焦保存能自然覆盖"点别的笔记 → 旧的先失焦 → 先保存再切换"的场景。
// 代价是每次失焦都可能触发一次多余的 dispatch（内容没变也派发），
// 所以在 onBlur 里做了"内容没变就不派发"的短路判断。

import { useState } from 'react'

function NoteEditor({ note, onChange, onDelete }) {
  // 本地草稿：只有编辑器关心"现在输入框里是什么"。
  // 切换到别的笔记时（note.id 变了），用 key 重建组件（见 Lesson10），草稿自然重置，
  // 所以这里不需要 useEffect 去同步 props——那正是第 2 课说过的反模式。
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)

  // 字数统计：派生数据，渲染时直接算，不要放进 state（第 2 课易错点 5）
  const charCount = (title + content).length

  const handleBlur = () => {
    // 短路：和存档相比没有任何变化就不派发 action，避免无意义的 re-render
    if (title === note.title && content === note.content) return
    onChange(note.id, title, content)
  }

  return (
    <section className="card editor">
      {/* header 上的小状态：编辑的是哪条 */}
      <h2>
        编辑笔记 <span className="note-id">#{note.id}</span>
      </h2>

      <div className="row">
        <input
          className="editor-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleBlur}
          placeholder="标题"
        />
      </div>

      <div className="row">
        <textarea
          className="editor-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleBlur}
          placeholder="内容……失焦后自动保存"
          rows={8}
        />
      </div>

      <div className="row editor-footer">
        {/* 派生数据直接渲染计算结果 */}
        <span className="hint">共 {charCount} 字 · 失焦自动保存</span>
        <button className="danger" onClick={() => onDelete(note.id)}>
          删除这条笔记
        </button>
      </div>
    </section>
  )
}

export default NoteEditor
