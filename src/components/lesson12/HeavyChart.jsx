// 本文件教什么：一个"假装很大"的重组件，配合第 12 课的 React.lazy 演示。
//
// 想象它是一个巨大的图表库：真实项目里，图表往往来自 ECharts / Chart.js / D3
// 这类几百 KB 的第三方依赖。如果它被静态 import 进首屏 bundle，
// 每个用户一打开页面就得先下载、解析完它——哪怕他从头到尾没看过这张图。
//
// 本组件故意只用内联 SVG 手画（不真的引入图表库），所以它其实很轻；
// 但在第 12 课里它被 React.lazy 单独拆成了一个 chunk，行为和一个
// 真正的重组件完全一样：点按钮之前，Network 里没有它；首次渲染时才下载。
//
// 铁律：React.lazy 拆分的模块必须 default export（用具名导出也可以，
// 但要在 import() 后面用 .then 手动映射成 default，见 doc/lesson-12.md 练习 2）。

// 模块级 console.log：只在"chunk 被下载并执行"的那一刻打印一次。
// 它是观察代码分割的另一只眼睛——刷新页面后控制台里没有这行，
// 点"加载重组件"、chunk 下载完成后它才出现，与 Network 里的新请求互相印证。
console.log('[HeavyChart] chunk 已下载并执行（只有第一次会看到我）')

// 静态示例数据。组件保持"纯渲染"（第 2 课）：不持有 state、不跑 effect。
// 注意"重组件"的"重"指体积和渲染开销，不代表它需要副作用。
const MONTHLY = [
  { label: '1月', value: 42 },
  { label: '2月', value: 58 },
  { label: '3月', value: 51 },
  { label: '4月', value: 74 },
  { label: '5月', value: 66 },
  { label: '6月', value: 89 },
  { label: '7月', value: 70 },
  { label: '8月', value: 45 },
  { label: '9月', value: 84 },
  { label: '10月', value: 62 },
  { label: '11月', value: 93 },
  { label: '12月', value: 77 },
]

function HeavyChart() {
  return (
    <div>
      {/* viewBox + width="100%"：SVG 按容器宽度等比缩放，坐标写死也自适应。
          柱子是纯 SVG 的 <rect>：x 从左往右排，y = 基线 - 柱高（SVG 的 y 轴朝下）。 */}
      <svg
        viewBox="0 0 384 224"
        width="100%"
        role="img"
        aria-label="月度访问量柱状图（示例数据）"
      >
        <text x="192" y="18" textAnchor="middle" fontSize="12" fontWeight="600" fill="#1f2430">
          月度访问量（示例数据）
        </text>
        {/* 基线：一条横线，柱子都"站"在它上面 */}
        <line x1="12" y1="196" x2="372" y2="196" stroke="#dfe3ec" />
        {MONTHLY.map((m, i) => {
          const barHeight = Math.round((m.value / 100) * 150)
          const x = 20 + i * 29 // 每根柱子占 29px：22px 柱宽 + 7px 间距
          const y = 196 - barHeight
          return (
            <g key={m.label}>
              <rect
                className="bar"
                x={x}
                y={y}
                width={22}
                height={barHeight}
                rx="3"
                fill="#4f6df5"
              />
              <text x={x + 11} y={y - 5} textAnchor="middle" fontSize="9" fill="#6b7280">
                {m.value}
              </text>
              <text x={x + 11} y={210} textAnchor="middle" fontSize="10" fill="#6b7280">
                {m.label}
              </text>
            </g>
          )
        })}
      </svg>
      <p className="hint">
        内联 SVG 手画的柱状图。请把它想象成一个 500KB 的图表库——第 12 课关心的是
        "它什么时候被下载"，而不是它长什么样。
      </p>
    </div>
  )
}

export default HeavyChart
