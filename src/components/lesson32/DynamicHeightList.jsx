// 第 32 课 · 组件三：动态行高进阶版（measureElement）
//
// 本文件教什么：
//   1. 行高不固定的列表怎么虚拟化：estimateSize 只是「猜测」，真实高度
//      由浏览器渲染后测量——measureElement 就是测量钩子；
//   2. 动态行高的额外成本：每行渲染后要读一次真实高度（ref 回调），
//      高度变化会触发 virtualizer 重算可视区，所以动态版比固定版「贵」一点；
//   3. 本课列表项文字长度随机 → 每行高度不同 → 固定行高的纯数学公式失效，
//      必须走 measureElement 这条「先猜、再测、随渲染修正」的路。
// 【易错】useLayoutEffect 来自 react，不是 @tanstack/react-virtual——
// 库只导出 useVirtualizer 等虚拟化 API，从错误的包导入会整站白屏。
import { useLayoutEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

const ROW_COUNT = 1000 // 动态版造 1000 条：教学重点是机制，不需要 10 万条来证明
const OVERSCAN = 3

// 每行文字长度随机 → 换行数不同 → 高度天然参差。
// 【易错】内容要在渲染期间稳定：把随机结果算在数据生成时（模块级 / useMemo），
// 而不是渲染体里直接 Math.random()——否则每次重渲染行高都在变，
// measureElement 测一次变一次，列表会「跳舞」。
const ROWS = Array.from({ length: ROW_COUNT }, (_, i) => ({
  id: i,
  text:
    `第 ${i + 1} 行 · ` +
    '这段文字长度随机：'.repeat(Math.ceil(Math.random() * 8)) +
    Math.random().toFixed(6),
}))

export default function DynamicHeightList() {
  const parentRef = useRef(null)

  // 同 VirtualList：React Compiler 提示，本组件未做 compiler memo 化，行为正确。
  // oxlint-disable-next-line
  const virtualizer = useVirtualizer({
    count: ROW_COUNT,
    getScrollElement: () => parentRef.current,
    // estimateSize 在动态模式下是「首次猜测」：测完会被真实值覆盖。
    // 猜得越准，滚动条跳动越少——所以给了个接近平均值的 44。
    estimateSize: () => 44,
    overscan: OVERSCAN,
  })

  useLayoutEffect(() => {
    virtualizer.measure()
  }, [virtualizer])

  const items = virtualizer.getVirtualItems()

  return (
    <div className="card l32-panel">
      <h2>动态行高（measureElement 进阶）</h2>
      <p className="hint">
        每行文字长度随机、高度不一。estimateSize 只负责首次猜测，真实高度靠测量。
      </p>

      <div className="l32-scroll l32-scroll-short" ref={parentRef} aria-label="动态行高虚拟列表">
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {items.map((virtualItem) => (
            <div
              key={virtualItem.key}
              // measureElement 的用法：把 virtualizer.measureElement 当 ref 回调。
              // 元素挂上 DOM 的那一刻，库会读 getBoundingClientRect 拿真实高度，
              // 并写回自己的测量缓存——之后这行的 start/end 都用真实值计算。
              ref={virtualizer.measureElement}
              data-index={virtualItem.index} // 必须带上：库靠它知道测的是第几行
              className="l32-item l32-item-dynamic"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
                // 动态行不写死 height：让内容自然撑开，测出来的才是真实值
              }}
            >
              {ROWS[virtualItem.index].text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
