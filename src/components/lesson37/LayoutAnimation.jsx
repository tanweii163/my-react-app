// 第 37 课 · LayoutAnimation —— layout 属性：布局变化也配拥有动画
//
// 本文件教什么：
// 第 23 课铁律"动画只动 transform/opacity"留了个死角：列表换位、卡片展开收起
// 这类【布局变化】本身不是 transform——手写 FLIP（First-Last-Invert-Play）要先记录
// 旧位置、更新布局、再测新位置、算差值反转回旧位、最后补间归零，十几行坐标手术。
// motion 的 layout 属性把 FLIP 全自动化：
//   1. First / Last：布局变化前后各测一次元素位置与尺寸；
//   2. Invert：用 transform 把元素瞬间"摆回"旧位置——布局已更新，视觉没跳变；
//   3. Play：把 transform 补间到 0。全程只有 transform，不逐帧重排——
//     所以 layout 动画"能动画布局"，又不违反合成器铁律：库替你写了对的那一版。
// 触发方式：元素挂 layout 后，【任何】导致它布局变化的因素都会被捕捉——
// state 换了渲染顺序、className 改了宽度、条件渲染让高度变了……
// 动画值不在 style 里，这就是它与 initial/animate 的本质区别。
//
// layoutId：跨元素的"共享元素过渡"。两个不同组件挂同一个 layoutId，一个卸载、
// 另一个挂载的瞬间，库自动做位置/尺寸的形变过渡（手机相册：点缩略图"放大成"大图）。
// 【易错点】layoutId 必须全应用唯一——它不是列表内的局部名字，是全局身份；
// 两处同时挂同一 layoutId，库不知道该过渡谁。
//
// 子内容拉伸陷阱：默认 layout 连子内容一起缩放（展开时文字会被横向拉伸）。
// 只想"位置跟随、自身不变形"的子元素挂 layout="position"（见演示二）。

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

// —— 演示一：列表换位 ——
// 每项只挂了 layout，没有任何 initial/animate：点"打乱"改的是数组顺序（state 驱动
// DOM 换位），库测出每个 li 的前后位置差，自动补间。换位动画与删除补位是同一个机制。
function ReorderDemo() {
  const [cards, setCards] = useState([
    { id: 'a', label: '箱 A' },
    { id: 'b', label: '箱 B' },
    { id: 'c', label: '箱 C' },
    { id: 'd', label: '箱 D' },
  ])

  function move(index, dir) {
    setCards((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev // 边界外不动
      // 相邻交换：React 按新数组重排 DOM，layout 属性负责"看起来是滑过去的"
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function shuffle() {
    setCards((prev) => [...prev].reverse())
  }

  return (
    <div>
      <div className="row">
        <button type="button" onClick={shuffle} data-testid="l37-shuffle">
          打乱顺序
        </button>
      </div>
      <motion.ul className="l37-flip-list" layout>
        {cards.map((card, index) => (
          // key 稳定（id）+ layout：无论顺序怎么变，每个元素追自己的位置差
          <motion.li key={card.id} layout className="l37-flip-item" data-card-id={card.id}>
            <span className="l37-flip-label">{card.label}</span>
            <button type="button" onClick={() => move(index, -1)} aria-label={`上移${card.label}`}>
              ↑
            </button>
            <button type="button" onClick={() => move(index, 1)} aria-label={`下移${card.label}`}>
              ↓
            </button>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  )
}

// —— 演示二：卡片展开 / 收起 ——
// 高度变化来自条件渲染（AnimatePresence 演示过的老朋友负责段落进出），
// layout 属性负责把"卡片尺寸跳变"补间成动画——第 23 课说"动画 height 会逐帧重排"
// 是反模式，这里的正确姿势是：布局真变了，但动画走 transform（FLIP）。
function ExpandDemo() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="row">
      <motion.div
        layout // 尺寸变化（宽 + 高）全部自动补间
        onClick={() => setExpanded((v) => !v)}
        className={expanded ? 'l37-expand-card l37-expand-card--open' : 'l37-expand-card'}
        data-expanded={expanded} // 实测钩子
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setExpanded((v) => !v)
        }}
      >
        {/* layout="position"：标题只跟随位置、不被缩放拉伸（易错点见文件头） */}
        <motion.h4 layout="position">点我展开 / 收起</motion.h4>
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.p
              key="body"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              高度变了也能补间：条件渲染让卡片真实高度变化，layout 属性测出前后差、
              用 transform 补间——不逐帧重排布局。文字段落自身只做淡入淡出。
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

// —— 演示三：layoutId 共享元素过渡 ——
// 点缩略图：它"卸载"，同 layoutId 的大图"挂载"——库把两者当作同一元素的两次出场，
// 自动形变过渡；点大图收回，同一机制反向再播一遍。不需要 AnimatePresence 参与
// （形变由 layoutId 配对驱动，进出淡入淡出才是 AnimatePresence 的活）。
const COLORS = ['emerald', 'sky', 'amber', 'rose']

function SharedIdDemo() {
  const [selected, setSelected] = useState(null)

  return (
    <div>
      {selected === null && (
        <p className="hint">点任一色块：它"长成"大图；点大图收回。注意色块是【两个不同组件】。</p>
      )}
      <div className="row">
        {selected !== null && (
          // 大图：与被点缩略图共享同一个 layoutId（全局唯一身份）
          <motion.div
            layoutId={selected}
            className={`l37-hero l37-hero--${selected}`}
            onClick={() => setSelected(null)}
            data-hero-id={selected} // 实测钩子：大图在场
            initial={{ opacity: 0 }} // 只补透明度淡入，位置尺寸由 layoutId 形变接管
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          />
        )}
      </div>
      <div className="l37-thumb-row">
        {COLORS.filter((c) => c !== selected).map((color) => (
          // 缩略图：被点后从网格里卸载，由大图顶替它的 layoutId
          <motion.button
            key={color}
            type="button"
            layoutId={color}
            className={`l37-thumb l37-thumb--${color}`}
            onClick={() => setSelected(color)}
            data-thumb-id={color} // 实测钩子
            aria-label={`选择${color}色块`}
          />
        ))}
      </div>
    </div>
  )
}

export default function LayoutAnimation() {
  return (
    <div>
      <h4>1️⃣ layout：列表换位自动补间（FLIP 自动化）</h4>
      <ReorderDemo />

      <h4>2️⃣ layout：卡片展开收起（高度变化的正确姿势）</h4>
      <ExpandDemo />

      <h4>3️⃣ layoutId：共享元素过渡（缩略图 ↔ 大图）</h4>
      <SharedIdDemo />
    </div>
  )
}
