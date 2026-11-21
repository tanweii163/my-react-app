// 第 2 课 · Props（属性）
//
// 组件就是一个“接收 props、返回 JSX”的函数。
// props 是只读的：子组件不应该修改父组件传来的数据（单向数据流）。
//
// 注意：props 对象解构了 { name, mood, children }
function Greeting({ name, mood = '🙂', children }) {
  return (
    <section className="card">
      <h2>Props 示例</h2>
      {/* 默认参数：父组件没传 mood 时用 '🙂' */}
      <p>
        你好，{name} {mood}
      </p>
      {/* children：写在 <Greeting>...</Greeting> 之间的内容 */}
      {children && <p>children 内容：{children}</p>}
    </section>
  )
}

export default Greeting
