// 第 18 课 · StoreEcho —— Context 方案 vs zustand 方案的最小对照
//
// 本文件教什么：同一个需求"最深层组件读一个全局数字"，三种写法摆在一起：
//   A. props 钻透（第 1–5 课的老办法）：Layer1 手递手传给 Layer2 → Layer3，中间层被迫认识数据；
//   B. Context（第 6 课）：中间层解脱了，但 value 一变，【所有】消费者都重渲染，
//      而且持久化要自己写 useEffect；context 的本职是"依赖注入"，不是状态管理；
//   C. zustand：最深层直接 useStore，按选择器订阅——数字没变就不重渲染，persist 内置。
// 结论预告：局部状态仍然归 useState 管（StoreEcho 里的输入框就是）；store 只收真正全局的少量状态。
import { createContext, useContext, useState } from 'react'
import useProgressStore, { selectDoneCount } from './progressStore.js'

// ---- 方案 A：props 钻透。中间层被迫"收下再转手"，层数一多就是灾难。 ----
function PropsLayer3({ echoText }) {
  return <p className="l18-layer">第三层（props）：我拿到的是「{echoText}」——被逼着认识这个数据</p>
}
function PropsLayer2({ echoText }) {
  return (
    <div className="l18-layer">
      <p>第二层（props）：我自己不用它，只为转手</p>
      <PropsLayer3 echoText={echoText} />
    </div>
  )
}
function PropsDrillDemo() {
  // 这个 text 是"页面局部状态"：只有这棵子树关心，老老实实留在 useState 里——
  // 铁律：不是所有 state 都该进 store，本组件就是反例示范。
  const [text, setText] = useState('你好')
  return (
    <div className="l18-block">
      <p className="l18-block-title">方案 A · props 钻透：数据一层层手递手</p>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="改我，从第一层传到第三层" />
      <PropsLayer2 echoText={text} />
    </div>
  )
}

// ---- 方案 B：Context（第 6 课原样三步走）。中间层解脱，但代价在重渲染与持久化。 ----
const EchoContext = createContext(null)

function ContextLayer3() {
  const { echoText } = useContext(EchoContext)
  return <p className="l18-layer">第三层（context）：直接读到「{echoText}」，中间层已隐身</p>
}
function ContextLayer2() {
  // 它也是消费者：value 一变它必须重渲染，哪怕它只透传 children。
  useContext(EchoContext)
  return (
    <div className="l18-layer">
      <p>第二层（context）：不用转手了，但 value 一变我照样重渲染</p>
      <ContextLayer3 />
    </div>
  )
}
function ContextProvider({ children }) {
  const [text, setText] = useState('你好')
  // 第 6 课的坑在这里显形：value 是新对象，任何一次 setText 都会让全部消费者重渲染；
  // 想持久化还得再加 useEffect 写 localStorage——这些活 context 本身一件都不包。
  return (
    <EchoContext.Provider value={{ echoText: text, setText }}>
      {children}
    </EchoContext.Provider>
  )
}
function ContextDemo() {
  const { echoText, setText } = useContext(EchoContext)
  return (
    <div className="l18-block">
      <p className="l18-block-title">方案 B · Context：跨层没问题，但它是"依赖注入"不是状态管理</p>
      <input value={echoText} onChange={(e) => setText(e.target.value)} />
      <ContextLayer2 />
    </div>
  )
}

// ---- 方案 C：zustand。最深层直接 useStore + 选择器，连 Provider 都不用包。 ----
function StoreLayer3() {
  // 选择器只挑 doneCount：ProgressList 里勾一课（progress 引用变了），
  // 但只要数字没变，这里不会重渲染——对比方案 B 的"全体重渲染"。
  const doneCount = useProgressStore(selectDoneCount)
  return <p className="l18-layer">第三层（zustand）：直接读进度 store，已完成 {doneCount} / 15 课</p>
}
function StoreLayer2() {
  // 它完全不 import store，也不收任何 props——连"订阅"都不需要，天然零重渲染。
  return (
    <div className="l18-layer">
      <p>第二层（zustand）：不认识 store，也不需要认识</p>
      <StoreLayer3 />
    </div>
  )
}
function StoreDemo() {
  return (
    <div className="l18-block">
      <p className="l18-block-title">方案 C · zustand：任意层直接 useStore，按选择器订阅</p>
      <StoreLayer2 />
      <span className="hint">去上面勾一课进度，回来这里数字同步变；数字没变时本块不重渲染</span>
    </div>
  )
}

// 页面编排：三个方案并排放，输入框/勾选可以互相打对照。
export default function StoreEcho() {
  return (
    <div className="card">
      <h2>三种"跨层拿数据"的写法对照</h2>
      <PropsDrillDemo />
      <ContextProvider>
        <ContextDemo />
      </ContextProvider>
      <StoreDemo />
    </div>
  )
}
