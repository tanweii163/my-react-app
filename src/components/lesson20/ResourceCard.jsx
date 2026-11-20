// 第 20 课 · 资源卡片：useOptimistic 乐观点赞（React 19）
//
// 本文件教什么：
// 1. 乐观更新（optimistic update）——点 ⭐ 的瞬间数字 +1（不等服务器），
//    服务器成功就"顺手承认"，失败就把 +1 悄悄收回去（回滚，验证点之一）；
// 2. useOptimistic 的机制——乐观值只活在"过渡（transition）"期间：
//    startTransition 的 async 函数跑完（成功或失败），React 自动回滚到真实值。
//    回滚是自动的，你唯一要做的是保证"真实值"最终正确（成功后 invalidate 重取）；
// 3. 失败开关——每张卡片一个"点赞失败"复选框，用来人为制造服务器 500，
//    亲眼看到"先 +1，约 600ms 后弹回 + 提示"。测错误路径要靠开关，不能靠祈祷（lesson11 的老规矩）。
//
// 与其他库的配合：本组件不碰 Query 缓存——点赞成功后调 onLikeSettled
// （由 Board 提供 = invalidateResources），等重取完成后过渡结束，
// 界面数字已经是服务器确认过的最新值，不会闪一下旧数字。

import { useOptimistic, useState, useTransition } from 'react'
import { likeResource } from './useResources.js'

function ResourceCard({ resource, onLikeSettled }) {
  // 真实值是 Query 给的 likes（服务器承认的数字）；乐观值叠加在它上面
  const [likes, addOptimisticLike] = useOptimistic(
    resource.likes,
    // reducer：每次 addOptimisticLike(增量) 时算"此刻应该显示几"。
    // 纯函数，不能在这里发请求——它只是"显示器"，不是"执行器"。
    (current, delta) => current + delta,
  )
  const [isPending, startTransition] = useTransition()
  const [fail, setFail] = useState(false) // 失败开关：本卡片独立
  const [likeError, setLikeError] = useState(null)

  // 点 ⭐：乐观值立刻 +1 → 发请求 → 成功则重取同步真实值；失败则由过渡结束自动回滚
  function handleLike() {
    setLikeError(null) // 重开一局，先清掉上一次的失败提示
    startTransition(async () => {
      addOptimisticLike(1) // ① 先"假装成功"：本轮过渡渲染里数字就是 +1
      try {
        await likeResource(resource.id, fail) // ② 真正发请求（失败开关决定成败）
        await onLikeSettled() // ③ 成功：等 invalidate 重取完成，真实值已更新
        // 过渡在此结束 → 乐观值回滚 → 但真实值已经是 +1 后的，视觉上"无感续接"
      } catch (e) {
        // 失败：不重取（数据库没变）。过渡结束时乐观值自动回滚到旧数字，
        // 我们只需补一条提示解释"为什么弹回去"。
        setLikeError(e.message)
      }
    })
  }

  return (
    <li className="l20-res-item">
      <span className="l20-res-lesson">L{resource.lessonId}</span>
      <div className="l20-res-main">
        {/* 外链资源：真实项目里跳文档站，这里 target 空白页防丢失课程进度 */}
        <a href={resource.url} target="_blank" rel="noreferrer">
          {resource.title}
        </a>
        {/* 点赞失败时显示旧值 + 提示；成功后显示服务器确认的值 */}
        {likeError && <span className="field-error"> {likeError}（已回滚）</span>}
      </div>

      <div className="l20-res-actions">
        <label className="l20-fail-toggle" title="打开后点 ⭐ 会模拟服务器失败">
          <input
            type="checkbox"
            checked={fail}
            onChange={(e) => setFail(e.target.checked)}
          />
          点赞失败
        </label>
        <button
          type="button"
          className="l20-like-btn"
          onClick={handleLike}
          disabled={isPending}
        >
          ⭐ {likes}
        </button>
      </div>
    </li>
  )
}

export default ResourceCard
