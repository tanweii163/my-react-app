// 第 21 课 · EventDemo：React 事件处理器的类型 + useState 的泛型
//
// 本文件教什么：
// 1. 事件类型速查（泛型参数填"事件发生在哪种元素上"）：
//      输入框变化  ChangeEvent<HTMLInputElement>
//      表单提交    FormEvent<HTMLFormElement>
//      点击/悬停   MouseEvent<HTMLButtonElement>（click/dblclick/mouseenter 一族同款）
//    泛型参数的价值：e.target 默认是 EventTarget（所有元素的祖先，没有 .value），
//    标了 <HTMLInputElement> 之后，TS 才知道 e.target 是输入框，.value 的提示和检查随之生效；
// 2. 什么时候要手写类型：内联箭头函数（onChange={(e) => ...}）不用标——
//    位置决定类型，TS 自动推断；一旦把处理器抽成独立函数，推断上下文没了，必须手动标；
// 3. useState 泛型：useState<User | null>(null)——"有用户"和"还没拿到"两种可能都写进类型。
//    对比陷阱：useState(null) 只能推断出 null，之后 setUser(user) 直接报错；
//    而联合类型 User | null 还带来另一件好事：用 user 前必须判空收窄，
//    JS 时代最常见的 "Cannot read properties of null" 在编译期就被拦住。

import { useState } from 'react'
// 事件类型是"纯类型"（运行时不存在），用 import type 引入——
// isolatedModules 下的好习惯：一眼分清哪些导入会被编译器删掉
import type { ChangeEvent, FormEvent, MouseEvent } from 'react'

// —— 领域模型：一个"用户"长什么样 ——
// 类型写在最靠近数据的地方。表单 state、提交产物、展示区引用同一个 User：
// 字段改名时编辑器一键重构全部引用；JS 里改名只能全局搜索靠祈祷。
interface User {
  id: number
  name: string
  age: number
}

export default function EventDemo() {
  // 初始值是 '' → TS 自动推断 state 是 string，这种情况不用手写泛型
  const [name, setName] = useState('')
  // 数字输入框的受控值也是字符串（input.value 永远是 string，第 1 课提过），
  // 所以 state 类型还是 string，提交时再 Number() 转换
  const [age, setAge] = useState('')
  // ★ 显式泛型的教科书场景：state 可能有两种形状（无 / 有）。
  //   useState(null) 会把类型锁死成 null，后面 setUser(user) 直接编译报错；
  //   写成 useState<User | null>(null)，两种可能都进了类型，判空也变成强制的。
  const [user, setUser] = useState<User | null>(null)
  // 计数器与"上一次鼠标事件"的展示文案
  const [clicks, setClicks] = useState(0)
  const [lastEvent, setLastEvent] = useState('还没点过')

  // —— 抽出来的处理器必须手动标事件类型（没有推断上下文了）——
  // ChangeEvent<HTMLInputElement>：末尾的尖括号是"目标元素是输入框"，
  // 没有它，e.target 上没有 value 属性（EventTarget 是老祖宗接口，不含 .value）。
  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
  }

  // 同一个事件类型可以复用在任何输入框上：按"元素种类"声明，不按业务字段声明
  const handleAgeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAge(e.target.value)
  }

  // FormEvent<HTMLFormElement>：提交事件。preventDefault 阻止浏览器整页刷新（第 1 课知识点）
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return // 轻校验：空名字不提交。复杂的表单校验见第 17 课 RHF + Zod
    // setUser 的参数被 TS 检查：少写一个字段、age 写成字符串，这里都会红线
    setUser({ id: Date.now(), name: trimmed, age: Number(age) || 0 })
    setAge('') // 提交后清年龄，名字留着方便微调重交（纯演示取舍）
  }

  // MouseEvent<HTMLButtonElement>：鼠标事件一族。标对了类型，
  // clientX / clientY 这些鼠标专属属性才有提示；e.type 则告诉你这次是 click 还是别的
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    setClicks((c) => c + 1)
    // 事件对象是真的浏览器事件：坐标就在 e 上，类型对了才"看得见"它们
    setLastEvent(`${e.type} @ (${e.clientX}, ${e.clientY})`)
  }

  return (
    <div className="l21-event-demo">
      {/* button[type=submit] 点击和回车都会触发 form 的 onSubmit → handleSubmit */}
      <form onSubmit={handleSubmit}>
        <label>
          名字：
          {/* 这两个输入框故意用"抽出的处理器"：为了教 ChangeEvent 的写法。
              内联写法 onChange={(e) => setName(e.target.value)} 也完全合法，
              且 e 的类型由位置自动推断——真实项目两种都常见 */}
          <input value={name} onChange={handleNameChange} placeholder="张三" />
        </label>{' '}
        <label>
          年龄：
          <input value={age} onChange={handleAgeChange} type="number" min="0" placeholder="18" />
        </label>{' '}
        <button type="submit">创建用户</button>
      </form>

      {/* ★ 判空强制化：user 的类型是 User | null。直接写 user.name 会被 TS 拦下
          （提示"对象可能为 null"）——必须先用三元/守卫收窄。这不是仪式感，
          是把 JS 时代"忘了判空、运行时崩"的 bug 提前到编译期 */}
      {user ? (
        <p className="l21-user-box">
          已创建用户 #{user.id}：<strong>{user.name}</strong>（{user.age} 岁）
          {/* 走到这里类型已收窄为 User，user.xxx 随便用—— TS 知道非空 */}
        </p>
      ) : (
        <p className="hint">还没有用户——填名字点「创建用户」试试（名字为空不会提交）。</p>
      )}

      <div className="row">
        <button type="button" onClick={handleClick}>
          点我计数（MouseEvent）
        </button>
        <span className="big-number">{clicks}</span>
        <span className="hint">上一次事件：{lastEvent}</span>
      </div>
    </div>
  )
}
