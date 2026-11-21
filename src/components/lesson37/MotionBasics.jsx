// 第 37 课 · MotionBasics —— 声明式动效三件套：initial/animate/transition、手势、variants
//
// 本文件教什么：
// 1. 最小单元 <motion.div initial animate transition>：initial 是挂载起点、animate 是
//    目标值，两者不一致库就自动补间——你不写"逐帧怎么走"，只声明两端。
//    【对比第 23 课】CSS transition 也要声明起止值，但库的差异在"值是 props"：
//    可以由 state 直接算出来、可以插值任意数字（不只是 CSS 属性白名单）。
// 2. transition 两种引擎：tween（固定时长 + 缓动曲线）vs spring（物理弹簧，没有时长
//    概念，手感由 stiffness 刚度 / damping 阻尼决定）。选型经验：UI 反馈类用手势的
//    都是 spring（中断时能顺着当前速度折返）；播放型演出用 tween（可控时长）。
// 3. 手势 whileHover / whileTap：指针交互声明成 props，一行顶 CSS :hover 加 JS 监听。
//    库相对 CSS 的核心增量是【中断重定向】：动画播到一半指针离开，弹簧从当前
//    位置+速度平滑折返；CSS transition 只能从当前计算值跳到新曲线，手感生硬。
// 4. variants（变体）：把命名的动画值收编成对象树。父组件声明状态机
//    hidden → show，子组件只挂同名 variant 就跟随——编排（staggerChildren 错峰）
//    只在父级写一次，N 个子组件自动排队，这是内联 props 做不到的（见 doc 对照表）。
// 5. 重播技巧：initial→animate 只在挂载那一刻播一次；想重播就给容器换 key 强制
//    重挂载（React 惯用法，与动画库无关——key 变了 = 旧元素卸载、新元素进场）。

import { useState } from 'react'
import { motion } from 'framer-motion'

// —— 演示一：initial / animate / transition ——
// 两个盒子起点相同、终点相同，只有 transition 不同：左边 tween（定长 0.6s），
// 右边 spring（弹簧，没有"时长"参数）。点重播（换 key 重挂载）对比两者手感。
function EnterDemo() {
  const [runId, setRunId] = useState(0)

  return (
    <div>
      <div className="row">
        <button type="button" onClick={() => setRunId((n) => n + 1)}>
          重播入场
        </button>
      </div>
      {/* key 变化 → React 把整个容器当作新元素重新挂载 → initial→animate 重播 */}
      <div className="row" key={runId}>
        <motion.div
          className="l37-enter-box"
          initial={{ opacity: 0, x: -48 }} // 挂载起点：透明 + 左偏 48px
          animate={{ opacity: 1, x: 0 }} // 目标值：库自动补间这一段
          transition={{ duration: 0.6, ease: 'easeOut' }} // tween：定长 + 缓动曲线
        >
          tween · 0.6s easeOut
        </motion.div>
        <motion.div
          className="l37-enter-box l37-enter-box--alt"
          initial={{ opacity: 0, x: -48 }}
          animate={{ opacity: 1, x: 0 }}
          // spring：只有物理参数。stiffness 越大回弹越快，damping 越大越"闷"。
          // 易错点：给 spring 配 duration 不会报错，但完全无效——想调手感只能调这俩。
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          spring · stiffness 260 / damping 20
        </motion.div>
      </div>
    </div>
  )
}

// —— 演示二：手势 whileHover / whileTap ——
// 不写 onMouseEnter/onMouseLeave/onMouseDown，也不写 CSS :hover——交互即声明。
function GestureDemo() {
  return (
    <div className="row">
      <motion.button
        type="button"
        className="l37-chip"
        whileHover={{ scale: 1.12 }} // 指针悬停：放大
        whileTap={{ scale: 0.9 }} // 按下未松开：缩小（松开自动弹回 hover/常态）
        // 手势几乎总配 spring：快速进出时弹簧"顺着当前速度"转向，
        // 这就是中断重定向——CSS :hover 只能按固定曲线重放，做不出这个手感。
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        悬停放大 / 按下缩小
      </motion.button>
      <span className="hint">试一下快速划过再折返——中途反向也是平滑的，这是库的招牌能力。</span>
    </div>
  )
}

// —— 演示三：variants 编排 + staggerChildren 逐个入场 ——
// 编排的两条铁律：
//   a. 子组件【不写 initial/animate】，只挂同名 variants——状态由父级广播；
//   b. staggerChildren 写在父级 variant 的 transition 里，值是"相邻两孩子的间隔秒数"。
// 反过来用内联 props 做同样的事，得给每个孩子手算 delay={i * 0.15}——
// 元素一多、顺序一变就全乱（完整对照表见 doc/lesson-37.md）。
const listVariants = {
  hidden: {}, // 父级自身不动，只负责广播状态与排队
  show: {
    transition: {
      staggerChildren: 0.15, // 错峰间隔 0.15s
      delayChildren: 0.1, // 全队统一延迟
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 22 },
  },
}

const SKILLS = ['声明式 props', '手势交互', 'variants 编排', 'AnimatePresence']

function StaggerDemo() {
  const [runId, setRunId] = useState(0)

  return (
    <div>
      <div className="row">
        <button type="button" onClick={() => setRunId((n) => n + 1)}>
          重播错峰入场
        </button>
      </div>
      <motion.ul
        key={runId}
        className="l37-stagger"
        variants={listVariants}
        initial="hidden" // 用 variant 名当起点/终点——子级自动同名跟随
        animate="show"
      >
        {SKILLS.map((skill) => (
          <motion.li key={skill} variants={itemVariants}>
            {skill}
          </motion.li>
        ))}
      </motion.ul>
    </div>
  )
}

// 页面编排：三块从易到难。export default 只此一个组件（oxlint only-export-components）。
export default function MotionBasics() {
  return (
    <div>
      <h4>1️⃣ initial / animate / transition：声明两端，库来补间</h4>
      <EnterDemo />

      <h4>2️⃣ whileHover / whileTap：手势即 props</h4>
      <GestureDemo />

      <h4>3️⃣ variants + staggerChildren：父级广播，子级排队</h4>
      <StaggerDemo />
    </div>
  )
}
