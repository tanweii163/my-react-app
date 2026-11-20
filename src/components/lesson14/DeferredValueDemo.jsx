// 本文件教什么：并发渲染的另一个入口——useDeferredValue。
// useTransition 管的是"更新"：你亲自控制 setState 在哪发生，把哪次 setState 标记为不急；
// useDeferredValue 管的是"值"：当 setState 调用点轮不到你管（值可能来自父组件 props、
// 第三方输入组件），但可以让 React"先用旧值渲染一版保住响应，稍后再拿新值重渲染贵的那部分"。
//
// 页面把两个值并排显示：
//   keyword         —— 紧急值，跟着输入框走，敲完立刻变；
//   deferredKeyword —— 延迟值，慢半拍跟上来；两者不等的间隙就是"正在追赶"。
// 观察点：快速敲字时 keyword 一步到位，deferredKeyword 一格一格追——它追的永远是最新值，
// 中间被跳过的旧渲染会被 React 直接丢弃（这就是"可中断"）。
import { useDeferredValue, useState } from 'react'

// 同样 2 万条，与 TransitionFilter.jsx 保持一致，方便两个演示互相印证
const SERIES = ['react', 'vue', 'angular', 'svelte', 'solid']
const ITEMS = Array.from({ length: 20000 }, (_, i) => ({
  id: i,
  name: `${SERIES[i % SERIES.length]}-${i}`,
}))

function filterItems(keyword) {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return ITEMS
  return ITEMS.filter((it) => it.name.includes(kw))
}

export default function DeferredValueDemo() {
  const [keyword, setKeyword] = useState('react')

  // useDeferredValue(值)：keyword 变化时，React 先用"旧值"渲染一版（输入框那趟不用等它），
  // 然后空出主线程，再拿"新值"重新渲染。输入框绑的是 keyword 本身，敲字天然跟手——
  // 这是它和"受控输入绑 transition state 会卡"的关键区别：延迟只发生在"值"这一层。
  const deferredKeyword = useDeferredValue(keyword)

  // 贵的部分只消费 deferredKeyword
  const shown = filterItems(deferredKeyword)

  // useDeferredValue 没有 isPending。教学替代品：两个值不相等 = 还在追赶。
  // 追上后两者自然相等，提示自动消失，不需要手动清理。
  const catchingUp = keyword !== deferredKeyword

  return (
    <section className="card">
      <h2>useDeferredValue：让"值"延迟跟随</h2>
      <p className="hint">
        输入框绑 keyword（紧急值），下面的大列表吃 deferredKeyword（延迟值）。
        快速敲字，观察两个值如何各走各的。
      </p>
      <input
        className="l14-input"
        value={keyword}
        placeholder="快速敲字，看下面两个值的差"
        onChange={(e) => setKeyword(e.target.value)}
      />
      <div className="l14-values">
        <span className="l14-value-chip">keyword = “{keyword}”</span>
        <span className="l14-value-chip">deferredKeyword = “{deferredKeyword}”</span>
        {/* 追赶提示：deferred 还没追上最新输入 */}
        {catchingUp && <span className="l14-badge">deferred 还在追赶…</span>}
      </div>
      <p className="l14-status">匹配 {shown.length} 条</p>
      <ul className={`l14-list${catchingUp ? ' l14-list-stale' : ''}`}>
        {shown.map((it) => (
          <li key={it.id}>{it.name}</li>
        ))}
      </ul>
    </section>
  )
}
