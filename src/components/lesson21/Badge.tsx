// 第 21 课 · Badge：第一个 TypeScript 组件——给 props 立一份"书面合同"
//
// 本文件教什么：
// 1. 用 interface 声明 props 的形状：必选属性直接写（label）、可选属性加 ?（variant/size）。
//    调用方少传必选项、传错类型、字符串拼错一个字母，编辑器立刻红线——
//    而 JS 组件里这些错误都要等浏览器跑起来才（可能）发现；
// 2. 联合字面量类型（'success' | 'warning' | 'error'）：variant 的合法值只有这三个字符串。
//    比 string 严得多：'sucess'（拼错）、'info'（没定义）都是编译错误，"枚举值写错"这类 bug 被连根拔掉；
// 3. 默认值写法：解构参数时直接给（variant = 'success'），语法与 JS 的函数参数默认值完全同款。
//    可选属性（?）+ 默认值是绝配：类型上说"可以不传"，运行上"不传也有值"。
//
// 课堂铁律：类型只有"编辑器和 tsc 看得见"。Vite 会用 esbuild 把本文件剥掉类型、
// 编译成普通 JS 再交给浏览器——这个过程**只删不查**，类型错误不会阻止页面运行，
// 它们只在编辑器波浪线和 `npx tsc --noEmit` 里报（详见 doc/lesson-21.md）。

// —— Props 合同 ——
// interface vs type 怎么选？一句话：描述"对象形状"用 interface，
// 需要"联合类型 / 映射变形"时用 type。组件 props 是典型的对象形状 → 用 interface。
// 顺带一个工程习惯：interface 要 export——类型不导出，别的文件就没法引用这份合同。
export interface BadgeProps {
  /** 徽章文字。必选属性：调用处不写 label 直接编译报错（JS 里只能等 undefined 渲染出来才发现） */
  label: string
  /** 颜色语义。联合字面量类型 + 可选（?）：不传则走默认值 'success' */
  variant?: 'success' | 'warning' | 'error'
  /** 尺寸。同样是"字面量联合 + 可选"的组合 */
  size?: 'sm' | 'md'
}

// 类型标注的位置有个易错点：({ label, variant = 'success' }: BadgeProps)
// ——给"整个参数对象"标 BadgeProps，不是给每个解构出来的变量挨个标。解构默认值照常写。
export default function Badge({ label, variant = 'success', size = 'md' }: BadgeProps) {
  // 合法值有限时，字面量可以直接当 CSS 类名的一段用（lesson21.css 里有对应配色）。
  // 正因为 variant 只能取三个值，这里永远不会拼出不存在的类名——类型替样式兜了底。
  return (
    <span className={`l21-badge l21-badge--${variant} l21-badge--${size}`}>
      {label}
    </span>
  )
}

// —— 错误示范（故意只写在注释里，抄进代码 tsc 会拦下）——
// <Badge label="ok" variant="sucess" />  ← 拼错：Type '"sucess"' is not assignable to type '...' |
//                                                        '"success" | "warning" | "error"'
// <Badge variant="error" />              ← 缺必选：Property 'label' is missing in type '...'
// 这两类错误在 JS 组件里都能安静上线；在 TS 组件里，dev server 不用启动就被编辑器/tsc 拦截。
