// 第 37 课 · ExitList —— AnimatePresence：让"退场动画"从工程降回一行 props
//
// 本文件教什么：
// 第 23 课我们手写过 delayedUnmount（src/components/lesson23/ExitAnimation.jsx）：
// 删除拆成两次 setState（先标退场、setTimeout 到点再真删）+ 防重入 + 定时器登记表 +
// 卸载清场，约 60 行才换来一个 400ms 的退场。根因是 React 卸载是同步瞬间的，
// "元素已删"与"动画没播"物理互斥，必须人为推迟卸载。
//
// AnimatePresence 把这套工程整个接管——它的工作方式：
//   1. 盯着直接子级的 key 集合；某个带 exit 的 motion 子组件被从 React 树里删掉时，
//     它先"扣住"不卸载，等 exit 动画播完才真正把元素从 DOM 移除——
//     【卸载时机由库管理】，setTimeout 与 CSS 时长对齐的双时钟陷阱从根上消失；
//   2. 代码量：本文件的核心逻辑只剩 map + 一行 exit={{ ... }}，删除就是一步 setState；
//   3. 边界情况：退场中途点"重置名单"把同一 id 加回来 → 库自动取消退场转回入场，
//     不用我们写防重入、掐定时器（第 23 课 ExitAnimation 三件套逐一对应消失）。
//
// 【易错点 · key 稳定性】AnimatePresence 完全靠 key 判断"谁走了"：
//   - 必须用稳定唯一的 id（本例 item.id）。用数组下标当 key 时，删掉中间一项，
//     后面所有元素下标集体前移——AnimatePresence 会误判"最后一项走了"：
//     错位的元素播退场动画、真正删的那项瞬间消失。第 5 课的 key 三铁律在这里
//     从"建议"升级为"硬性前提"。
//   - 同一时刻同一个 key 不能出现两次（又删又加回同一 id 的竞态由库内部处理，
//     但你自己 render 两个同 key 元素就必坏）。
//
// 与 delayedUnmount 的逐项对照表见 doc/lesson-37.md「核心概念」。

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const INITIAL_ITEMS = [
  { id: 'react', label: 'React 19' },
  { id: 'router', label: 'React Router 8' },
  { id: 'query', label: 'TanStack Query' },
  { id: 'zustand', label: 'Zustand' },
]

function ExitList() {
  const [items, setItems] = useState(INITIAL_ITEMS)

  function handleRemove(id) {
    // 注意：一步到位直接删数据——对比第 23 课 handleRemove 里"先标退场、
    // 到点再删"的两次更新。AnimatePresence 会拦住卸载这一步，等 exit 播完才删 DOM。
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  return (
    <div>
      <p className="hint">
        点「删除」：该项播 400ms 退场（淡出 + 右移）后被库卸载，<strong>留下的项平滑上移
        补位</strong>（第 23 课 delayedUnmount 的已知取舍——补位是瞬间跳变的——这里也顺带解决了，
        靠的就是下面那个 <code>layout</code> 属性）。实测钩子：退场中的元素
        <strong>仍在 DOM 里</strong>，带 <code>data-item-id</code> 属性。
      </p>

      {/* initial={false}：首次挂载不播入场——页面加载时列表应原地出现；
          该 prop 只关掉"第一次"，之后动态新增的子项照常播入场动画。 */}
      <motion.ul className="l37-exit-list" layout>
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.li
              // 【铁律】AnimatePresence 靠这个 key 判断去留——必须是稳定唯一 id，
              // 用数组下标会让退场动画张冠李戴（见文件头注释）。
              key={item.id}
              layout // 库的 FLIP：兄弟删除/补位时，自己从旧位置平滑滑到新位置
              // 实测断言钩子：元素在退场动画期间仍挂载在 DOM 上（第 23 课要靠
              // 自己造 leavingIds 状态才能表达的事，这里元素"没卸载"本身就说明了）。
              data-item-id={item.id}
              initial={{ opacity: 0, x: -32 }} // 新增项的入场
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 48 }} // 退场终点：播完这个，库才真正卸载元素
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            >
              <span>{item.label}</span>
              <button type="button" onClick={() => handleRemove(item.id)}>
                删除
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>

      {items.length === 0 && <p className="hint">名单空了——点「重置名单」再来一遍。</p>}

      <div className="row">
        {/* 边界实验：删掉一项、趁它还在退场时立刻点重置——库会取消退场、
            平滑转回入场。手写 delayedUnmount 要为此专门写防重入 + 清定时器。 */}
        <button type="button" onClick={() => setItems(INITIAL_ITEMS)}>
          重置名单
        </button>
      </div>
    </div>
  )
}

export default ExitList
