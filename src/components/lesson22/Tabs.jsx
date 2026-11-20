// 第 22 课 · 组件设计模式 ① —— 组合组件（Compound Components）
//
// 本文件教什么：
// "逻辑复用"是一个老难题，但"结构复用"是另一道题：Tabs、手风琴、下拉菜单这类
// "一家人"组件，调用方想自己决定内部怎么排布——哪个标签在左、每个面板里放什么——
// 而不是拿到一个只吃配置数组 props 的黑盒。组合组件的答案：
//   父组件 Tabs 只管状态（activeId），子组件 Tab / Panel 各管自己的小切片，
//   调用方用 JSX 天然的结构自由度随意拼装：
//     <Tabs defaultValue="intro">
//       <Tabs.List><Tabs.Tab id="intro">简介</Tabs.Tab>…</Tabs.List>
//       <Tabs.Panel id="intro">…</Tabs.Panel>
//     </Tabs>
//
// 两个关键设计：
//   1. 子组件"挂"在父对象上（Tabs.List = List）——不是继承，只是命名空间把戏：
//      JS 里组件也是对象，可以长属性。挂载后 import 一个 Tabs 名字就能用到全家。
//   2. ★ 子组件之间互不认识、没有任何 props 相连，activeId 全靠 Context 广播（第 6 课）。
//      为什么必须 Context？因为 Tabs.List / Tabs.Tab 是【调用方】写进 JSX 里的，
//      父组件拿到的只有 children 这个"打包好的整体"，根本没办法往里塞 props。
//      （硬塞的邪门写法是 React.cloneElement 逐个克隆 children——能跑，但脆弱且丑；
//       Context 才是让"平级兄弟读到父组件状态"的正规通道。）
//
// 这就是"props 与子组件用法完全解耦"：调用方不传 activeId、不传 onChange 给任何子组件；
// 想加一个标签就多写一行 <Tabs.Tab>，想给面板换位置就换位置——结构由调用方全权决定。

import { createContext, useContext, useState } from 'react'

// 第 6 课三步走的第 1 步：造频道。默认值故意给 null，配 useTabsContext 的抛错——
// "忘了包 <Tabs> 就用 <Tabs.Tab>"这种错误要在第一秒炸出来（fail fast），
// 而不是悄悄表现为"点了没反应"让你排查半天。
const TabsContext = createContext(null)

// 第 3 步照例包成 hook：调用方不认识 useContext 和 Context 对象；
// "没包 Provider 就抛错"的防御只写一次，每个子组件共用。
function useTabsContext() {
  const ctx = useContext(TabsContext)
  if (ctx === null) {
    throw new Error('Tabs.Tab / Tabs.Panel 必须放在 <Tabs> 内部使用')
  }
  return ctx
}

// 父组件：唯一的状态所有者。自己不渲染任何"家人"的具体长相，
// 只提供状态 + 舞台（Context.Provider），children 原样摆出来。
export default function Tabs({ defaultValue, children }) {
  const [activeId, setActiveId] = useState(defaultValue)
  return (
    <TabsContext.Provider value={{ activeId, setActiveId }}>
      <div className="l22-tabs">{children}</div>
    </TabsContext.Provider>
  )
}

// —— 子组件们：普通组件，彼此零依赖，唯一的外部输入是 Context ——

// 标签条：只负责把 children 摆成一排，顺便挂上无障碍角色（role="tablist"）。
function TabsList({ children }) {
  return (
    <div className="l22-tabs-list" role="tablist">
      {children}
    </div>
  )
}

// 单个标签：读 activeId 判断自己亮不亮，点自己就把 activeId 改成自己的 id。
// 注意它拿到的 props 只有 id 和 children——和"当前激活的是谁"毫无关系，
// 激活状态完全来自 Context，这就是解耦。
function Tab({ id, children }) {
  const { activeId, setActiveId } = useTabsContext()
  const isActive = activeId === id
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      className={isActive ? 'l22-tab l22-tab-active' : 'l22-tab'}
      onClick={() => setActiveId(id)}
    >
      {children}
    </button>
  )
}

// 面板：只读状态不写状态（职责再切薄一点）。
// 非当前面板直接 return null（卸载）。取舍：省渲染，但面板内部的
// 输入框内容、滚动位置会丢——要保留就得改成"渲染但 display:none"（见 doc/lesson-22.md）。
function TabPanel({ id, children }) {
  const { activeId } = useTabsContext()
  if (activeId !== id) return null
  return (
    <div className="l22-tab-panel" role="tabpanel">
      {children}
    </div>
  )
}

// ★ 招牌动作：把子组件挂到父对象上。
// 这只是"一家人的户口本"：Tabs.List 与 Tabs 之间没有继承、没有 is-a 关系，
// 四个组件本来就是各自独立的普通函数组件。挂载的意义只有一件事——
// 调用方 import Tabs 一个名字，全家随取随用（Radix / AntD 的 Tabs 都是这个形状）。
Tabs.List = TabsList
Tabs.Tab = Tab
Tabs.Panel = TabPanel
