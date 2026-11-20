// 第 20 课 · 添加资源表单：React Hook Form + Zod
//
// 本文件教什么：
// 1. RHF 的核心分工——register 把输入框"挂"进表单状态，handleSubmit 负责校验与提交，
//    formState.errors 存着每个字段的校验错误，直接内联渲染（验证点：非法 URL 被拦下）；
// 2. 校验规则写在 Zod schema 里，组件里一行 zodResolver(schema) 接上。
//    规则集中一处、与 UI 解耦：换项目校验照样用，测试也好写；
// 3. 和第 1/5 课手写受控表单对比：不再为每个字段写 value/onChange/useState，
//    不再手写"提交前逐字段检查"。RHF 帮你管理表单状态，Zod 帮你声明规则。
//
// 与 useResources.js 的协作：本组件只管"输入合法化"，
// 校验通过后把干净数据交给 onAdd（内部是 Query 的 useMutation）——
// 表单库管输入、Query 管服务器状态，各司其职，谁也不越界。

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// —— 校验规则（Zod schema）：整张表单的"法律条文"都写在这里 ——
// 注意：故意不给输入框加 required / type="url" 等 HTML 原生校验，
// 让 Zod 全权负责——原生校验会在提交前静默拦截，你根本看不到 Zod 的错误提示。
const resourceSchema = z.object({
  title: z
    .string()
    .trim() // 先去首尾空格再查长度：' a ' 算 1 个字，'   ' 直接拦下
    .min(2, '标题至少 2 个字')
    .max(40, '标题最多 40 个字'),
  // z.url() 是 Zod v4 的顶层 URL 校验（替代旧写法 z.string().url()）。
  // 再加一道 refine 限定协议：z.url 也放行 ftp://，教学项目只要 http/https。
  url: z
    .url('请输入合法的 URL（记得带上 https:// 或 http://）')
    .refine((u) => /^https?:/i.test(u), '仅支持 http/https 协议'),
  // 输入框给的一定是字符串（即使 type="number" 也是 string），
  // z.coerce.number() 先转数字再校验——这就是它存在的意义。
  // 清空后提交会得到 '' → 转成 0 → 命中 min 的错误，天然给出友好提示。
  lessonId: z.coerce
    .number('课号必须是数字')
    .int('课号必须是整数')
    .min(1, '课号范围是 1–20')
    .max(20, '课号范围是 1–20'),
})

function AddResourceForm({ onAdd, isAdding }) {
  const {
    register, // 把 <input> 注册进 RHF：name 对上 schema 的 key，值与错误自动归位
    handleSubmit, // 包一层"校验 → 通过才调你给的函数"的提交处理器
    reset, // 提交成功后清空表单
    formState: { errors, isSubmitted },
  } = useForm({
    resolver: zodResolver(resourceSchema), // 校验权交给 Zod
    defaultValues: { title: '', url: '', lessonId: 1 }, // 受控初值；lessonId 给 1 免得空表单
    mode: 'onTouched', // 字段碰过 + 失焦后才即时校验；提交时全量校验（默认行为）
  })

  // handleSubmit(validFn)：只在校验全通过时调用 validFn。
  // onAdd 内部是 mutateAsync——失败会 throw，在这里接住并留在表单上，
  // 用户的输入一个字都不丢（清空 reset 必须放在成功之后，顺序就是正确性）。
  const submit = handleSubmit(async (data) => {
    try {
      await onAdd(data)
      reset({ title: '', url: '', lessonId: data.lessonId }) // 保留课号，方便连续添加同一课的资源
    } catch {
      // 失败提示由 Board 统一展示（mutation.error），这里什么都不用做：
      // 表单值保持原样，用户改一改再提交即可。
    }
  })

  // 错误内联展示的统一写法：<p className="field-error">{errors.xxx?.message}</p>。
  // errors.xxx 存在 = 该字段当前非法；?. 兜住"还没有错误"的 undefined。
  return (
    <form className="l20-form" onSubmit={submit} noValidate>
      {/* noValidate：关掉浏览器原生校验（title 属性那套），把舞台完全交给 Zod */}
      <div className="l20-field">
        <label htmlFor="res-title">标题</label>
        <input
          id="res-title"
          type="text"
          placeholder="例如：TanStack Query 官方教程"
          {...register('title')}
        />
        {errors.title && <p className="field-error">{errors.title.message}</p>}
      </div>

      <div className="l20-field">
        <label htmlFor="res-url">URL</label>
        <input
          id="res-url"
          type="text"
          placeholder="https://…（故意输个非法地址试试拦截）"
          {...register('url')}
        />
        {errors.url && <p className="field-error">{errors.url.message}</p>}
      </div>

      <div className="l20-field">
        <label htmlFor="res-lesson">适用课号（1–20）</label>
        <input id="res-lesson" type="number" {...register('lessonId')} />
        {errors.lessonId && (
          <p className="field-error">{errors.lessonId.message}</p>
        )}
      </div>

      <div className="row">
        <button type="submit" disabled={isAdding}>
          {isAdding ? '添加中…' : '添加资源'}
        </button>
        {/* isSubmitted：点过一次提交后，字段级别改一处就即时重校验，反馈更跟手 */}
        {isSubmitted && (
          <span className="hint">红色提示会随修改即时消失/更新</span>
        )}
      </div>
    </form>
  )
}

export default AddResourceForm
