// 第 4 课 · 列表渲染与受控表单
//
// 渲染数组：用 .map() 把数据数组变成 JSX 数组。
// 每个元素必须有稳定的 key —— React 用它识别“哪个元素变了/删了”，
// 不要用数组下标当 key（列表会重排/删除时出 bug）。
//
// 受控组件：<input> 的值由 state 驱动（value + onChange），
// React 成为“唯一数据源”，输入框内容和 state 永远同步。
import { useState } from 'react'

function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: '读完第 1 课', done: true },
    { id: 2, text: '自己写一个 Counter', done: false },
  ])
  const [draft, setDraft] = useState('') // 输入框的草稿

  const addTodo = () => {
    const text = draft.trim()
    if (!text) return // 空输入直接忽略
    // 不可变更新：永远创建新数组/新对象，不要 push、不要改原对象
    setTodos((t) => [...t, { id: Date.now(), text, done: false }])
    setDraft('') // 清空输入框
  }

  const toggle = (id) => {
    setTodos((t) =>
      // 只有目标项换成新对象，其余项原样保留
      t.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo)),
    )
  }

  const remove = (id) => {
    setTodos((t) => t.filter((todo) => todo.id !== id))
  }

  return (
    <section className="card">
      <h2>列表渲染 + 受控表单</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault() // 阻止浏览器默认的表单提交（刷新页面）
          addTodo()
        }}
      >
        {/* value={draft} + onChange：输入框受 React 控制 */}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="输入待办事项，回车添加"
        />
        <button type="submit">添加</button>
      </form>

      <ul>
        {todos.map((todo) => (
          <li key={todo.id} className={todo.done ? 'done' : ''}>
            <label>
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => toggle(todo.id)}
              />
              {todo.text}
            </label>
            <button className="danger" onClick={() => remove(todo.id)}>
              删除
            </button>
          </li>
        ))}
      </ul>

      <p>
        共 {todos.length} 项，已完成 {todos.filter((t) => t.done).length} 项
      </p>
    </section>
  )
}

export default TodoList
