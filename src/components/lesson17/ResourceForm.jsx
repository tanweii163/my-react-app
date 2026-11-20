// 第 17 课 · ResourceForm —— react-hook-form + zod 的标准姿势
//
// 本文件教什么：
// 对照 ControlledFormEcho.jsx（手写受控版），同样的 4 个字段，这里是库方案：
//   1. useForm 只出现一次，字段值、错误、提交状态全部归它管；
//   2. {...register('字段名')} 把输入框"登记"进 RHF——输入不再触发重渲染（非受控）；
//   3. 校验规则一行都不写在组件里，全部委托给 schema.js 的 zod schema（单一事实来源）；
//   4. handleSubmit(onValid, onInvalid) 把"通过/失败"分流到两个回调，组件里没有 if 校验；
//   5. watch('url') 订阅一个字段做实时预览——代价是每次击键都重渲染，用之前想清楚。
//
// 【铁律】register 必须展开：{...register('name')}。register 返回
// { name, onChange, onBlur, ref } 对象，其中 ref 是 RHF 摸到真实输入框的唯一通道。
// 写成 register('name')（不展开）或者漏掉展开，这个字段的值就永远收不到。
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { CATEGORY_OPTIONS, EMPTY_DEFAULTS, resourceResolver } from './schema.js'

// 假装网络往返 600ms：让 isSubmitting 有戏可演（真实项目里这就是 await api.save()）
const fakeNetwork = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms))

// "填充示例"按钮用的数据：演示 reset(带参)——用给定值填表，顺带清空全部错误
const SAMPLE = {
  name: 'React 官方文档',
  url: 'https://react.dev',
  category: '教程',
  note: '第 17 课的示例数据',
}

function ResourceForm() {
  // 组件自己的 state 只剩"展示结果"两件事；字段值与错误全在 RHF 手里
  const [lastSubmitted, setLastSubmitted] = useState(null)
  const [invalidSummary, setInvalidSummary] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    reset,
    // formState 是个 Proxy：读到哪个属性，就订阅哪个属性的更新。
    // 只解构你真正要渲染的（errors / isSubmitting），别一把梭 ...formState
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: resourceResolver, // ← 校验规则来自 schema.js，组件里一行规则都不写
    defaultValues: EMPTY_DEFAULTS, // ← 出厂设置；reset() 无参时回到这里
  })

  // watch('url')：把 url 这一个字段"拉回"受控世界——每次击键都重渲染本组件。
  // 拿到的是输入框此刻的原文、没经过 schema 校验：预览要宽容，提交才严格。
  //
  // oxlint 会在这行报 react/incompatible-library：React Compiler 认为 RHF 的
  // watch 返回值无法安全 memo、可能读到旧值。这里 watch 只喂给本组件自己的
  // 预览盒、不外传给 memo 过的子组件，行为符合预期，局部豁免这一条
  // oxlint-disable-next-line react/incompatible-library
  const previewUrl = watch('url')

  // onValid：只有 schema 全部通过才会被调，参数 values 是"解析后的数据"
  // （zod 的 .trim() 等整形已生效）。它可以是 async，RHF 自动维护 isSubmitting
  const onValid = async (values) => {
    await fakeNetwork()
    setLastSubmitted(values)
    setInvalidSummary('')
    reset() // 无参 reset：回到 defaultValues，errors、isSubmitting 一并复位
  }

  // onInvalid：任一字段校验失败就整体走这里，参数是按字段分好组的 errors。
  // 对比手写版：这里没有 if (校验失败)，通过与否已被库分流到不同回调
  const onInvalid = (errs) => {
    setInvalidSummary(Object.keys(errs).join('、'))
  }

  return (
    <section className="card">
      <h2>库方案：react-hook-form + zod</h2>

      {/* handleSubmit 内部自己会 preventDefault，不用手写 e.preventDefault() */}
      <form className="lesson17-form" onSubmit={handleSubmit(onValid, onInvalid)}>
        <div className="lesson17-field">
          <label htmlFor="res-name">资源名称</label>
          <input id="res-name" placeholder="如：React 官方文档" {...register('name')} />
          {/* 内联错误：组件只管"有错就展示"，消息本身来自 schema.js */}
          {errors.name && <p className="lesson17-error">{errors.name.message}</p>}
        </div>

        <div className="lesson17-field">
          <label htmlFor="res-url">URL</label>
          <input id="res-url" placeholder="https://..." {...register('url')} />
          {errors.url && <p className="lesson17-error">{errors.url.message}</p>}
        </div>

        {/* 实时预览：watch 的经典用法。previewUrl 可能还是半截网址，点不开没关系 */}
        <div className="lesson17-preview">
          实时预览（watch('url')）：
          {previewUrl ? (
            <a href={previewUrl} target="_blank" rel="noreferrer">
              {previewUrl}
            </a>
          ) : (
            <span className="hint"> 在上方输入 URL，这里实时变成可点的链接</span>
          )}
        </div>

        <div className="lesson17-field">
          <label htmlFor="res-category">分类</label>
          <select id="res-category" {...register('category')}>
            {/* 空值选项逼用户主动选择：'' 会被 zod enum 用中文消息拒绝 */}
            <option value="">请选择…</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {errors.category && <p className="lesson17-error">{errors.category.message}</p>}
        </div>

        <div className="lesson17-field">
          <label htmlFor="res-note">备注（可选）</label>
          <textarea id="res-note" rows={2} placeholder="最多 50 字，可留空" {...register('note')} />
          {errors.note && <p className="lesson17-error">{errors.note.message}</p>}
        </div>

        <div className="row">
          {/* isSubmitting 在 onValid 的 await 期间为 true：按钮禁用 + 文案变化 */}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '提交中…' : '提交'}
          </button>
          {/* 【铁律】form 里的 button 不写 type 默认是 submit——
              下面两个辅助按钮必须显式 type="button"，否则点"重置"会顺手把表单也提交一遍 */}
          <button type="button" onClick={() => reset()}>
            重置（reset() 回默认值）
          </button>
          <button type="button" onClick={() => reset(SAMPLE)}>
            填充示例（reset(对象)）
          </button>
        </div>
      </form>

      {/* onInvalid 的战果：一眼看出哪几个字段没过——手写版要自己拼这份清单 */}
      {invalidSummary && (
        <p className="lesson17-error">
          校验没过，出错字段：{invalidSummary}（这就是 handleSubmit 的第二个参数 onInvalid）
        </p>
      )}

      {/* onValid 收到的 values：注意 name 已被 schema 的 .trim() 整形过了 */}
      {lastSubmitted && (
        <div className="lesson17-result">
          <p>最近一次 onValid 收到的 values：</p>
          <pre>{JSON.stringify(lastSubmitted, null, 2)}</pre>
        </div>
      )}
    </section>
  )
}

export default ResourceForm
