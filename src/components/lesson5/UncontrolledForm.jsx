// 第 5 课 · 演示三：UncontrolledForm —— 非受控表单
//
// 第 1 课 TodoList 是"受控"：value={text} + onChange 里 setText，
// React state 是唯一数据源，每次按键都重渲染。
//
// "非受控"反过来：不写 value、不写 onChange，DOM 自己管自己的值。
// React 只在需要时（比如提交）通过 ref 或 FormData 去读一次。
//
// 对比表：
// |          | 受控（第 1 课）      | 非受控（本组件）        |
// | 谁驱动    | React state         | DOM 自己               |
// | 每次按键  | onChange 触发重渲染  | 不触发重渲染           |
// | 何时校验  | 每次输入（实时）     | 提交时（一次性）        |
// | 代码量    | 多（每个 input 一套 state + onChange）| 少    |
//
// React 19 小知识：函数组件可以直接接收 ref 作为 prop，
// 不再需要 forwardRef 包一层（本课只做 DOM ref，先知道有这回事）。
import { useRef, useState } from 'react'

function UncontrolledForm() {
  const nameRef = useRef(null)
  const formRef = useRef(null) // 整个表单节点，用来配 FormData

  // 只有"提交结果"需要显示在屏幕上，才动用 state
  const [result, setResult] = useState(null)

  const handleSubmit = (event) => {
    // 阻止浏览器默认行为：原生 form 提交会整页刷新，SPA 里几乎总是要拦掉
    event.preventDefault()

    // 读法一：通过 ref 精确读某一个 input
    const name = nameRef.current.value

    // 读法二：FormData 一次读走整个表单（input 需要有 name 属性！）
    const data = Object.fromEntries(new FormData(formRef.current))

    setResult({ name, data })
  }

  return (
    <section className="card">
      <h2>演示三：非受控表单</h2>

      {/* 注意：input 没有 value、没有 onChange —— 打字时 React 完全不知情 */}
      <form ref={formRef} onSubmit={handleSubmit}>
        <input name="nickname" ref={nameRef} placeholder="昵称" />
        <input name="email" placeholder="邮箱" />
        <button type="submit">提交</button>
      </form>

      {result && (
        <p>
          提交结果 —— ref 读到的昵称：{result.name}；
          FormData 读到的全部：{JSON.stringify(result.data)}
        </p>
      )}

      <p className="hint">
        在输入框里打字：页面不会重渲染（对比第 1 课受控表单每次按键都渲染）。
        铁律：非受控的 input 必须写 name 属性，FormData 靠它取值。
      </p>
    </section>
  )
}

export default UncontrolledForm
