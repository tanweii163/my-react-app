// 第 32 课 · 组件一：裸渲染对照版（反例教学）
//
// 本文件教什么：
//   1. 把 100,000 行数据**全部** map 成 DOM —— 这是虚拟列表要治的病，
//      故意留在这里当对照组：滚一下，感受卡顿；
//   2. 为什么 DOM 节点数是浏览器瓶颈（见下方核心注释）：
//      节点越多 → 布局/绘制/合成成本越高 → 主线程被占满 → 滚动掉帧；
//   3. 「渲染条数」实时显示：页面顶上那个大数字就是这份数据被渲染成的
//      真实 DOM 行数 —— 100,000，一行没省。对照 VirtualList 里那个两位数，
//      差距就是虚拟化的全部意义。
import { useMemo } from 'react'

// 造 100,000 条数据。useMemo 保证只在挂载时造一次：
// 这是「数据量大」的正确姿势——数据可以大，DOM 不能大。
// 【易错】如果每次渲染都重新生成数组，滚一下就可能触发重渲染，卡上加卡。
function makeRows(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    label: `第 ${i + 1} 行 · 未虚拟化渲染`,
  }))
}

export const ROW_COUNT = 100000

export default function RawList() {
  const rows = useMemo(() => makeRows(ROW_COUNT), [])

  return (
    <div className="card l32-panel">
      <h2>裸渲染（对照组）</h2>
      <p className="hint">
        直接 map 全部数据。这个组件没有任何优化——它就是「病」本身。
      </p>
      <div className="l32-stat">
        <span>实际渲染 DOM 行数</span>
        <strong className="big-number l32-bad">{rows.length.toLocaleString('zh-CN')}</strong>
      </div>

      {/*
        为什么 DOM 节点数是浏览器瓶颈？三层成本都随节点数线性增长：
        1. 布局（Layout/Reflow）：浏览器要为每个节点算几何信息（位置、大小），
           100,000 个节点 = 一棵巨大的渲染树，哪怕只改一行也可能牵动整树；
        2. 绘制（Paint）：每个节点都要光栅化成像素，滚动时可视区变化会触发重绘；
        3. 合成与内存：每个 DOM 节点在 C++ 层都是几百字节起步的对象，
           10 万行 ≈ 上百 MB 内存，滚动时主线程忙不过来，帧率掉到个位数 → 卡顿。
        铁律：屏幕上同时可见的永远只有几十行 —— 那 DOM 里为什么要放 10 万行？
      */}
      <ul className="l32-list" id="l32-raw-list" aria-label="裸渲染 10 万行列表">
        {rows.map((row) => (
          <li key={row.id} className="l32-item">
            {row.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
