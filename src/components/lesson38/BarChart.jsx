/**
 * 第 38 课 · 手写 SVG 数据可视化 —— 柱状图（BarChart）
 *
 * 本文件教什么：
 * 1. 线性比例尺（linear scale）的"使用侧"：把"数据域 domain"等比映射到"像素域 range"。
 *    数学推导与实现拆在 ./scale.js（纯函数模块，柱状图/折线图共用一份实现）——
 *    【铁律】图表里所有"数据 → 像素"的换算必须走比例尺，禁止手写魔法数字。
 * 2. 坐标轴与刻度：用"nice numbers"算法（1/2/5×10ⁿ 步长）生成好看且不重叠的整数刻度，
 *    再用比例尺换算成像素画网格线 + 文本。
 * 3. 柱间 hover 显示数值：onMouseEnter/Leave 只记"悬停第几根柱"，据此自绘 tooltip。
 *    （零 JS 的替代品是 <rect><title>…</title></rect>：原生 tooltip，但样式与延迟不可控，
 *    教学版选择自绘——顺便演示"SVG 里没有绝对定位，坐标就是定位"。）
 * 4. 动画（可选）：SVG2 把 rect 的 x/y/width/height 定义成"几何 CSS 属性"，
 *    所以 CSS transition 直接对它们生效——数据一变，柱子平滑"长"到新高度而非瞬间跳变。
 */

import { useState } from 'react'
// 比例尺只有一套数学，不该有两份实现——从纯函数模块导入（单一实现原则）
import { scaleLinear, makeTicks } from './scale.js'

// 画布尺寸用 viewBox 逻辑坐标写死（响应式原理：坐标只写一份，缩放交给 CSS）
const VIEW_W = 480
const VIEW_H = 280
// 四边留白：轴文字、tooltip 都画在留白里，避免被画布边缘裁掉
const M = { top: 28, right: 16, bottom: 36, left: 44 }
// 数据域写死 [0, 100]（万元）：domain 应来自业务语义而不是"本组数据的最大值"——
// 若每次都用最大值封顶，最高柱永远顶格，组与组之间就失去可比性（易错点，doc 里有展开）。
const Y_DOMAIN = [0, 100]
const Y_TICKS = makeTicks(Y_DOMAIN, 6) // → 0, 20, 40, 60, 80, 100

export default function BarChart({ data }) {
  // 悬停态只存"第几根柱"（null = 没悬停）。【易错】不要把整个数据拷进 state——
  // UI 状态要最小化，能从 props + 一个下标推导出来的，就不该存第二份。
  const [hover, setHover] = useState(null)

  // y 比例尺：数据域 [0,100] → 像素域 [绘图区底边, 绘图区顶边]（注意 y 轴朝下，所以底边在前）
  const y = scaleLinear(Y_DOMAIN, [VIEW_H - M.bottom, M.top])
  const plotW = VIEW_W - M.left - M.right
  // x 方向：每根柱占一个"带"（band），柱子只占带的 60%——间距是算出来的，不是猜的
  const band = plotW / data.length
  const barW = band * 0.6

  // 自绘 tooltip 的位置：跟着悬停柱走，并夹在画布内（clamp），不被边缘裁掉
  const tip =
    hover === null
      ? null
      : (() => {
          const d = data[hover]
          const text = `${d.label} ${d.value} 万元`
          const boxW = text.length * 12 + 16 // 中文≈12px/字（font-size 12 的粗略估宽，教学从简）
          const cx = M.left + hover * band + band / 2
          const x = Math.max(4, Math.min(cx - boxW / 2, VIEW_W - boxW - 4))
          const yy = Math.max(4, y(d.value) - 36) // 悬浮在柱顶上方；柱子太高就贴顶显示
          return { text, boxW, x, y: yy }
        })()

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width="100%" className="l38-svg">
      {/* 刻度网格：一条横线 + 左侧数字。刻度也走同一个比例尺——轴就是"比例尺的可视化" */}
      {Y_TICKS.map((t) => (
        <g key={t}>
          <line x1={M.left} x2={VIEW_W - M.right} y1={y(t)} y2={y(t)} className="l38-grid" />
          <text x={M.left - 6} y={y(t) + 4} textAnchor="end" className="l38-tick">
            {t}
          </text>
        </g>
      ))}

      {/* 柱体：y/height 全由比例尺换算。h = y(0) − y(value)：y 轴朝下，高度是两个 y 相减 */}
      {data.map((d, i) => (
        <rect
          key={d.label}
          className="l38-bar"
          x={M.left + i * band + band * 0.2}
          y={y(d.value)}
          width={barW}
          height={y(0) - y(d.value)}
          rx="3"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
        />
      ))}

      {/* X 轴基线 + 月份标签：基线就是刻度 t=0 那条线加粗 */}
      <line x1={M.left} x2={VIEW_W - M.right} y1={y(0)} y2={y(0)} className="l38-axis" />
      {data.map((d, i) => (
        <text
          key={d.label}
          x={M.left + i * band + band / 2}
          y={VIEW_H - M.bottom + 18}
          textAnchor="middle"
          className="l38-tick"
        >
          {d.label}
        </text>
      ))}

      {/* 自绘 tooltip：悬停第 i 根柱时渲染一个 <g>（深色圆角矩形 + 白字）。
          SVG 没有"absolute 定位"，直接用坐标画在悬停柱上方即可。 */}
      {tip && (
        <g className="l38-tip">
          <rect x={tip.x} y={tip.y} width={tip.boxW} height={24} rx="4" className="l38-tip-box" />
          <text x={tip.x + tip.boxW / 2} y={tip.y + 16} textAnchor="middle" className="l38-tip-text">
            {tip.text}
          </text>
        </g>
      )}
    </svg>
  )
}
