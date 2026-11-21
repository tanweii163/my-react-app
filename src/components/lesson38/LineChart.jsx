/**
 * 第 38 课 · 手写 SVG 数据可视化 —— 折线图（LineChart）
 *
 * 本文件教什么：
 * 1. path 的 d 字符串拼接：`M x0 y0 L x1 y1 L x2 y2 …`（M = 落笔到位，L = 画直线到）。
 *    d 只是普通字符串——SVG 里没有"线段组件"，模板字符串 join 拼好交给 <path d> 就有线。
 * 2. 抽稀（decimation）概念：点数多于像素宽度时，一个像素里挤多个点是纯浪费；
 *    教学版按步长取样（stride）；工业级用 Douglas–Peucker / LTTB 等"保形状"算法。
 * 3. hover 最近点 = 比例尺逆函数：屏幕像素 → viewBox 坐标 →（逆比例尺）→ 数据值 → 采样索引。
 *    画图用正向（数据 → 像素），交互用逆向（像素 → 数据）——同一套数学，两个方向。
 */

import { useState } from 'react'
// 比例尺的正逆两个方向都来自纯函数模块 scale.js（单一实现原则）
import { scaleLinear, makeTicks, invertLinear } from './scale.js'

// 抽稀（一句概念）：像素宽度只有几百，点却有几千时，同一个像素里挤多个点纯属浪费——
// 按步长取样把点数压到 ≈ 像素数即可；要"保形状"（保住峰值/拐点）得上 Douglas–Peucker 或 LTTB。
// 本课数据 48 个点 < 420px 绘图宽，函数原样返回；把 length 改成 2000 它才开始干活（会打 log）。
function thin(points, max) {
  if (points.length <= max) return points
  const stride = Math.ceil(points.length / max)
  const out = points.filter((_, i) => i % stride === 0)
  const last = points[points.length - 1]
  if (out[out.length - 1] !== last) out.push(last) // 取样可能丢掉末点，手动补回，保证线画到头
  console.info(`[lesson38] 抽稀生效：${points.length} 个点 → ${out.length} 个（步长 ${stride}）`)
  return out
}

// ── 画布与数据 ───────────────────────────────────────────────
const VIEW_W = 480
const VIEW_H = 280
const M = { top: 24, right: 16, bottom: 32, left: 44 }
const PLOT_W = VIEW_W - M.left - M.right

// 示例数据不在本文件里：页面（Lesson38.jsx）生成同一份数据并同时喂给图和无障碍数据表——
// "图和它的数据表必须同源"，两处各算一遍迟早改岔（教学：props 向下流动）。

export default function LineChart({ samples }) {
  const [hover, setHover] = useState(null)

  // y 数据域从数据推导：min/max 上下各留 2℃ 白边，别让线顶到画布边框。
  // 对比柱状图的固定 [0,100]：温度没有"天然 0 点"，domain 该跟数据走。
  const ys = samples.map((p) => p.v)
  const yDomain = [Math.min(...ys) - 2, Math.max(...ys) + 2]

  const x = scaleLinear([0, samples.length - 1], [M.left, VIEW_W - M.right])
  const y = scaleLinear(yDomain, [VIEW_H - M.bottom, M.top])
  const xInvert = invertLinear([0, samples.length - 1], [M.left, VIEW_W - M.right])
  const visible = thin(samples, PLOT_W)

  // d 字符串拼接：第一个点用 M（落笔），其余用 L（连线）。
  // toFixed(1) 控制小数位——几千个点时字符串体积差好几倍，d 越短解析越快。
  const d = visible
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`)
    .join(' ')

  const onMove = (e) => {
    // 第 1 步：屏幕坐标 → viewBox 逻辑坐标。svg 被 CSS 等比缩放后，
    // getBoundingClientRect 给的是"显示尺寸"，viewBox 是"逻辑尺寸"，
    // 两者相差一个缩放系数——按比例除回去即可。
    // 【呼应】这就是 viewBox 响应式的代价：逻辑坐标与屏幕坐标从此是两套，交互必须换算。
    const box = e.currentTarget.getBoundingClientRect()
    const svgX = ((e.clientX - box.left) / box.width) * VIEW_W
    // 第 2 步：viewBox 像素 →（逆 x 比例尺）→ 分数索引 → 四舍五入到最近采样点。
    // 均匀采样的时间轴上，"最近点"就是四舍五入后的索引——这就是最近点定位的全部数学。
    const idx = Math.round(xInvert(svgX))
    setHover(Math.max(0, Math.min(samples.length - 1, idx))) // 夹进合法范围（clamp）
  }

  const hovered = hover === null ? null : samples[hover]
  // tooltip 靠右时会出画布：点在右半边时把提示框翻到指针左侧
  const tip =
    hovered === null
      ? null
      : (() => {
          const text = `第 ${hovered.i + 1} 次采样 ${hovered.v} ℃`
          const boxW = text.length * 12 + 16
          const cx = x(hovered.i)
          const flip = cx > VIEW_W - boxW - 24
          const bx = flip ? cx - boxW - 12 : cx + 12
          const by = Math.max(4, y(hovered.v) - 34)
          return { text, boxW, bx, by }
        })()

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width="100%"
      className="l38-svg l38-line-chart"
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      {/* 水平参考线：刻度同样来自比例尺，y 域是从数据推导的 */}
      {makeTicks(yDomain, 5).map((t) => (
        <g key={t}>
          <line x1={M.left} x2={VIEW_W - M.right} y1={y(t)} y2={y(t)} className="l38-grid" />
          <text x={M.left - 6} y={y(t) + 4} textAnchor="end" className="l38-tick">
            {t}
          </text>
        </g>
      ))}

      {/* 一条 path 画完全部 48 个点——这就是"为什么不用 div 拼折线"的答案 */}
      <path d={d} className="l38-line" />

      {/* hover 十字线 + 圆点：SVG 后画的元素盖在先画的上面，顺序即层级 */}
      {hovered && (
        <line
          x1={x(hovered.i)}
          x2={x(hovered.i)}
          y1={M.top}
          y2={VIEW_H - M.bottom}
          className="l38-crosshair"
        />
      )}
      {hovered && <circle cx={x(hovered.i)} cy={y(hovered.v)} r="4" className="l38-dot" />}

      {tip && (
        <g className="l38-tip">
          <rect x={tip.bx} y={tip.by} width={tip.boxW} height={24} rx="4" className="l38-tip-box" />
          <text
            x={tip.bx + tip.boxW / 2}
            y={tip.by + 16}
            textAnchor="middle"
            className="l38-tip-text"
          >
            {tip.text}
          </text>
        </g>
      )}
    </svg>
  )
}
