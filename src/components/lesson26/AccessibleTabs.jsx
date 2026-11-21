// 第 26 课 · 可访问性 ① —— 无障碍 Tabs（第 22 课 Tabs 的完整 a11y 升级版）
//
// 本文件教什么：
// 第 22 课的 Tabs 已经挂了 role="tablist"/"tab"/"tabpanel" 和 aria-selected，
// 但"挂了 ARIA 属性"≠"真的可访问"。本课按 WAI-ARIA 官方 Tabs 模式
// （https://www.w3.org/WAI/ARIA/apg/patterns/tabs/）补齐三件事：
//   1. 完整的角色链：tablist/tab/tabpanel + aria-selected + aria-controls +
//      aria-labelledby（面板反过来指回标签）——读屏器才能在"标签↔面板"之间互相找到；
//   2. 方向键导航 + Home/End：规范要求标签组整体只占【一个】制表位——
//      Tab 键进组时停一次，之后组内移动全靠方向键；
//   3. roving tabindex（漫游制表位）：激活的 tab tabIndex=0、其余全 -1——
//      于是 Tab 键永远只落在一个 tab 上，"组内移动"的责任移交给方向键。
// 本课三条铁律在这里各就各位：
//   语义化优先：每个 tab 仍是原生 <button>——Enter/Space 激活、可聚焦、
//     读屏器念"按钮"，这些行为不用写一行代码，白送；
//   ARIA 是补充：role/aria 只负责"把结构翻译给读屏器"，不产生任何行为——
//     方向键导航不会因为加了 role 自动出现，必须亲手写 onKeyDown；
//   键盘可达：整个组件零鼠标依赖，下面每一行键盘代码都是底线的一部分。

import { createContext, useContext, useId, useRef, useState } from 'react'

const TabsContext = createContext(null)

// 第 22 课同款防御：没包 <Tabs> 就用子组件，第一秒炸出来（fail fast）。
function useTabsContext() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tabs.List / Tabs.Tab / Tabs.Panel 必须放在 <Tabs> 内部使用')
  return ctx
}

// DOM id 约定：tab → `${prefix}-tab-${id}`，panel → `${prefix}-panel-${id}`。
// aria-controls（tab 指向 panel）和 aria-labelledby（panel 指回 tab）
// 靠这对 id 互指——这就是读屏器的"标签↔面板"地图。id 必须全页唯一，
// 所以用 useId() 生成前缀：React 保证它在 SSR 水合前后一致（手写随机数会水合错位）。
function tabDomId(prefix, id) {
  return `${prefix}-tab-${id}`
}
function panelDomId(prefix, id) {
  return `${prefix}-panel-${id}`
}

// 父组件：唯一的状态所有者，外加一件第 22 课没有的新工作——
// 管理一张"tab 按钮 → 真实 DOM"的登记表，供键盘导航搬家焦点用。
export default function AccessibleTabs({ defaultValue, label, children }) {
  const [activeId, setActiveId] = useState(defaultValue)
  const idPrefix = useId()

  // roving tabindex 的暗桩：每个 Tab 挂载时把自己的真实 DOM 登记进来。
  // 为什么需要它？键盘导航要"替用户"把焦点搬到隔壁 tab——
  // .focus() 必须调在真实 DOM 元素上，组件对象不行，所以要提前收好引用。
  // Map 按插入序遍历：登记顺序 = 渲染顺序 = DOM 顺序，方向键按它找左右邻居。
  const tabRefs = useRef(new Map())

  const registerTab = (id, el) => {
    if (el) tabRefs.current.set(id, el)
    else tabRefs.current.delete(id) // 卸载时注销，防止 Map 里留下死引用
  }

  // 键盘导航的唯一入口，挂在 tablist 上（按钮的 keydown 会冒泡到这）。
  // 为什么放父级而不是每个 Tab 自己写一份？"在组内移动"是整组的职责，
  // 一份 handler 比 N 份互相拷贝的好维护——事件冒泡免费把按键送上来。
  const handleListKeyDown = (event) => {
    const ids = [...tabRefs.current.keys()]
    if (ids.length === 0) return
    const currentIndex = ids.indexOf(activeId)
    let nextIndex

    // 垂直标签页要再补 ArrowUp/ArrowDown（aria-orientation="vertical" 时规范要求），
    // 本课是横向的，四个键就是完整集合：左右逐个移动，Home/End 跳到两端。
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % ids.length // 取模 = 到头绕回第一个
        break
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + ids.length) % ids.length // +length 防 -1 取模为负
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = ids.length - 1
        break
      default:
        return // 其他按键（比如 Tab 本身）不归我们管，放行给浏览器
    }

    // 方向键的浏览器默认行为是滚动页面——在标签组里必须吞掉。
    event.preventDefault()
    const nextId = ids[nextIndex]
    setActiveId(nextId) // "选择随焦点"（automatic activation）：焦点到哪，面板跟到哪。
    // 另一派是 manual activation：方向键只移焦点，Enter/Space 才换面板——
    // 适合面板渲染很重的场景（切一次卡一次时，先让人逛完再决定切）。
    tabRefs.current.get(nextId).focus()
    // ★ ARIA 属性管不了焦点：aria-selected 只会让读屏器"念"对，
    // 真实焦点必须亲手 .focus() 搬过去——这是"ARIA 是补充不是替代"最具体的一课。
  }

  return (
    <TabsContext.Provider
      value={{ activeId, setActiveId, registerTab, idPrefix, label, handleListKeyDown }}
    >
      {/* value 每次渲染都是新对象 → 所有消费者跟着重渲染（第 22 课易错点④）。
          本课树小无所谓；做库时用 useMemo 包 value、或读写拆成两个 Context。 */}
      {children}
    </TabsContext.Provider>
  )
}

