// 本文件教什么：React.memo 的"浅比较"陷阱—— props 是引用类型时，memo 会失效
// 铁律：只要父组件重渲染时传了"每次新建"的 props（内联对象、内联函数、未 memo 的计算），
// React.memo 就形同虚设，子组件照样重渲染。这就是本课要演示的反例。
import { memo } from 'react'

// 每渲染一次就打一条日志，方便在控制台观察"它到底有没有重渲染"
console.log('[ExpensiveList] 模块加载')

// memo(组件)：React 会对新旧 props 做浅比较，全相等才跳过重渲染
const ExpensiveList = memo(function ExpensiveList({ items, total, onPick }) {
  console.log('[ExpensiveList] 重渲染了！父组件的某个 props 每次都是新引用')
  return (
    <div>
      <p className="hint">
        共 {items.length} 项，求和结果：{total}
      </p>
      {/* 故意只渲染前 5 项，避免页面卡死；求和才是"贵"的部分 */}
      <ul>
        {items.slice(0, 5).map((it) => (
          <li key={it.id}>
            #{it.id} = {it.value}{' '}
            <button onClick={() => onPick(it.value)}>选中</button>
          </li>
        ))}
      </ul>
    </div>
  )
})

export default ExpensiveList
