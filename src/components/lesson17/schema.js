// 第 17 课 · schema.js —— 用 zod 把表单规则集中声明成"一份合同"
//
// 本文件教什么：
// 手写受控表单（见 ControlledFormEcho.jsx）里，"名称必填、2–20 字""备注最多
// 50 字"这些规则散落在 validate() 的各个 if 里，错误消息还要去 JSX 里对号入座。
// 本文件把全部规则集中到一个 zod schema：规则和它的中文错误消息写在同一行，
// 一个字段的全部约束一眼看完。
//
// 更重要的性质：schema 是纯 JS 对象，不依赖 React——表单校验、单元测试、
// 甚至将来的后端接口都可以 import 这同一份规则。ResourceForm.jsx 通过
// zodResolver 把它接进 react-hook-form，组件里一行校验代码都不用写。
//
// 【易错点】zod 的链式规则按书写顺序执行：z.string().trim().min(...) 是先去
// 首尾空格、再数长度。顺序写反的话，"  React  " 会被当成 7 个字符去比对。
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

export const resourceSchema = z.object({
  // 名称：必填。两条 min 按顺序执行——空串先撞上"必填"，1 个字符再撞上"长度"；
  // RHF 展示的是第一条失败的消息，所以空表单看到的是"名称必填"而不是长度报错
  name: z
    .string()
    .trim() // 整形：提交时 onValid 拿到的 name 已是去空格的版本
    .min(1, '名称必填')
    .min(2, '名称至少 2 个字符')
    .max(20, '名称最多 20 个字符'),

  // URL：必填且必须能被解析成合法网址。z.url() 是 zod v4 的顶层格式校验，
  // 自定义中文消息用 { message } 传入（相当于 z.string().url() 的独立形态）
  url: z.url({ message: '请输入合法的 URL（记得带上 https://）' }),

  // 分类：枚举。只认列表里的这几个值——空字符串 '' 也会被拒，逼用户真正选择
  category: z.enum(['高优先级', '工具', '教程', '文章'], {
    message: '请选择一个分类',
  }),

  // 备注：可选（optional）。注意 RHF 的空表单里 note 是 ''，仍是合法 string，
  // 所以 max(50) 对空串恒通过——"没填"和"填了 50 字以内"都算合格
  note: z.string().max(50, '备注最多 50 字').optional(),
})

// 分类下拉的选项直接从 schema 里"抽"出来：选项列表和校验枚举永远同源，
// 将来加一个分类只改 schema 这一行，不会出现"能选但过不了校验"的漂移
export const CATEGORY_OPTIONS = resourceSchema.shape.category.options

// 表单初始值：交给 useForm 的 defaultValues，reset() 无参时也回到这里
export const EMPTY_DEFAULTS = { name: '', url: '', category: '', note: '' }

// zodResolver：把 zod schema 翻译成 react-hook-form 认识的 resolver 接口。
// RHF 在提交时拿着整份表单值调用它，拿到 { values, errors } 后决定
// 走 onValid 还是 onInvalid——这就是两个库之间的"接线盒"
export const resourceResolver = zodResolver(resourceSchema)
