// 第 19 课 · CommentForm：useActionState 把"表单提交 = 异步 action"变成一等公民
//
// 本文件教什么：
// React 19 之前，一个提交表单要手写三件套：onSubmit + preventDefault（第 1、5 课）、
// 自己的 submitting state、自己的 error/success state——三态全靠人肉管理。
// React 19 的 useActionState 一并接管：
//   const [state, formAction, isPending] = useActionState(asyncFn, 初始state)
//   <form action={formAction}>  ← 注意：不是 onSubmit！
//   - asyncFn(prevState, formData)：拿到表单数据（不用再一个 input 一个 state）；
//   - state：上次 action 返回值（我们放 { error, success }）；
//   - isPending：action 执行中为 true——pending 态由 React 管，不再手写。
//
// useFormStatus：读"最近祖先 <form>"的提交状态。它必须放在表单的**子组件**里
// （Hook 依赖上层 form 注入的 Context，直写在同一个组件里读不到 form）。
// 所以我们把提交按钮抽成 SubmitButton 子组件——这也是官方推荐的拆法。

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom' // 注意：从 react-dom 导入，不是 react
import { postComment } from './mockApi.js'

// 提交按钮子组件：useFormStatus 从最近的祖先 <form> 读取提交状态。
// ⚠️ 必须是子组件：useFormStatus 的实现依赖上层 form 的 Context，
// 若把它直接写在本组件渲染体里、上方没有 <form> 包着，永远读到 pending=false。
function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}>
      {pending ? '提交中…' : '发表评论'}
    </button>
  )
}

export default function CommentForm({ fail = false }) {
  // action 定义在组件里，为的是闭包里能读到父组件传来的 fail 开关。
  // 签名铁律：(prevState, formData)，返回值就是下一次渲染的 state。
  async function submitComment(prevState, formData) {
    const text = (formData.get('text') || '').trim()
    // 校验：简单场景不依赖 zod 也能做（第 17 课的 zod 在复杂表单里再上场）
    if (!text) {
      return { error: '评论不能为空', success: null }
    }
    try {
      const saved = await postComment(text, fail)
      return {
        error: null,
        success: `已保存（服务器时间 ${saved.createdAt}）`,
        comment: saved, // 真实项目里会顺手把它塞进评论列表
      }
    } catch (e) {
      return { error: e.message, success: null }
    }
  }

  // state 初始值 { error: null, success: null }；formAction 直接绑到 <form action>
  const [state, formAction, isPending] = useActionState(submitComment, {
    error: null,
    success: null,
  })

  return (
    <section className="card">
      <h2>useActionState：三态（pending / error / success）全部由 React 管</h2>
      <form action={formAction}>
        <input
          name="text"
          placeholder="说点什么…（留空试试校验错误）"
          disabled={isPending}
        />
        <SubmitButton />
      </form>
      {state.error && <p className="error-box">❌ {state.error}</p>}
      {state.success && <p className="success-box">✅ {state.success}</p>}
      <p className="hint">
        注意对比第 1/5 课：没有 onSubmit、没有 preventDefault、没有手写
        submitting state；文本框没有 onChange（是非受控的，action 里用
        formData.get('text') 取值）。还有一个隐藏福利：action 结束后 React 19
        会**自动重置非受控表单**——成功提交后输入框自动清空，方便连续发言；
        想保留用户输入（比如失败时不许清），就让该字段受控或自己管理 value。
      </p>
    </section>
  )
}
