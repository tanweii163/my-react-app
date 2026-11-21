// 第 32 课 · 组件二：虚拟列表 · 固定行高版
//
// 本文件教什么：
//   1. @tanstack/react-virtual 的 useVirtualizer 基本用法：
//      它不渲染数据，只回答一个问题——「以当前滚动位置，我该渲染哪几行？」；
//   2. windowing（窗口化）原理落地：数据还是 100,000 条，但 DOM 里永远只有
//      「可视区高度 / 行高 + overscan」≈ 二十几行；
//   3. 固定行高的三个角色：
//      · 外层容器：真正滚动的元素（overflow: auto），高度固定；
//      · 撑高占位层：一个总高 = count × 行高 的空 div，负责让滚动条长度正确；
//      · 绝对定位的行：只渲染可视区 ± overscan 的行，top = virtualItem.start。
//   4. 「实际渲染 DOM 行数」显示在页面上，和裸版的 100,000 对比。
// 【易错】useLayoutEffect 来自 react，不是 @tanstack/react-virtual——
// 库只导出 useVirtualizer 等虚拟化 API，从错误的包导入会整站白屏。
import { useLayoutEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ROW_COUNT } from './RawList.jsx' // 复用同一份数据规模，公平对比

// 固定行高是虚拟化的最优场景：每行的 start/end 都是纯数学（index × ROW_HEIGHT），
// 不需要任何测量。ROW_HEIGHT 改一个数，布局公式自动跟着对。
const ROW_HEIGHT = 36
const OVERSCAN = 5 // 视区上下各多渲染 5 行：滚动时新行已经就位，肉眼看不到白屏

export default function VirtualList() {
  // 滚动容器 ref：useVirtualizer 需要它监听 scroll 事件来更新可视区
  const parentRef = useRef(null)

  // 这是 React Compiler 的提示而非错误：compiler 会自动跳过对本组件的 memo 化，
  // useVirtualizer 的返回值每次渲染都是新的（本课也未把它传给 memo 子组件），行为正确。
  // oxlint-disable-next-line
  const virtualizer = useVirtualizer({
    count: ROW_COUNT,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT, // 固定行高：每次估计都精确命中
    overscan: OVERSCAN,
  })

  // 【易错】初始挂载时 ref 还没绑上，virtualizer 拿不到滚动容器、测量为 0。
  // 官方推荐挂载后主动 measure 一次，否则首屏可能渲染 0 行。
  useLayoutEffect(() => {
    virtualizer.measure()
  }, [virtualizer])

  const items = virtualizer.getVirtualItems() // 当前应渲染的行：固定数量（≈ 可视行数 + 2×overscan）

  return (
    <div className="card l32-panel">
      <h2>虚拟列表（固定行高）</h2>
      <p className="hint">
        数据还是 {ROW_COUNT.toLocaleString('zh-CN')} 条，DOM 里永远只有可视区 ± {OVERSCAN} 行。滚动对比左边的卡顿。
      </p>
      <div className="l32-stat">
        <span>实际渲染 DOM 行数</span>
        {/* getVirtualItems().length 就是此刻真实的 DOM 行数——几十 vs 十万 */}
        <strong className="big-number l32-good">{items.length}</strong>
      </div>

      {/* 角色一：滚动容器。它才是虚拟化的「窗口」，高度必须写死（本课用 CSS 定 320px） */}
      <div className="l32-scroll" ref={parentRef} id="l32-virtual-list" aria-label="虚拟化 10 万行列表">
        {/*
          角色二：撑高占位层。height = 全部数据总高，行一个都不放——
          它唯一的工作是把滚动条撑到正确的长度，让滚动行为和 10 万行时一模一样。
        */}
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {items.map((virtualItem) => (
            <div
              key={virtualItem.key}
              className="l32-item l32-item-virtual"
              style={{
                // 角色三：绝对定位行。top = 该行在总高里的偏移，left/width 铺满容器。
                // 只渲染 items 数组里的行——这就是 windowing。
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: virtualItem.size,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              第 {virtualItem.index + 1} 行 · 已虚拟化
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
