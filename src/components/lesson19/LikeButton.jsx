// 第 19 课 · LikeButton：useOptimistic 乐观更新
//
// 本文件教什么：
// "乐观更新"= 用户一操作，UI 立刻呈现预期结果（❤️+1），请求在后台慢慢飞；
// 成功 → 结果坐实；失败 → UI 自动回滚到真实值。React 19 之前这一切全手写：
// 自己存"展示值"和"真实值"两份 state、自己 catch 回滚（第 11 课的思路）。
// React 19 的 useOptimistic 把"乐观值"交给框架管理：
//   - 乐观状态只在一次 transition 里"临时覆盖"真实 state；
//   - transition 结束（异步动作落定、真实 state 更新）→ 自动回到真实值；
//   - 失败时我们什么都不用做——真实 state 没变，UI 自然弹回原状，这就是回滚。
//
// 易错铁律：
// 1. 发乐观更新必须包在 startTransition（或 form action）里，否则没有"回滚时机"；
// 2. useOptimistic 的更新函数必须是纯函数，不能有副作用；
// 3. 成功路径必须真的 setState 更新真实值，否则乐观值一消失，点赞就"白点了"。

import { useOptimistic, useState, useTransition } from 'react'
import { likePost } from './mockApi.js'

export default function LikeButton({ fail = false }) {
  // 真实点赞数：只有服务器确认成功才 +1。它是"事实"，乐观值只是"预告"。
  const [likes, setLikes] = useState(128)
  // isPending：当前是否有还没落定的乐观更新（按钮借此显示"提交中"）。
  const [optimisticLikes, addOptimistic, isPending] = useOptimistic(
    likes,
    // 更新函数（纯函数）：声明"乐观状态下 UI 该看到什么"。
    // 这里不关心旧值是几，统一显示"真实值 + 一次待确认的赞"。
    (current) => current + 1,
  )
  const [error, setError] = useState(null)
  const [isPendingTransition, startTransition] = useTransition()

  function handleClick() {
    setError(null)
    startTransition(async () => {
      // ① 先打"欠条"：UI 立刻 +1（红字/闪烁可选），用户零等待
      addOptimistic(1)
      // ② 后台慢慢确认。await 结束时 transition 落定：
      //    成功 → 下面的 setState 改真实值，乐观值无缝变成真值；
      //    失败 → 真实值没动，乐观值自动消失 —— 这就是"自动回滚"，
      //    我们不需要写任何撤销代码（对比第 11 课手写回滚）。
      try {
        await likePost(fail)
        setLikes((n) => n + 1) // 坐实：真实值 +1
      } catch (e) {
        setError(e.message) // 只报错；回滚是框架的事
      }
    })
  }

  return (
    <section className="card">
      <h2>useOptimistic：点赞先上账，失败自动回滚</h2>
      <p className={`big-number ${isPending ? 'pending' : ''}`}>
        ❤️ {optimisticLikes}
      </p>
      <div className="row">
        <button onClick={handleClick} disabled={isPendingTransition}>
          {isPending ? '提交中…（乐观值已显示）' : '点赞'}
        </button>
      </div>
      {error && <p className="error-box">回滚了！{error}</p>}
      <p className="hint">
        开关"模拟失败"再点赞：数字先跳到 129，800ms 后弹回 128 并提示错误——
        整个回滚过程你没有写一行撤销代码。React 19 之前，这需要自己维护
        "展示值 vs 真实值"两份 state，并在 catch 里手动还原。
      </p>
    </section>
  )
}