// —— 子组件：API 形状与第 22 课完全一致，a11y 升级对调用方零破坏 ——

// 标签条：挂 role="tablist" + aria-label（整组的可读名字）。
// onKeyDown 放这里而不是 Tabs，因为只有 tablist 区域的按键才归导航逻辑管。
function TabsList({ children }) {
  const { label, handleListKeyDown } = useTabsContext()
  return (
    <div
      role="tablist"
      aria-label={label}
      aria-orientation="horizontal"
      className="l26-tablist"
      onKeyDown={handleListKeyDown}
    >
      {children}
    </div>
  )
}

// 单个标签：props 依然只有 id 和文字，激活状态照旧走 Context（第 22 课解耦不变）。
// 升级点全在按钮的属性上：aria-selected / aria-controls / roving tabindex。
function Tab({ id, children }) {
  const { activeId, setActiveId, registerTab, idPrefix } = useTabsContext()
  const isActive = id === activeId

  return (
    <button
      type="button"
      ref={(el) => {
        // ★ React 19 易错点：ref 回调的返回值会被当作"清理函数"。
        // 写成单表达式 `(el) => registerTab(id, el)` 会把 registerTab 的返回值
        // （undefined 碰巧没事，返回 Map 就会被 React 当函数调用）——
        // 回调体一律用块体，养成习惯。
        registerTab(id, el)
      }}
      id={tabDomId(idPrefix, id)}
      role="tab"
      aria-selected={isActive}
      aria-controls={panelDomId(idPrefix, id)}
      // ★ roving tabindex：整组只有一个"0"，其余全是 -1。
      // tabIndex=-1 = 不进 Tab 序（Tab 键跳过它），但仍可被 .focus() 程序聚焦——
      // 正是"键盘搬家靠代码、Tab 键只停一站"的实现基础。
      tabIndex={isActive ? 0 : -1}
      onClick={() => setActiveId(id)} // 鼠标用户点一下就切；Enter/Space 由原生 button 免费提供
      className={isActive ? 'l26-tab l26-tab-active' : 'l26-tab'}
    >
      {children}
    </button>
  )
}

// 面板：aria-labelledby 指回标签（读屏器念面板先报标签名），
// 非当前面板照第 22 课的取舍直接卸载（省渲染，代价是面板内部状态丢失）。
function TabPanel({ id, children }) {
  const { activeId, idPrefix } = useTabsContext()
  if (id !== activeId) return null

  return (
    <div
      role="tabpanel"
      id={panelDomId(idPrefix, id)}
      aria-labelledby={tabDomId(idPrefix, id)}
      // tabIndex=0：WAI-ARIA APG 建议——面板里可能没有任何可聚焦内容，
      // 给面板本身一个制表位，键盘用户才能 Tab 到它、读屏光标才扫得进去。
      // （面板里已有输入框等可聚焦元素时可去掉，免得多按一次 Tab。）
      tabIndex={0}
      className="l26-tabpanel"
    >
      {children}
    </div>
  )
}

// 招牌动作照旧：子组件挂到父对象上——不是继承，只是给"一家人"上户口。
AccessibleTabs.List = TabsList
AccessibleTabs.Tab = Tab
AccessibleTabs.Panel = TabPanel
