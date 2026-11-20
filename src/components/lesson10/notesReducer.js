// 第 10 课 · notesReducer —— 用 useReducer 管理笔记集合（对应第 7 课）
//
// 本文件教什么：
// 当多条 state 逻辑上属于同一份数据（这里是一组笔记），
// 且修改方式有固定几种（新增 / 修改 / 删除）时，
// 用 useReducer 把"怎么改"集中到一个纯函数里，组件只负责"发起修改"。
//
// 三条铁律（来自第 7 课）：
// 1. reducer 必须是纯函数：同样输入永远同样输出，不做请求、不改外部变量；
// 2. 不可变更新：永远返回新数组/新对象，绝不 push、绝不直接改 state 里的元素；
// 3. action 是"发生了什么"的描述对象，type 用大写字符串常量，字段尽量少。

// action type 常量：集中定义，避免组件里手写字符串写错（拼错时 switch 不报错但没效果，很难查）
export const ADD_NOTE = 'add'
export const UPDATE_NOTE = 'update'
export const REMOVE_NOTE = 'remove'

// 初始数据：两 条示例笔记，让首次打开页面不空
export const initialNotes = [
  { id: 1, title: '欢迎来到第 10 课', content: '这是综合实战：把前九课的知识拼成一个完整应用。' },
  { id: 2, title: '快捷键备忘', content: 'Ctrl/Cmd + S 虽然不拦截也没关系——本应用失焦自动保存。' },
]

// 纯函数：旧 state + action => 新 state。
// 注意每个分支都创建新的数组和新对象，被修改的那一项之外的项"原样引用"即可（浅拷贝够用）。
export function notesReducer(notes, action) {
  switch (action.type) {
    case ADD_NOTE:
      // 新笔记排在最前面，符合"最近创建的在上面"的直觉
      return [action.note, ...notes]

    case UPDATE_NOTE:
      // map：只有目标项替换成新对象（展开旧对象 + 覆盖字段），其余项保持原引用
      return notes.map((n) =>
        n.id === action.id ? { ...n, title: action.title, content: action.content } : n,
      )

    case REMOVE_NOTE:
      // filter 天然返回新数组，不会动原数组
      return notes.filter((n) => n.id !== action.id)

    default:
      // 遇到未知的 action 直接返回旧 state：
      // 1) 不崩溃；2) 提醒开发者漏写了哪种 case
      throw new Error(`未知的 action type: ${action.type}`)
  }
}
