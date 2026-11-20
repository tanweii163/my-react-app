// 本文件教什么：一个"会在渲染期爆炸"的组件——错误边界课程的人造故障源。
// 真实项目里没人故意 throw，但渲染期抛错的真实场景很多：
//   后端返回 null 却直接 .map()、除以 0 后 toFixed、访问 undefined 的属性……
// 效果都一样：错误沿组件树向上冒泡，直到被某个错误边界接住；没人接 → 整棵树被卸载 → 白屏。
// 注意这个 throw 写在【渲染过程】里（render 函数体内），所以错误边界才能接住——
// 事件回调、setTimeout、promise 里抛的错它都接不到（见讲义"捕获范围"一节）。
import { useState } from 'react'

function BuggyCounter({ label = '计数器' }) {
  const [count, setCount] = useState(0)

  // 渲染期抛错：只要 count 超过 3，本次渲染直接炸掉。
  // 铁律：throw 必须发生在"算 JSX"的过程中，边界才有机会接住。
  if (count > 3) {
    throw new Error(`${label} 渲染爆炸了（count = ${count}）`)
  }

  return (
    <div>
      <p className="big-number">{count}</p>
      <div className="row">
        <button onClick={() => setCount(c => c + 1)}>+1（点满 4 次引爆）</button>
        <button onClick={() => setCount(0)}>归零</button>
      </div>
    </div>
  )
}

export default BuggyCounter
