/**
 * 第 38 课 · 手写 SVG 数据可视化 —— 环形图（DonutChart）
 *
 * 本文件教什么：
 * 1. 用"粗描边的圆"画环形图：不算角度、不写 path 的弧线命令（A），
 *    扇区 = 圆的一段弧长，用 strokeDasharray / strokeDashoffset 裁出来。
 *    周长公式 C = 2πr（半径 r 的圆转一圈的长度）——本图全部数学就这一行。
 * 2. 裁弧的机制：
 *    dasharray = `${弧长} ${C}` → 先画"弧长"的实线段，再空一整圈 → 只看得见一段；
 *    dashoffset = −前面累计弧长 → 把图案起点沿圆周"前移"，扇区首尾相接不断档。
 *    【易错】offset 是负号：正号会把图案往回挪，扇区会互相叠错位。
 * 3. 图例 + 百分比：percent = value / total × 100。颜色必须配名字——
 *    没有图例的饼图读者只能靠猜。图例放在 role="img" 容器外面，
 *    屏幕阅读器才能读到"颜色 → 文字"的映射（见 ChartA11y.jsx）。
 */

import { useState } from 'react'

// ── 画布几何 ────────────────────────────────────────────────
const SIZE = 240
const CX = SIZE / 2
const CY = SIZE / 2
const STROKE = 36
// 半径 = (画布 − 描边宽) / 2：让粗描边正好贴住画布边，一点不被裁掉
const R = (SIZE - STROKE) / 2
// 周长公式：C = 2πr。π 用 Math.PI，别手写 3.14——精度损失会在最后一段扇区露出缝隙。
const CIRCUMFERENCE = 2 * Math.PI * R

// 固定色板：扇区与图例必须用同一份颜色（单一数据源，避免"图一个色、例一个色"）。
// 不导出：图例组件就在本文件里，模块内共享即可（组件文件只导出组件，Fast Refresh 才不警告）。
const DONUT_COLORS = ['#4f6df5', '#22a06b', '#f0b429', '#e5484d', '#8f7df2']

export default function DonutChart({ data }) {
  const [hover, setHover] = useState(null)

  // 总量与累计弧长：每个扇区的弧长 = value / total × 周长（比例的几何意义就是"占比 × 全长"）。
  // 前缀和 prefix[i] = 前 i 个扇区的值之和——用 reduce 一次算出，
  // 避免"渲染期间改外部变量"（React 渲染要不可变：map 循环里 += 外部变量是 oxlint 会拦的写法）。
  const prefix = data.reduce((sums, d) => [...sums, (sums[sums.length - 1] ?? 0) + d.value], [])
  const total = prefix[prefix.length - 1]
  const slices = data.map((d, i) => {
    const arc = (d.value / total) * CIRCUMFERENCE
    const accBefore = i === 0 ? 0 : prefix[i - 1] // 这个扇区之前，别人已经吃掉多少"数据值"
    const slice = {
      ...d,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
      dasharray: `${arc} ${CIRCUMFERENCE}`, // 画 arc 长、空一圈 → 圆上只显示这一段
      // 【易错】dashoffset 的单位是"路径长度"（像素），不是数据值！
      // 必须把前面累计的数据值按 total/C 换算成弧长，否则扇区会互相叠错位、露出空隙。
      dashoffset: -(accBefore / total) * CIRCUMFERENCE, // 负号：把起点沿圆周前移，接着上一个扇区画
      percent: (d.value / total) * 100,
    }
    return slice
  })

  // 百分比注意：toFixed 四舍五入后各项合计可能 ≠ 100%（如三等分 33.3×3 = 99.9）。
  // 图表库常用"最大余数法"把差额分给余数最大的项；本课从简，先知道这个坑即可。
  const hoveredSlice = hover === null ? null : slices[hover]

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" className="l38-svg">
      {/* rotate(-90)：SVG 角度从 3 点钟方向起算，转 −90° 让第一名从 12 点钟开始（阅读习惯） */}
      <g transform={`rotate(-90 ${CX} ${CY})`}>
        {/* 底环：先画一整圈浅色环，扇区"没盖到"的地方也有轮廓，图不显得残缺 */}
        <circle cx={CX} cy={CY} r={R} fill="none" strokeWidth={STROKE} className="l38-track" />
        {slices.map((s, i) => (
          <circle
            key={s.label}
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth={hover === i ? STROKE + 5 : STROKE} // 悬停的扇区变粗一点，其余不动
            strokeDasharray={s.dasharray}
            strokeDashoffset={s.dashoffset}
            className="l38-slice"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </g>

      {/* 中心文字：默认显示总量；悬停某扇区时显示它的名字 + 占比——图自己会"说话" */}
      <text x={CX} y={CY - 4} textAnchor="middle" className="l38-center">
        {hoveredSlice ? `${hoveredSlice.percent.toFixed(1)}%` : `总计 ${total}`}
      </text>
      <text x={CX} y={CY + 18} textAnchor="middle" className="l38-center-sub">
        {hoveredSlice ? hoveredSlice.label : `${data.length} 类技术栈`}
      </text>
    </svg>
  )
}

// 图例：颜色点 + 名字 + 数值 + 百分比。它是"可见的语义"，必须放在 role="img" 容器外面
// （ChartA11y 的 legend 插槽），否则会被 role="img" 从无障碍树里剪掉。
export function DonutLegend({ data }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  return (
    <ul className="l38-legend">
      {data.map((d, i) => (
        <li key={d.label}>
          <span className="l38-legend-dot" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
          {d.label}
          <span className="l38-legend-num">
            {d.value} 人（{((d.value / total) * 100).toFixed(1)}%）
          </span>
        </li>
      ))}
    </ul>
  )
}
